# Spec: Clerk Integration — Remaining Work

**Status:** 🟢 §4, §5 (backend), §7, §8, §9 implemented · 🟡 §5 page policy awaits
browser verification · ⚪ §6 deferred to deployment
**Author:** Micol
**Last updated:** 2026-09-19

> The `clerk-auth` branch replaced TaskFlow's hand-rolled password + JWT auth
> with Clerk. The happy path works: sign-in, sign-up, profile, session tokens,
> and identity mapping onto the local `users` table.
>
> What it does **not** yet have is the surrounding work that turns a working
> integration into a safe one — a way to test protected routes, a
> Content-Security-Policy behind the markdown renderer, production values for
> the `azp` check, and a webhook to stop profile data going stale. This spec
> enumerates those steps.
>
> Each step is independent and can land on its own branch. See §10 for
> suggested ordering.

---

## 0. Implementation status (2026-09-19)

| Step | State | Notes |
|---|---|---|
| §4 Tests | ✅ Done | 80 tests. No Clerk key, no database, no network — a test that opens a socket fails deliberately. |
| §5 CSP — API responses | ✅ Done, enforcing | `default-src 'none'` on API JSON; a looser policy on `/docs`, verified against a live Swagger UI. |
| §5 CSP — app page | 🟡 Report-only | Written (`frontend/csp.ts`) and delivered by Vite, but the Clerk hosts come from Clerk's documentation, **not** from watching a real sign-in: this checkout has no Clerk keys. §5.4 steps 2–3 are outstanding. |
| §6 Production | ⚪ Deferred | §6.1 done — `azp` and CORS now come from the environment. §6.2 is dashboard/DNS work; checklist in `docs/backend/auth.md`. |
| §7 Webhook | ✅ Done | `POST /api/webhooks/clerk`, Svix-verified, idempotent. Needs a Dashboard endpoint + signing secret to actually fire. |
| §8 Token storage | ✅ Done | Recorded in `docs/backend/auth.md`; spike closed in `user-stories/todo.md`. |
| §9 Stale docs | ✅ Done | All four items corrected. |

Two things turned up that were not in this spec:

1. **The page CSP could not have lived in the backend middleware** as §5.2 drafts
   it. A CSP arrives with the *document*, and FastAPI does not serve the app's
   HTML — Vite does in development, a static host does in production. The policy
   is split accordingly, which answers §12.3: see `docs/backend/auth.md`.
2. **`requirements.txt` was missing a bcrypt backend.** `passlib` was pinned
   without one, so `seed()` raised `MissingBackendError` and the app failed to
   start against a fresh database. Fixed by pinning `bcrypt==4.0.1` (passlib
   1.7.4 cannot read 4.1+ or 5.x). Unrelated to Clerk, but it blocked every
   attempt to run the thing.

---

## 1. Goals

1. Make every `Depends(get_current_user)` route **testable** without a live
   Clerk instance or a real token.
2. Close the one genuine security gap introduced by rendering user-supplied
   markdown with no **Content-Security-Policy**.
3. Make the integration **deployable** — the `azp` allowlist and the Clerk
   application itself are both development-only today.
4. Stop **profile drift**: Clerk owns name and avatar, but other users see a
   stale local copy until the owner next signs in.
5. Record the token-storage **decision and its rationale**, closing the
   outstanding research spike in `user-stories/todo.md`.

## 2. Non-goals

- **Clerk Organizations.** Board access stays on `board_members` (see
  `authorization-data-model.md`). Revisit only if TaskFlow needs real
  multi-tenancy.
- **Replacing the seed's Clerk push.** It is best-effort by design and documented
  in `docs/backend/auth.md`; without a secret key the local rows still exist and
  the first matching Clerk account adopts one.
- **Removing `app/auth_utils.py`.** bcrypt hashing is still used by the seed's
  Clerk user-import. It is off the request path and correctly documented.
- **Testing Clerk itself.** Signature verification, JWKS caching and rotation are
  Clerk's responsibility, exercised by their SDK's own tests. §4 deliberately
  stubs them out; §4.4 notes the residual gap.
- **A BFF / token-proxy architecture.** Considered and rejected in §8 — the
  current in-memory + provider-owned-session model is appropriate at this scale.

---

## 3. Current state

| Fact | Source |
|---|---|
| Token verification is fully offline after boot | `app/dependencies.py:37` — `authenticate_request` verifies against cached JWKS |
| Clerk is called only on first sight of an account | `app/services/identity_service.py:76` — `clerk.users.get()`, then `user_identities` caches the mapping |
| `authorized_parties` allows localhost only | `app/config.py:11` — `["http://localhost:5173"]` |
| The backend test suite has **one** test | `backend/tests/test_api.py` — `test_read_root`, hits `/` |
| No CSP header is set anywhere | No middleware in `app/main.py`; nothing in `frontend/index.html` |
| User-supplied markdown is rendered | `frontend/src/pages/Board/TicketDetailContent.tsx:2` — `react-markdown`, no `rehype-raw` (safe config) |
| No webhook endpoint exists | No route matches `/webhook` in `app/routers/` |
| Profile drift is a known limitation | `docs/backend/auth.md` → "Limitations (current MVP)" |
| `CLAUDE.md` references a test file that does not exist | `pytest tests/test_auth.py` — deleted with the password auth |

---

## 4. Step 1 — Test strategy for authenticated routes

**Priority: High.** Blocks every other test-writing effort, including the
authorization test push that `board-event-log.md` depends on.

### 4.1 Problem

Every protected route declares `Depends(get_current_user)`, which now calls
Clerk. Tests cannot mint a valid Clerk token, so the entire authorization
layer — `require_board_role`, the 404-not-403 rule, role hierarchy — is
untested. The pre-Clerk approach (call `create_access_token()` and send it) no
longer exists.

### 4.2 Approach — FastAPI dependency overrides

`get_current_user` is a dependency, so it can be swapped at the app level.
Tests then run with a known `User` and Clerk is never involved.

```python
# backend/tests/conftest.py
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import User, get_db
from app.dependencies import get_current_user


@pytest.fixture
def client(db_session):
    """Unauthenticated client — every protected route should 401."""
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def as_user(db_session):
    """Authenticated client factory: `as_user(alice).get("/api/boards")`."""
    def _as(user: User) -> TestClient:
        app.dependency_overrides[get_db] = lambda: db_session
        app.dependency_overrides[get_current_user] = lambda: user
        return TestClient(app)
    yield _as
    app.dependency_overrides.clear()
```

This is the standard FastAPI pattern and keeps the tests fast — no network, no
JWKS fetch, no Clerk secret required in CI.

### 4.3 Work

- [x] Add `backend/tests/conftest.py` with the fixtures above
- [x] ~~Add a transactional `db_session` fixture (roll back per test)~~ — **built
      a fresh in-memory database per test instead.** Same guarantee (no shared
      state), without the pysqlite savepoint workarounds a rollback fixture needs
      on SQLite. Costs about 4 ms per test.
- [x] Add user factory fixtures — `owner`, `admin`, `member`, `viewer`, `outsider`,
      plus `board` / `column` / `ticket` built through the real services
- [x] `test_auth.py` — and one level deeper than planned: the `unauthenticated`
      fixture stubs the Clerk *client* rather than overriding `get_current_user`,
      so the dependency's own 401 branches are real code
- [x] `test_authorization.py` — the matrix, parametrised across eight routes
- [x] `test_identity.py` — including the race, which is **not** mocked: the fake
      Clerk client provisions a competing row during its `users.get()` call, so
      the `IntegrityError` is the real unique constraint firing
- [x] Update `CLAUDE.md`

Also added, beyond the plan:

- [x] `test_webhook.py` and `test_security_headers.py` (§7 and §5)
- [x] Two model changes so the schema builds on SQLite: the dialect-agnostic
      `Uuid` type (Postgres DDL byte-identical, verified with a mock-engine
      dump) and `sqlite_where` alongside `postgresql_where` on the
      one-owner-per-board partial index — without which SQLAlchemy silently
      drops the WHERE clause and the index becomes "one member per board"

### 4.4 Known gap

Overriding `get_current_user` means **the token-verification path itself is
never exercised** — `authenticate_request`, the `azp` check, and the `sub`
extraction are all skipped. That is the correct trade for unit tests (we are
testing our authorization, not Clerk's authentication), but it means a
misconfigured `authorized_parties` would not be caught by the suite. Accept for
now; note it in the test file so the gap is visible rather than assumed covered.

### 4.5 Acceptance criteria

- [x] `pytest` passes with no `CLERK_SECRET_KEY` set in the environment
- [x] A non-member requesting a board receives 404, asserted by a test
      (`test_non_member_gets_404_not_403`, across eight routes)
- [x] A viewer attempting a write receives 403, asserted by a test
- [x] Tests do not make network calls — **enforced, not just verified**: the
      `no_network` fixture refuses every outbound connection for the whole run,
      so a future test that reaches for Clerk fails instead of passing quietly

---

## 5. Step 2 — Content-Security-Policy

**Priority: High.** The only outstanding item that is a live security gap
rather than hardening.

### 5.1 Problem

Ticket descriptions and comments are user-supplied text rendered as markdown to
*other* board members. The current configuration is safe — `react-markdown`
escapes raw HTML and `rehype-raw` is not installed — but that safety rests
entirely on one library default with nothing behind it. A CSP is the second
layer: it stops an injected script from executing or exfiltrating even if an
injection lands.

Because tokens are held in memory (§8), an XSS is already bounded to the page
session. CSP narrows it further.

### 5.2 Approach

A response-header middleware in `app/main.py`. Directives must allowlist Clerk's
domains — Clerk loads `clerk-js` at runtime and calls its Frontend API from the
browser.

```python
# backend/app/main.py  — DRAFT, domains must be verified (see 5.3)
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = "; ".join([
        "default-src 'self'",
        "script-src 'self' https://*.clerk.accounts.dev",
        "connect-src 'self' http://localhost:8000 https://*.clerk.accounts.dev",
        "img-src 'self' data: https://img.clerk.com",
        "worker-src 'self' blob:",
        "style-src 'self' 'unsafe-inline'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
    ])
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response
```

`frame-ancestors 'none'` also gives clickjacking protection.

### 5.3 The domains must be verified, not assumed

The list above is a starting point, **not a verified configuration**. Clerk
serves `clerk-js` and its Frontend API from instance-specific hosts, and these
differ between development (`*.clerk.accounts.dev`) and production (a subdomain
of your own domain). Avatar and worker origins vary too.

Verify empirically: apply the policy, open the app, exercise sign-in / sign-out /
profile / a board, and read the browser console. Every CSP violation names the
blocked URL and the directive that blocked it. Add hosts until clean — do not
widen to `*` to make errors go away.

Consider `Content-Security-Policy-Report-Only` first, so a wrong directive
reports instead of breaking sign-in.

### 5.4 Work

- [x] Add the middleware — **split in two**, see the note below: the API policy
      (`app/security_headers.py`) is enforcing already, since JSON responses
      load nothing and there is nothing to break; the page policy
      (`frontend/csp.ts`) ships report-only
- [ ] **Outstanding.** Exercise every auth flow; collect violations from the
      console. Needs Clerk keys, which this checkout does not have — run
      `npx clerk@latest env pull` first. Procedure in `docs/backend/auth.md`
- [ ] **Outstanding.** Narrow the policy to the observed hosts; switch to
      enforcing (`VITE_CSP_MODE=enforce`)
- [x] Document the final directives and *why each host is needed* in
      `docs/backend/auth.md` — one table, one row per host
- [x] Add a note that the policy needs revisiting when moving to a production
      Clerk domain. The Frontend API host is now *derived from the publishable
      key* rather than wildcarded, so it follows the key automatically — but the
      report-only pass still has to be repeated

> **Correction to §5.2.** The draft middleware allowlists Clerk's domains on
> *API* responses, where they do nothing. A CSP is delivered with the document,
> and this API never serves the app's HTML — Vite does in development, a static
> host does in production. A policy set only in FastAPI would not have protected
> the markdown renderer at all, which is the thing §5.1 is about. So: the API
> gets `default-src 'none'`, the page gets the Clerk allowlist, and `/docs` gets
> its own. This also answers §12.3.

### 5.5 Acceptance criteria

- [ ] **Outstanding** (needs Clerk keys). Sign-in, sign-up, profile, board view
      and ticket detail all work with CSP enforcing
- [x] `frame-ancestors 'none'` present; asserted by `test_nothing_may_frame_this_api`
      and set on the page policy too
- [x] No `unsafe-eval`; no `*` wildcard on `script-src` or `connect-src` — both
      asserted by tests, so a future edit that loosens them fails the suite
- [ ] **Outstanding** (needs Clerk keys). An inline `<script>` injected into a
      ticket description does not execute

Verified in the meantime: Swagger UI at `/docs` renders completely under its
enforced policy with zero console violations.

---

## 6. Step 3 — Production readiness

**Priority: High, but only when deploying.** Nothing here affects local work.

### 6.1 `authorized_parties` — the `azp` check

`app/config.py:11` allows `http://localhost:5173` only. Clerk checks a token's
`azp` (authorized party) claim against this list, which is what stops a token
minted for a *different* Clerk application being replayed against this API.

Deploying without updating it rejects every real token. Setting it to `*` or
removing it disables the replay protection entirely — do neither.

- [x] Drive `clerk_authorized_parties` from an environment variable, not a
      literal default — `CLERK_AUTHORIZED_PARTIES`, comma-separated. CORS
      origins moved the same way (`CORS_ALLOWED_ORIGINS`), since §6.2 asked for
      that too and it is the same edit
- [ ] Set the production origin in the deployment environment *(deployment-time)*
- [x] Keep localhost only in the local/dev value — that is the default, so
      local development needs neither variable set

### 6.2 Claim the Clerk application

`docs/backend/auth.md` records the app as unclaimed, which makes it
development-only. A development instance is not production-ready: it has
relaxed cookie handling (the `__clerk_db_jwt` mechanism that works around
third-party cookie blocking) and is not intended to carry real users.

- [ ] Run `npx clerk@latest auth login` and claim the application
- [ ] Create a production instance
- [ ] Point a subdomain (e.g. `clerk.taskflow.example`) at Clerk so the session
      cookie is **first-party** — this is what removes the dev-mode workaround
- [ ] Rotate `CLERK_SECRET_KEY` for production; confirm it is never exposed to the frontend
- [ ] Update CORS in `app/main.py` for the production frontend origin

### 6.3 Acceptance criteria

- [ ] A token from the production frontend authenticates; one from any other origin does not
- [ ] `CLERK_SECRET_KEY` is absent from the frontend bundle (grep the build output)
- [ ] Session persists across a hard refresh on the production domain

---

## 7. Step 4 — `user.updated` webhook

**Priority: Medium.** A correctness bug, visible to users, not a security issue.

### 7.1 Problem

Clerk owns name and avatar. `IdentityService` copies them into the local `users`
row on first sight and then **never updates them** — `_provision` only fills
blanks, deliberately, so a name set in TaskFlow is not clobbered by a Clerk
default.

Consequence: a user changes their name in `<UserProfile />`, sees it update
(their own profile reads from Clerk), and **every other member still sees the
old one** — on tickets, comments and the member list, which all render the local
copy. There is no path that ever refreshes it.

### 7.2 Approach

Clerk emits a `user.updated` event. A webhook endpoint receives it and syncs the
local row.

Security note, since this differs from every other route in the app: the webhook
endpoint is **publicly reachable and must not use `get_current_user`** — Clerk
is not a signed-in user. Its authentication is the **signature on the request
body** (Clerk signs webhooks via Svix: `svix-id`, `svix-timestamp`,
`svix-signature` headers). An endpoint that mutates `users` rows without
verifying that signature is an open write endpoint. Signature verification is
not optional here; it *is* the auth.

The `clerk-webhooks` skill covers the handler patterns.

### 7.3 Work

- [x] Add `POST /api/webhooks/clerk`, excluded from `get_current_user`
- [x] Verify the Svix signature before parsing; reject with 400 on failure.
      **A malformed signature needed catching too** — svix base64-decodes the
      header before comparing, so garbage raised `binascii.Error` and the
      endpoint returned 500 with a stack trace. Caught by a test
- [x] Add `CLERK_WEBHOOK_SIGNING_SECRET` to config and `.env.template` (and to
      `docker-compose.yml`). Unset ⇒ 503 and no write: unconfigured must never
      mean unverified
- [x] Handle `user.updated` → update `name` / `avatar` on the linked `users` row.
      An empty incoming value is ignored rather than blanking the local one
- [x] Decide and document the behaviour for `user.deleted` — see §12.1 below
- [x] Make the handler idempotent — both branches write absolute state rather
      than a delta, so a replay is a no-op. Asserted by two tests
- [x] Return 2xx quickly; Clerk retries on non-2xx. Unhandled event types get
      204 rather than an error, so Clerk does not retry them forever
- [ ] **Outstanding** (needs a Clerk instance). Local testing needs a public URL —
      command and Dashboard steps are in `docs/backend/auth.md`

### 7.4 Acceptance criteria

- [~] Changing a name in `<UserProfile />` updates the local row without
      re-signing-in — asserted against a synthetic `user.updated` delivery; the
      end-to-end path through Clerk needs a registered endpoint
- [x] Another member sees the new name on a ticket after a refetch —
      `test_the_new_name_is_what_other_members_see` walks the whole path: comment,
      rename, re-read as a different member
- [x] A request with an invalid signature is rejected and writes nothing — four
      tests: wrong signature, wrong secret, tampered body, no signature at all
- [x] Replaying the same event twice leaves the same final state

---

## 8. Step 5 — Document the token-storage decision

**Priority: Low.** Closes an open spike; no code.

`user-stories/todo.md` carries **"SPIKE: Research production-grade token storage
options"**, written when tokens lived in `localStorage`. Two of its three
acceptance criteria are now met by other means: the threat models are understood,
and the recommended hybrid (refresh credential in an `HttpOnly` cookie, access
token in memory) is what Clerk implements — the session cookie lives on Clerk's
domain and `getToken()` holds short-lived JWTs in memory. The httpOnly-login
proof-of-concept in FastAPI is moot; that code will never be written.

The third criterion is genuinely outstanding: *"Decision documented in
`docs/backend/auth.md` with rationale."*

- [x] Add a "Token storage" section to `docs/backend/auth.md`
- [x] State the blast-radius reasoning explicitly
- [x] Mark the spike closed in `user-stories/todo.md`, linking to this spec

---

## 9. Step 6 — Stale documentation

**Priority: Low.** Cheap, and these actively mislead.

- [x] `CLAUDE.md` — React Query claim corrected (and `refetchKey`, which the same
      paragraph described, no longer exists anywhere in `frontend/src`)
- [x] `CLAUDE.md` — `pytest tests/test_auth.py` is true again
- [x] `docs/specs/spec.md` and `ticket-view-and-edit.md` — verified against the
      code and marked shipped. All nine acceptance criteria are met; each is now
      ticked with the function that implements it. The "plain `<textarea>`"
      non-goal was stale too — `MarkdownEditor` shipped
- [x] `user-stories/todo.md` — the mock-credentials bug is resolved *by deletion*,
      which is worth saying plainly: `handleLogIn` and `LogInForm.tsx` are gone,
      so there is no hand-rolled login path left to send mock values

---

## 10. Suggested ordering

| Order | Step | Why here |
|---|---|---|
| 1 | §4 Tests | Unblocks everything; nothing else should land untested |
| 2 | §5 CSP | The only live security gap |
| 3 | §7 Webhook | User-visible correctness bug |
| 4 | §8, §9 Docs | Cheap; do while the context is fresh |
| 5 | §6 Production | Only when actually deploying |

§4 and §5 are independent and can run in parallel.

---

## 11. Out of scope — tracked elsewhere

Surfaced alongside this work but **not Clerk integration**:

| Item | Where it lives |
|---|---|
| `ON DELETE CASCADE` on `comments.user_id` / `tickets.creator_id` — deleting a user erases their content. Should be `SET NULL` + a "deleted user" placeholder, matching `tickets.assignee_id` | `user-stories/todo.md` → data-model drift. **Now higher priority: comments have shipped, so there is real content to lose** |
| `BoardSummary.owner_id` in `frontend/src/types.ts:14` references a dropped column | same |
| Board event log / board history (`<ComingSoon />` stub) | `docs/specs/board-event-log.md` |
| Drag-and-drop Phase 2 — within-column reordering | `user-stories/todo.md` |
| Split `app/schemas.py` into a package | `user-stories/refactor-backend-schemas-directory.md` |
| Backend debugger setup | `user-stories/todo.md` |
| Finalize the authorization model — including *"can a VIEWER comment?"* | `docs/specs/authorization-data-model.md` (still Draft) |

---

## 12. Open questions

1. **`user.deleted` — what should happen?** ✅ **Decided: the third option** —
   delete the `user_identities` link only; never the `users` row. Implemented
   as `IdentityService.unlink()`.

   It turned out not to depend on the §11 cascade decision after all, which is
   why it could land now: *because* the cascade is still wrong, the safe move is
   to never delete a `users` row from an event handler. Removing the link ends
   all access — nothing can authenticate to that profile again — while the
   person's tickets and comments stay where other members can still read them.
   If §11 later changes the cascade to `SET NULL` + a "deleted user"
   placeholder, revisit: real deletion becomes survivable then.

2. **Should `user.created` be handled too?** ✅ **Decided: no.** `IdentityService`
   provisions lazily on the first authenticated request, so a `user.created`
   handler would buy only "the row exists slightly earlier" in exchange for a
   second code path that can create users — and two paths that both create rows
   is exactly how the provisioning race in §4.3 got interesting. The event is
   acknowledged with 204 and ignored. Recorded in `HANDLED` in
   `app/routers/webhook.py`.

3. **Does the CSP belong on the backend or a frontend web server?** ✅ **Answered,
   and the premise needed correcting.** It is not one policy that has to pick a
   home; it is three policies with three different documents:

   - The **app page** — the one that matters, because it is what renders the
     markdown — is served by Vite in development and a static host in
     production. Its policy lives in `frontend/csp.ts` and can *only* live
     there. A middleware in FastAPI could never have protected it.
   - **API responses** are JSON that should load nothing: `default-src 'none'`,
     enforced today.
   - **`/docs` and `/redoc`** are HTML that FastAPI really does serve, so they
     need their own, looser policy.

   In production the static host should also send the page policy as a header,
   because `frame-ancestors` is ignored in `<meta>` form. That part is genuinely
   §6 work.

4. **Is one integration test against a real Clerk token worth the CI complexity?**
   Still open, and still "probably not at MVP". Nothing here changed the
   trade-off — but the §4.4 gap is now written down in three places
   (`conftest.py`, `test_auth.py`, `docs/backend/testing.md`) rather than
   assumed, so if `authorized_parties` ever does bite, the reason will be
   findable.
