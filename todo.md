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

**Login sends mock values instead of the real form input**
- `frontend/src/App.tsx` → `handleLogIn` ignores the form: it hardcodes
  `mockemail`/`mockpassword` and builds a fake `mockUser` with `id: "mock"`.
- Fix: take the real `LogInFromData`, POST the typed email/password (as
  `username`/`password`, x-www-form-urlencoded), then load the real user (below).
- [ ] Use real credentials from the form
- [ ] Stop constructing a `mockUser`

**Data-model drift to reconcile (related, lower urgency)**
- [ ] `frontend/src/types.ts` `BoardSummary.owner_id` references a column that no
      longer exists — `boards` dropped `owner_id` for the membership model. Will
      break board-list wiring; update the type.
- [ ] `tickets.creator_id` and `comments.user_id` use `ON DELETE CASCADE`, so
      deleting a user wipes their tickets/comments. The spec left this TBD and did
      not cascade — reconcile (likely `SET NULL` + a "deleted user" placeholder,
      matching `assignee_id`).

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
- [ ] Can explain the XSS and CSRF threat models in plain language
- [ ] Have a working proof-of-concept for httpOnly cookie login in FastAPI (on a branch)
- [ ] Decision documented in `backend/docs/auth.md` with rationale

**Priority:** Medium — do before production or before handling any sensitive user data
**Dependencies:** Frontend auth (localStorage) must be working first

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

**See:** `frontend/docs/drag-and-drop.md` for Phase 1 reference

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
