# TODO List of the next steps for my project

- Retrive data from the api in the frontend
  - Create a libarary that can call the following endpoint

11/01  
- Get some backend tests make sure you can call the follwoing api end point: 
```bash
curl http://localhost:8000/api/boards/550e8400-e29b-41d4-a716-446655440001
```
- Fix the issue where I changed the name of the coloumn table to avoid conflict 


# STORY: Auth/login functional fixes (2026-08-29)

Bugs found while tracing the login flow. Login currently "works" only because it
sends hardcoded mock credentials — real form input never reaches the API. Capture
here so they survive the branch merges. Some may already be fixed on a branch
being merged in — check them off if so.

**Login sends mock values instead of the real form input** — ✅ **resolved by the
Clerk migration (2026-09-19), not by fixing this code.** `handleLogIn` and
`LogInForm.tsx` were deleted: Clerk's `<SignIn />` owns the form, the
credentials and the session, so there is no hand-rolled login path left to send
mock values. `useAuth()` returns the real local user via `GET /api/users/me`.
See `docs/specs/clerk-integration.md` and `docs/backend/auth.md`.
- [x] Use real credentials from the form
- [x] Stop constructing a `mockUser`

**Data-model drift to reconcile (related, lower urgency)**
- [ ] `frontend/src/types.ts` `BoardSummary.owner_id` references a column that no
      longer exists — `boards` dropped `owner_id` for the membership model. Will
      break board-list wiring; update the type.
- [ ] `tickets.creator_id` and `comments.user_id` use `ON DELETE CASCADE`, so
      deleting a user wipes their tickets/comments. The spec left this TBD and did
      not cascade — reconcile (likely `SET NULL` + a "deleted user" placeholder,
      matching `assignee_id`).
      **Raised priority (2026-09-19):** comments have shipped, so there is real
      content to lose. The `user.deleted` webhook deliberately routes around this
      — it deletes only the `user_identities` link and never the `users` row —
      but that is a workaround, not the fix. See `docs/specs/clerk-integration.md` §11.

**Priority:** High for the login items (auth is broken for real users); Medium for the drift items.

---

# Fix Data model defenition
# TODO: Migrate from init.sql to Alembic Migrations


## When to Start This Task
- [ ] Schema changes are becoming less frequent (< 1 change per week)
- [ ] Have real users or data that can't be lost
- [ ] Approaching production deployment
- [ ] Need to deploy updates without recreating database

## Pre-Migration Checklist
- [ ] Document current database schema completely
- [ ] Back up any important test/staging data
- [ ] Ensure all team members are aware of the transition
- [ ] Set aside 2-4 hours for the migration work

## Migration Steps


### 5. Update Development Workflow (partly done)
- [x] Remove `init.sql` (deleted, along with seed.sql / set_up_mock_data.sql)
- [x] Update Docker Compose to not use `init.sql`
- [x] Update README with the current DB workflow (`down -v` reset)
- [ ] Create script for running migrations in development (needs Alembic)
- [ ] Document migration workflow for team (needs Alembic)

### 6. Update CI/CD (if applicable)
- [ ] Add migration step to deployment pipeline
- [ ] Test migrations run correctly in staging
- [ ] Create rollback procedure documentation

### 7. Testing & Validation
- [ ] Test creating database from scratch with migrations
- [ ] Test upgrading from previous schema version
- [ ] Test downgrading migrations (rollback)
- [ ] Verify all existing API endpoints still work

## Common Alembic Commands to Remember

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history

# View current version
alembic current
```

## Resources
- [ ] Read Alembic tutorial: https://alembic.sqlalchemy.org/en/latest/tutorial.html
- [ ] Review SQLAlchemy relationships: https://docs.sqlalchemy.org/en/20/orm/relationships.html
- [ ] Bookmark FastAPI with SQLAlchemy guide: https://fastapi.tiangolo.com/tutorial/sql-databases/

## Notes
- `init.sql` remains in git history for reference (deleted from the working tree)
- Consider creating a backup before first production migration
- Test migrations thoroughly in staging environment first

---

**Status**: ORM migration done; Alembic adoption not started  
**Priority**: Medium (do before production)  
**Estimated Time**: ~2 hours remaining (Alembic setup + initial migration)  
**Dependencies**: Schema stabilization



# Username / @mentions decision

- No `username` field needed for MVP
- `name` + `avatar` is sufficient for identifying users in a board context
- If @mentions are added to ticket comments in future → add `username` (unique, lowercase, URL-safe) to `users` table at that point
- If public profile URLs are needed → same trigger

---

# SPIKE: Research production-grade token storage options

**Type:** Learning spike (timebox to ~3 hours)

**Context:**
For the MVP, JWTs are stored in `localStorage`. This was a deliberate tradeoff — simple to implement, no backend changes required, acceptable for non-sensitive data. Before moving to production, we should understand the full security landscape and make an informed decision.

**Goal:**
Understand the three main token storage patterns and when to use each, so we can make a conscious architecture decision rather than defaulting to whatever we shipped first.

**Patterns to research:**

1. **localStorage** (current) — token in JS-accessible browser storage
   - Research: what does a real XSS attack against localStorage look like?
   - Research: how does a Content Security Policy (CSP) reduce this risk?

2. **httpOnly cookies** — token set by the server, invisible to JavaScript
   - Research: implement `Set-Cookie` with `httponly`, `secure`, `samesite=lax` in FastAPI
   - Research: what is CSRF and why does `samesite=lax` largely mitigate it?
   - Research: when would you need `samesite=none` and a CSRF token on top?

3. **Hybrid (recommended for production)** — refresh token in httpOnly cookie, access token in memory only
   - Research: what is a refresh token and how does silent token renewal work?
   - Research: implement a `/auth/refresh` endpoint in FastAPI
   - Research: implement the Axios interceptor that retries failed requests after refresh

**Acceptance criteria:**
- [x] Can explain the XSS and CSRF threat models in plain language
- [x] ~~Have a working proof-of-concept for httpOnly cookie login in FastAPI (on a branch)~~
      **Moot.** Clerk implements exactly the hybrid this spike was going to
      prototype: the session credential is an `HttpOnly` cookie on Clerk's
      domain, and `getToken()` keeps a short-lived access token in memory. That
      FastAPI code will never be written, so the proof-of-concept has nothing
      left to prove.
- [x] Decision documented in `docs/backend/auth.md` with rationale
      → see the **Token storage** section: what was chosen, what was rejected
      (`localStorage`, a BFF/token proxy), and the residual XSS exposure.

**Status:** ✅ **Closed 2026-09-19.** The short version: nothing of ours stores a
token any more. Storage bounds the *damage* from an XSS; the Content-Security-Policy
(also now in `docs/backend/auth.md`) is what *prevents* one.

**Priority:** ~~Medium~~ — done.
**Dependencies:** ~~Frontend auth (localStorage) must be working first~~ — superseded by Clerk.

---

# EPIC: Drag-and-drop Phase 2 — within-column reordering

Phase 1 (drag between columns) is complete. Within-column reordering was deliberately deferred.

**Backend first:**
- Add a `position` field to the `tickets` table
- Decide on the position scheme before writing the migration:
  - **Integer indexes** — simple, but every reorder rewrites N rows in the column
  - **Fractional / sparse positions** (or LexoRank-style string ranks) — insert between two items by averaging, touches only one row. Recommended.
- Backfill existing rows with positions
- Update PATCH ticket endpoint to accept `position`
- Order tickets by `position` in the GET board response

**Frontend:**
- Register each `Ticket` as a drop target (not just `Column`)
- Use `@atlaskit/pragmatic-drag-and-drop-hitbox` for above/below edge detection on tickets
- Extend `useMoveTicket` to send `position` alongside `column_id`, including in the optimistic update
- Visual feedback for the insertion point (drop indicator line between tickets)

**See:** `docs/frontend/drag-and-drop.md` for Phase 1 reference

---

# STORY: Better debugger setup for the backend

**Type:** Dev-experience / tooling
**Status:** Not started (paused 2026-08-29 — decided approach, deferred the work)

**Context:**
There's currently no way to run the VS Code debugger against the backend. There's
no `.vscode/launch.json`, the backend only runs inside the `backend` container
(`command: uvicorn app.main:app --reload`), and `debugpy` isn't in
`requirements.txt`. So today debugging = print statements / logs only. Want proper
breakpoints for stepping through the new authz + service-layer code.

**Two approaches evaluated:**

1. **Debug locally, Postgres in Docker (RECOMMENDED — least friction):**
   Run only the DB in Docker (`docker compose up db`, already published on
   `localhost:5432`) and launch the backend on the host under the debugger.
   - Add a `launch.json` "Python: FastAPI" config running
     `uvicorn app.main:app --reload` with `cwd: backend`.
   - **Gotcha:** `config.py`'s default `database_url` is wrong for the compose DB
     (`user:password@localhost/taskflow_db`). Must pass the real one:
     `postgresql://taskflow_user:taskflow_pass@localhost:5432/taskflow_db`.
   - **Gotcha:** deps must be installed in a local venv
     (`pip install -r requirements.txt`) — the container's are isolated.
   - Bonus: `seed_on_startup=True` seeds on launch; same config pattern also
     enables debugging `pytest`.

2. **Attach to the container via `debugpy`:** add `debugpy` to
   `requirements.txt`, change the backend command to
   `python -m debugpy --listen 0.0.0.0:5678 -m uvicorn ...`, expose port `5678`
   in compose, add an "attach" `launch.json`. Closest to prod parity, more moving
   parts.

**Acceptance criteria:**
- [ ] Can set a breakpoint in a router/service and hit it on a real request
- [ ] `.vscode/launch.json` committed with a FastAPI debug config (Option A)
- [ ] A `pytest` debug config so tests can be stepped through too
- [ ] Quick note in `backend/README.md` on how to start a debug session

**Priority:** Low–Medium (quality of life; do before the big authz test-writing push)
**Dependencies:** local venv with requirements installed

---

# EPIC: DESIGN A WAY TO MAKE SHORT CUTS A CENTRAL FEATURE OF THIS

# EPIC : Add tests to fast api application 

# EPIC : Document and finalize authorazation model 

# EPIC : Set up the database in a a more scalable and fast API native way

# THINK of a pattern where coloums have the standard names and then these can be changed to new names


# Question ammend api design what would be appropiate I only want the user to be able to see the boards he is a part of ? what is correct should the generic /boards api retrun boards based on the user (token id) - or should the specific username be passed in to filter this here


# Other ui features
I am very visual and on a normal jira board I usually loose track of tickets I want all tickets to be saved with a random pixel icon next them so they are visually easy to recognise - i.e. its easier for my brain to work on the "blue frog ticket" then rember a ticket number

I want to easily be able to move arround the page with keyboard short cuts only

I want to have a widget that reminds me what ticket I am working on 

---

# STORY: Post, edit and delete ticket comments (2026-08-30)

Comments are **read-only** today. The data is modelled and rendered, but there is
no way to write one — the whole write path is missing, backend first.

## What already exists

- `comments` table + `Comment` ORM model (`backend/app/database/models/comment.py`):
  `ticket_id`, `user_id`, `content`, `created_at`, `updated_at`.
- `CommentResponse` schema, and `CommentCreate` (`content: str`) — **declared in
  `schemas.py` but never imported anywhere**, i.e. written in anticipation of
  this work.
- Read path only: `TicketService.get_ticket_detail` loads a ticket's comments and
  resolves each author, and they come back nested in
  `GET /api/boards/{board_id}/tickets/{ticket_id}`. There is no
  `GET .../comments` collection endpoint, and none is needed for the MVP.
- Frontend renders them read-only in `TicketDetailContent` (author avatar, name,
  date, body). No composer, no edit/delete affordance.

## What's missing

**Backend**
- [ ] `POST /api/boards/{board_id}/tickets/{ticket_id}/comments` → 201 + `CommentResponse`
- [ ] `PATCH .../comments/{comment_id}` (edit own comment)
- [ ] `DELETE .../comments/{comment_id}` → 204
- [ ] `TicketService` (or a new `CommentService`) methods behind them. Decide
      which — `TicketService`'s docstring already claims "tickets and their
      comments", but it's getting long.
- [ ] Validate `content`: non-empty after strip, and a max length. `Comment.content`
      is `Text` so the DB won't stop a 10MB comment.
- [ ] Return `updated_at` (and probably an `edited` flag) on `CommentResponse` —
      the column exists but isn't exposed, and edit is pointless without it.

**Authorization — needs a decision before coding**
- [ ] Can a `VIEWER` comment? Every existing write uses
      `require_board_role(Role.MEMBER)`; commenting is arguably the one write a
      viewer should have. Pick one and write it down in
      `docs/specs/authorization-data-model.md`.
- [ ] Edit: author only (not even admins) — the usual rule.
- [ ] Delete: author, plus board `ADMIN`/`OWNER` for moderation.
- [ ] `require_board_role` guards the *board*; ownership of the comment is a
      second check inside the service. Don't conflate them.

**Frontend**
- [ ] Composer in `TicketDetailContent` (textarea + Post, disabled while empty
      or pending). Reuse `MarkdownEditor` if comments should support markdown —
      decide, since the body currently renders as plain `white-space: pre-wrap`.
- [ ] `useCreateComment` / `useUpdateComment` / `useDeleteComment` hooks that
      invalidate `["ticket", boardId, ticketId]`, matching the existing hooks.
- [ ] Optimistic append, so posting feels instant (see `useMoveTicket`).
- [ ] Edit/delete controls shown only on your own comments.
- [ ] Delete needs a confirm step — a comment is not recoverable.

**Data-model follow-up (already flagged above, bites harder once comments matter)**
- [ ] `comments.user_id` is `ON DELETE CASCADE`: deleting a user silently wipes
      their comments and leaves gaps in every thread. Should be `SET NULL` + a
      "deleted user" placeholder, matching `tickets.assignee_id`.
- [ ] `Comment` has no `author` relationship, so `get_ticket_detail` issues one
      `User` query per comment (N+1). Add the relationship or join once.

## Acceptance criteria
- [ ] A board member can post a comment on a ticket and see it appear without a reload
- [ ] The author can edit and delete their own comment; other members cannot
- [ ] An owner/admin can delete anyone's comment
- [ ] Empty/whitespace-only comments are rejected by the API, not just the UI
- [ ] Tests cover: post, edit-own, edit-other (403), delete-own, delete-other
      (403), owner-deletes-other (200), viewer permission per the decision above

**Priority:** Medium — the highest-value missing interaction on a ticket.
**Dependencies:** none blocking. `backend/tests/` is currently empty apart from
`__init__.py`, so this story either lands without tests or carries the cost of
setting up the first ones — see "EPIC: Add tests to fast api application".




---

# Frontend types file is getting confusing

`frontend/src/types.ts` will get harder to follow as the frontend grows. For
example, there is a user interface for authentication, and there will also need
to be one for profile information. Restructure it to follow a clearer pattern.
