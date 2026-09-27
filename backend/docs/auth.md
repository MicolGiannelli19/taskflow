# Authentication

Taskflow delegates authentication to [Clerk](https://clerk.com). Clerk owns
sign-up, sign-in, passwords, sessions and profile management; this API owns
*identity* — the `users` row that boards, tickets and comments are keyed on.

The `user_identities` table is the join between the two, using the
`(provider, provider_id)` pair it was designed around:
`provider='clerk'`, `provider_id=<clerk user id>`.

---

## Overview

```
Browser                       Backend                        Clerk
  |                              |                             |
  |  <SignIn /> (Clerk component)|                             |
  | -------------------------------------------------------->  |
  |  session token (JWT, RS256)  |                             |
  | <--------------------------------------------------------  |
  |                              |                             |
  |  GET /api/boards             |                             |
  |  Authorization: Bearer <token>                              |
  | ---------------------------> |                             |
  |                              |  1. authenticate_request()   |
  |                              |     verifies signature, exp, |
  |                              |     and the `azp` claim      |
  |                              | --------------------------->  |
  |                              |     (JWKS, fetched + cached) |
  |                              |  2. `sub` = Clerk user id    |
  |                              |  3. user_identities lookup   |
  |                              |     → local users.id         |
  |                              |  4. Handle request           |
  |  { boards }                  |                             |
  | <--------------------------- |                             |
```

Step 3 is the important one: `sub` is a Clerk ID like `user_2abc…`, never a
TaskFlow UUID. Everything in the schema references `users.id`, so the Clerk ID
is exchanged for the local record on every request.

---

## Files

| File | Responsibility |
|---|---|
| `app/clerk.py` | Lazily-built Clerk Backend API client |
| `app/dependencies.py` | `get_current_user` — verifies the token, protects routes |
| `app/services/identity_service.py` | Clerk user → TaskFlow `User`, provisioning on first sight |
| `app/routers/auth.py` | `GET /api/auth/me` — the only auth endpoint left |
| `app/auth_utils.py` | bcrypt hashing, used solely by the seed's Clerk import |
| `app/routers/webhook.py` | `POST /api/webhooks/clerk` — signature-verified profile sync |
| `app/security_headers.py` | CSP and friends on API responses |
| `frontend/csp.ts` | CSP for the app page (the one that matters for XSS) |

---

## Protecting Routes

Unchanged from before the migration — every protected route still declares the
same dependency, and board-scoped routes still layer `require_board_role` on
top of it:

```python
@router.get("/api/boards")
def get_boards(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ...
```

`get_current_user` in `dependencies.py`:

1. Hands the request to `clerk.authenticate_request()`, which verifies the
   token's RS256 signature against Clerk's JWKS, checks expiry, and checks the
   `azp` claim against `clerk_authorized_parties`
2. Reads the `sub` claim — the Clerk user ID
3. Resolves it to a local `User` via `IdentityService`

Missing, expired, or invalid tokens produce `401 Unauthorized`.

It is a plain `def`, not `async def`, on purpose: `authenticate_request` does
blocking I/O, so FastAPI runs it in its threadpool rather than on the event
loop.

### Why `azp` matters

`authorized_parties` is what stops a token minted for a *different* Clerk
application being replayed against this API.

It comes from `CLERK_AUTHORIZED_PARTIES` (comma-separated), defaulting to
`http://localhost:5173`. Set it to the production frontend origin when you
deploy — deploying without it rejects every real token, and setting it to `*`
or removing it throws the replay protection away. Neither of those is a fix.

Note that this is the one part of the auth path the test suite does **not**
cover: tests override `get_current_user`, so a wrong value here would not fail
`pytest`. It has to be checked against a running deployment.

---

## Provisioning: first sight of an account

`IdentityService.resolve()` runs on every authenticated request, but only
touches the network the first time it sees a Clerk account:

1. **Fast path** — one indexed lookup on `user_identities`. Hit → done.
2. **Miss** — fetch the account from the Clerk Backend API for its email, name
   and avatar.
3. **Adopt or create** — if a `users` row already has that email, link to it;
   otherwise create one.
4. Write the `user_identities` row so step 1 hits from then on.

Step 3 is what carries pre-Clerk accounts across the migration. A seeded user
keeps their boards, memberships, assigned tickets and comment history when
they first sign in through Clerk, because the local row is reused rather than
duplicated.

Two simultaneous first requests can race; the unique constraint on
`(provider, provider_id)` decides the winner and the loser re-reads its row.

---

## Seed data

The seed pushes `alice@example.com`, `bob@example.com` and
`carol@example.com` into Clerk with their bcrypt digests, using Clerk's
user-import support (`password_hasher="bcrypt"`). That is why
the `SEED_PASSWORD` from `.env` signs you in through Clerk.

`SEED_PASSWORD` has no default and is never written in the code — the repo is
public, so a committed password is a leaked one. Unset, the seed creates the
local rows but no Clerk accounts. Make it random: Clerk checks sign-in passwords
against known data breaches, and something like `password123` fails with "This
password has been found as part of a breach".

The push is best-effort. Without `CLERK_SECRET_KEY` the local rows are still
created, and the first Clerk account with a matching email adopts one — the
demo board survives either way, only the pre-set passwords depend on the push.

---

## Configuration

| Variable | Where | Purpose |
|---|---|---|
| `CLERK_SECRET_KEY` | backend | Verifies tokens, calls the Backend API. **Never expose to the browser.** |
| `VITE_CLERK_PUBLISHABLE_KEY` | frontend | Public half of the pair; safe in the bundle. |
| `CLERK_WEBHOOK_SIGNING_SECRET` | backend | Verifies webhook deliveries. Without it the webhook refuses everything. |
| `SEED_PASSWORD` | backend | Password the seed gives the demo users in Clerk. No default; never commit it. |
| `CLERK_AUTHORIZED_PARTIES` | backend | Origins allowed to present a token (the `azp` check). Comma-separated. Defaults to `http://localhost:5173`. |
| `CORS_ALLOWED_ORIGINS` | backend | Browser origins allowed to call the API. Comma-separated. Same default. |
| `VITE_CSP_MODE` | frontend | `report` (default) or `enforce` — see "Content-Security-Policy" below. |

Obtain both by running, in `frontend/`:

```bash
npx clerk@latest auth login
npx clerk@latest env pull
```

---

## Frontend

There is no token in `localStorage` any more. Clerk holds the session and mints
short-lived tokens on demand:

- `ClerkProvider` (`src/main.tsx`) wraps the app
- `ClerkTokenBridge` hands Clerk's `getToken` to the axios layer, which can't
  use hooks (`src/api/clerkToken.ts`)
- The axios request interceptor `await`s a fresh token per request
- `useAuth()` (`src/hooks/useAuth.ts`) still returns the **local** user, so
  every `user?.id` comparison against `assignee_id` / `creator_id` /
  `board_members.user_id` keeps working

---

## Token storage

The decision, and why — closing the research spike that sat in
`user-stories/todo.md` from when tokens lived in `localStorage`.

**What is used now.** Nothing of ours. Clerk holds the session in a cookie on
*its* domain, and `getToken()` hands the app a short-lived JWT that lives in a
JavaScript variable for the length of one request. Nothing is written to
`localStorage`, `sessionStorage`, or a cookie this app can read.

**What was rejected, and why:**

| Option | Why not |
|---|---|
| `localStorage` (what TaskFlow did before) | Readable by any script on the page. One XSS and the attacker walks away with a long-lived token they can replay from anywhere, long after the tab is closed. |
| An `HttpOnly` cookie minted by this API | This was the spike's own recommendation, and Clerk already implements it — the session credential is in a cookie no script can read. Building a second one here would mean owning refresh, rotation and CSRF defences that Clerk already owns. |
| A BFF / token-proxy in front of the API | The textbook answer for a browser app that must never see a token. It buys little here: the token is already short-lived and never persisted, and a proxy adds a stateful hop, session storage, and a new thing to operate. Revisit if TaskFlow ever needs to call third-party APIs on the user's behalf. |

**The residual exposure.** An XSS on the page can still call `getToken()` and
use the result — in-memory storage is not a defence against script running in
your own page. What it changes is the **blast radius**: the stolen token expires
in about a minute, cannot be refreshed without the Clerk session cookie, and
does not survive the tab being closed. Compare that with a `localStorage` token,
which the attacker keeps.

So: **storage bounds the damage from an XSS; the CSP below is what prevents
one.** They are complementary, and neither substitutes for the other.

---

## Content-Security-Policy

Ticket descriptions and comments are user-supplied text rendered as markdown to
*other* board members. `react-markdown` escapes raw HTML and `rehype-raw` is not
installed, so no injection lands today — but that safety rests entirely on one
library default. The CSP is the layer behind it.

### Two policies, because there are two kinds of response

A CSP arrives with the *document*. That decides where each policy lives:

| What | Where it is set | Why there |
|---|---|---|
| The app page (and the markdown it renders) | `frontend/csp.ts`, applied by `frontend/vite.config.ts` | Vite serves `index.html` in development; a static host serves it in production. The API never does. |
| API responses | `backend/app/security_headers.py` | JSON that should load nothing: `default-src 'none'`. |
| `/docs` and `/redoc` | same file, looser policy | Real HTML pages served by FastAPI; Swagger UI and ReDoc load from jsDelivr and bootstrap with an inline script. |

This answers the open question in the spec (§12.3): the backend middleware is
*not* the home of the page policy, and a policy set there would not have
protected the markdown renderer at all.

### Why each host is in the page policy

| Directive | Host | Why |
|---|---|---|
| `script-src`, `connect-src` | your Clerk Frontend API (e.g. `https://<slug>.clerk.accounts.dev`) | `clerk-js` is loaded from it, and the browser calls it directly for session management. Derived from the publishable key rather than wildcarded — see `frontendApiHost()`. |
| `script-src`, `frame-src`, `connect-src` | `https://*.protect.clerk.com`, `https://challenges.cloudflare.com` | Clerk's bot/abuse protection, included for every application regardless of plan. The `:*` on the `connect-src` entry is required: those hosts use non-443 ports. |
| `img-src` | `https://img.clerk.com` | User avatars. |
| `worker-src` | `blob:` | Clerk runs session management in a worker. |
| `style-src` | `'unsafe-inline'` | Clerk's components style themselves at runtime (CSS-in-JS). A style cannot exfiltrate a token, so this is a much smaller concession than an inline script would be. |
| `style-src`, `font-src` | `fonts.googleapis.com`, `fonts.gstatic.com` | The DM Sans / Fraunces link in `index.html`. |
| `connect-src` | `http://localhost:8000` (or `VITE_API_URL`) | This API. |
| `script-src` | `'unsafe-inline'` — **development only** | Vite's React plugin injects an inline module preamble. Production builds do not get this. |

### Verifying it — the step still outstanding

The hosts above come from Clerk's CSP documentation, **not** from watching a
real sign-in, because this checkout has no Clerk keys. Before switching to
enforcing, do the report-only pass:

1. `npx clerk@latest auth login && npx clerk@latest env pull` in `frontend/`
2. `yarn dev` — the dev server sends `Content-Security-Policy-Report-Only` by
   default, so a wrong directive reports instead of breaking sign-in
3. Exercise **sign-in, sign-up, profile, a board, and a ticket with markdown in
   its description**. Watch the browser console: every violation names the
   blocked URL and the directive that blocked it
4. Add the hosts the violations name to `frontend/csp.ts`. **Never widen a
   directive to `*` to make an error go away**
5. When the console is clean, run with `VITE_CSP_MODE=enforce` and repeat
6. Paste `<script>alert(1)</script>` into a ticket description and confirm the
   console blocks it rather than running it

Two things the browser will likely add that are expected: `clerk-telemetry.com`
(either allow it in `connect-src`, or turn it off with
`telemetry={{ disabled: true }}` on `<ClerkProvider>`), and — if you use social
sign-in — the provider's own domain.

### Production

- The `<meta>` CSP is baked into the built `index.html`, so a deployed app is
  never left with no policy at all. But `frame-ancestors` is **ignored** in
  `<meta>` form: the static host or CDN must also send the policy as a real
  header for clickjacking protection.
- Moving to a production Clerk instance changes the Frontend API host (to a
  subdomain of your own domain). The policy follows the publishable key
  automatically, but re-run the report-only pass after the switch.
- `/docs` and `/redoc` are developer tooling. The cleaner production posture is
  to disable them (`FastAPI(docs_url=None, redoc_url=None)`) rather than to
  carry their looser policy into production.

---

## The `user.updated` webhook

`POST /api/webhooks/clerk` keeps the local profile copy fresh. Without it, a
user who renames themselves in `<UserProfile />` sees the change immediately
(their own profile reads from Clerk) while every other member keeps seeing the
old name on tickets, comments and the member list.

**This route is unlike every other one in the app:**

- It is **public** and does not use `get_current_user` — Clerk is not a
  signed-in user and sends no session token.
- Its authentication **is the signature on the body**. Clerk signs deliveries
  via Svix (`svix-id`, `svix-timestamp`, `svix-signature`), and
  `CLERK_WEBHOOK_SIGNING_SECRET` verifies them. Without that check this would be
  an open write endpoint onto the `users` table: anyone who learned the URL
  could rename anyone.
- With no signing secret configured it returns **503 and writes nothing**. Fail
  closed: unconfigured must never mean unverified.
- The raw body is verified **before** anything parses it, because the signature
  covers the exact bytes.

| Event | What happens | Why |
|---|---|---|
| `user.updated` | Overwrite `name` and `avatar` on the linked row | The user just changed them in Clerk, so Clerk wins. An empty incoming value is ignored rather than blanking the local one. |
| `user.deleted` | Delete the `user_identities` row **only** | Deleting the `users` row would cascade through `tickets.creator_id` and `comments.user_id` and erase their contributions from boards other people still use. Removing the link ends all access while authorship survives (spec §12, question 1). |
| `user.created` | Ignored | `IdentityService` already provisions lazily on the account's first authenticated request. Handling it here would add a second row-creating path for no real gain (spec §12, question 2). |
| everything else | Acknowledged with 204 | A non-2xx would put Clerk into a retry loop over an event we will never act on. |

**Idempotency.** Deliveries are at-least-once, so the same event can arrive
twice. Both handlers write absolute state rather than a delta — the update
writes the payload's own name and avatar, and unlinking something already
unlinked is a no-op — so a replay leaves the same result. No de-duplication
table is needed; if one ever is, `svix-id` is the key to use.

**Email is not synced.** `users.email` is unique and is the key `_provision`
adopts rows by, so writing it from an event risks colliding with another row.
Changing a primary email in Clerk therefore still leaves the local address
stale.

### Testing it locally

A webhook needs a public URL. The Clerk CLI tunnels one:

```bash
clerk webhooks listen --token "$(clerk webhooks token)" \
  --forward-to http://localhost:8000/api/webhooks/clerk
```

Add the relay URL it prints as an endpoint in the Clerk Dashboard — events do
not flow until you do — then copy that endpoint's signing secret into
`CLERK_WEBHOOK_SIGNING_SECRET`. Rename yourself in the app and watch the row
change.

---

## Limitations (current MVP)

- ~~**Profile drift**~~ — fixed by the `user.updated` webhook above, *once the
  endpoint is registered in the Clerk Dashboard and the signing secret is set*.
  Until then the old behaviour stands: the local copy refreshes only on the
  owner's next sign-in.
- **Email drift** — the webhook syncs name and avatar but not email; see above.
- **The page CSP is report-only** — the directives have not been verified
  against a live Clerk instance yet. See "Verifying it" above.
- **No organizations** — boards have their own `board_members` roles. Clerk
  Organizations would be the way to add real multi-tenancy.
- **Unclaimed application** — until someone runs `npx clerk auth login` and
  claims it, the app is development-only and not production-ready.
