# TaskFlow

## Why This Project Exists

TaskFlow started from two places at once.

The first is personal — ADHD makes staying on top of work, side projects, and everyday life genuinely hard, and most task tools are either too rigid or too noisy. Jira is built for process managers, not engineers: slow, mouse-heavy, no love for keyboard shortcuts. Asana is a joy to use but has no sensible free tier for personal use. Linear is closest to the ideal — opinionated, fast, keyboard-first — and has since launched a free plan that probably would have killed the motivation to build this at all. The goal is something that fits the way an engineer's brain works: fast, keyboard-friendly, detail-obsessed, and flexible enough to hold work and personal life without becoming more noise.

The second is professional. This is a deliberately versatile full-stack app, a place to put new engineering concepts — a frontend pattern, a security feature, real-time updates — into practice instead of a throwaway demo. The product and the skills growing together is the point.

---

## Engineering Topics to Explore

- **React patterns** — optimistic UI updates, lifting state up, props drilling vs Context, custom hooks, compound components, React Query for server state
- **Authentication & security** — delegated auth (Clerk), RBAC (role-based access control), CSRF protection, rate limiting, secure storage patterns
- **Drag-and-drop** — `@dnd-kit` integration, accessible DnD, position/ordering persistence
- **Real-time updates** — WebSockets or Server-Sent Events for live board updates across users
- **Testing** — component testing with React Testing Library, API integration tests, E2E with Playwright
- **Performance** — code splitting, lazy loading, virtualised lists for large boards
- **TypeScript** — progressive strictness, discriminated unions, utility types
- **DevOps & deployment** — CI/CD pipeline, containerisation, environment promotion (dev → staging → prod)

---

## Project Objective
The objective of this project is to create a full end-to-end application, focusing on gaining additional frontend skills while demonstrating the ability to build a full-stack React and FastAPI application. This includes working with drag-and-drop interfaces, REST APIs, and database interactions.

---

## Running Locally

The whole stack runs in Docker. The only manual step is supplying Clerk keys.

> **A Clerk account is required — there is no offline or local-password mode.**
> Authentication is delegated to Clerk by design: sign-up, sign-in, passwords
> and sessions are Clerk's, and this project keeps no credentials of its own to
> fall back on. Without `VITE_CLERK_PUBLISHABLE_KEY` the frontend throws on
> boot; without `CLERK_SECRET_KEY` every authenticated API call fails.
>
> Keyless, you still get Postgres, the backend container, `GET /`, the Swagger
> UI at `/docs` and the full backend test suite — enough to work on the API.
> You just can't sign in to the board. Setup is a free account of your own and
> the three commands in [step 2](#2-add-your-clerk-keys).

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A [Clerk](https://clerk.com) account (free tier is enough) — one application,
  in development mode
- Only if you run services outside Docker: Python 3.11, Node 22, PostgreSQL 15

### 1. Create your `.env`

The **root** `.env` is the single source. Docker Compose interpolates
`docker-compose.yml` from it and passes the values into the containers; when
you run the backend directly from `backend/`, its settings read the same file
(`env_file="../.env"`). There is no second env file to keep in sync.

```bash
cp .env.template .env
```

Leave the `POSTGRES_*` entries blank — `docker-compose.yml` sets the local
database credentials itself (`taskflow_user` / `taskflow_pass` / `taskflow_db`).
The keys that matter are the Clerk ones below.

### 2. Add your Clerk keys

**Every developer uses their own Clerk application.** The repo contains no
keys — `.env` is gitignored — so cloning it gives you the code, not anyone
else's Clerk instance. You create a free one; its users and settings are yours
alone, and the seed fills it with the demo users on first start.

From `frontend/`, log in, link the directory to your Clerk application, and
pull its keys:

```bash
cd frontend
npx clerk@latest auth login   # creates a default application on first login
npx clerk@latest link         # pick that application
npx clerk@latest env pull     # writes frontend/.env.local
```

Skipping `link` makes `env pull` fail with "No Clerk project linked to this
directory". Don't run `clerk init` — that sets Clerk up in a new project, and
this one already has it.

Copy the two values from `frontend/.env.local` (a hidden file) into the root
`.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...   # public — shipped in the browser bundle
CLERK_SECRET_KEY=sk_test_...             # secret — never expose to the browser
```

`env pull` writes into `frontend/`, but Compose reads the root `.env`, so the
copy step is what actually makes the keys reach the containers.

Then set a password for the demo users. It lives only in your `.env`, never in
the code, and must be random — Clerk rejects passwords found in data breaches:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(16))"
```

```env
SEED_PASSWORD=<the value it printed>
```

**Working with collaborators.** The default above — everyone on their own Clerk
application — needs no coordination and is the recommendation. If you would
rather share one development instance (one set of Clerk settings), invite
collaborators to the application in the Clerk Dashboard and have them `link` to
it; don't send keys over chat. Everyone must then use the **same**
`SEED_PASSWORD`: the first person to seed creates the demo users in Clerk, and
later seeds reuse those accounts without changing their password. Production
is always a single separate instance (`pk_live_` / `sk_live_`), with its keys
held by the hosting platform, not in anyone's `.env`.

Everything else in `.env.template` is optional for local development:
`CLERK_AUTHORIZED_PARTIES` and `CORS_ALLOWED_ORIGINS` both default to
`http://localhost:5173`, and the webhook secret is only needed for the
[webhook flow](#optional-clerk-webhooks) below.

### 3. Start everything

From the project root:

```bash
docker compose up
```

This starts:

| Service | URL | Container |
|---|---|---|
| Frontend (Vite dev server) | http://localhost:5173 | `taskflow-frontend` |
| Backend API | http://localhost:8000 | `taskflow-backend` |
| API docs (Swagger UI) | http://localhost:8000/docs | — |
| PostgreSQL | localhost:5432 | `taskflow-db` |

On first run the backend waits for Postgres to pass its healthcheck, creates
the schema from the SQLAlchemy models (`Base.metadata.create_all`) and seeds
demo data (`app/seed.py`): three users, a board with four columns (Backlog, In
Progress, In Review, Done), six tickets and a few comments. No manual migration
or seeding step.

Both services hot-reload — the source directories are bind-mounted, so edits on
your machine take effect without a rebuild.

### 4. Check it came up

```bash
curl http://localhost:8000          # {"message":"taskflow API is running"}
docker compose ps                   # all three services up, db healthy
```

Then open http://localhost:5173.

### 5. Sign in

If `CLERK_SECRET_KEY` and `SEED_PASSWORD` were both set the first time the
database seeded, the seed pushed the demo users into Clerk, and each signs in
with the `SEED_PASSWORD` from your `.env`:

- `alice@example.com`
- `bob@example.com`
- `carol@example.com`

The password lives only in `.env` (which is gitignored), never in the code, so
it can't leak through the repo. Pick something random: Clerk rejects passwords
found in data breaches, so `password123` fails.

Alice owns the demo board; Bob and Carol are members.

If the push didn't happen — no secret key at seed time, or a Clerk API error —
the local rows still exist but have no Clerk account behind them. Sign up at
http://localhost:5173/sign-up using one of those addresses: the first Clerk
account with a matching email **adopts** the existing row, so you inherit
Alice's board rather than starting empty. Signing up with any other address
gives you a fresh account with no boards.

---

### Everyday commands

```bash
docker compose up --build        # rebuild after dependency changes
docker compose logs -f backend   # follow one service's logs
docker compose down              # stop, keep data
docker compose down -v && docker compose up   # wipe and re-seed
```

The `-v` form removes the Postgres volume, so the backend recreates the schema
and re-seeds on next start. With no migrations in the project yet, this is also
how schema changes get applied.

### Running a service outside Docker

Useful for attaching a debugger. Keep `db` running in Docker either way.

```bash
docker compose up db             # Postgres only
```

**Backend** — `db` is a Docker network hostname, so from your machine point
`DATABASE_URL` at the published port instead:

```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

DATABASE_URL=postgresql://taskflow_user:taskflow_pass@localhost:5432/taskflow_db \
  uvicorn app.main:app --reload --port 8000
```

(Those credentials are the ones `docker-compose.yml` gives the `db` service.)

**Frontend** — Vite picks up `VITE_*` vars from `frontend/.env` here, which is
where `clerk env pull` already put them:

```bash
cd frontend
yarn install
yarn dev
```

### Running the tests

The backend suite runs on your machine with nothing else started — no Docker,
no database, no Clerk key, no network. `get_current_user` is overridden with a
known user and the schema is built in SQLite in memory.

First time only (Python 3.11 or 3.12 — on 3.14 the pinned `psycopg2-binary`
won't install):

```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-test.txt
```

Then:

```bash
pytest                        # everything
pytest tests/test_auth.py     # one file
pytest -k authorization       # one topic
```

The auth override exists only inside pytest; there is no setting that turns
auth off for the running server. To call the live API by hand, use a real
Clerk token — both are covered in [backend/docs/testing.md](./backend/docs/testing.md).

### Optional: Clerk webhooks

`POST /api/webhooks/clerk` keeps the local `name`/`avatar` copy in step with
Clerk. It needs a public URL, so tunnel one with the Clerk CLI:

```bash
clerk webhooks listen --token "$(clerk webhooks token)" \
  --forward-to http://localhost:8000/api/webhooks/clerk
```

Register the relay URL as an endpoint in the Clerk Dashboard, then copy that
endpoint's signing secret into `CLERK_WEBHOOK_SIGNING_SECRET`. Without the
secret the endpoint rejects every delivery — unconfigured must not mean
unverified. The app runs fine without any of this; profile edits made in Clerk
just won't propagate until the user signs in again.

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Blank page, console reads `Missing VITE_CLERK_PUBLISHABLE_KEY` | Key never reached the container | Put it in the **root** `.env`, then `docker compose up` again — Compose reads env at container start |
| `401` on every API call | `CLERK_SECRET_KEY` missing or from a different Clerk application | Both keys must come from the same application; `npx clerk@latest env pull` gives a matching pair |
| Signed in, but no boards | Your Clerk email doesn't match a seeded user | Sign up as `alice@example.com`, or create a board |
| Demo login says account not found | Seed ran without `CLERK_SECRET_KEY` or `SEED_PASSWORD`, so no Clerk account was created | Set both, then `docker compose down -v && docker compose up` to re-seed |
| "This password has been found as part of a breach" | The Clerk account was created with an old seed password (`password123`) | Delete the three demo users in the Clerk Dashboard, then `docker compose down -v && docker compose up` to re-seed |
| Backend restarts in a loop | Postgres not ready, or `DATABASE_URL` wrong | `docker compose logs db`; in Compose the host is `db`, not `localhost` |
| Port already allocated | 5173 / 8000 / 5432 in use | Stop the other process, or remap the port in `docker-compose.yml` |
| CSP violations in the console | Page policy is report-only by default | Expected — see `backend/docs/auth.md`; set `VITE_CSP_MODE=enforce` to block instead |

More detail on the auth flow, CSP and deployment config: `backend/docs/auth.md`.

---

## Frontend Features

- Basic board, column, and ticket management
- Responsive design
- Single-page application behavior
- Drag-and-drop support for tickets and columns

---

## Backend Features

- FastAPI REST API
- PostgreSQL database for persistent storage
- Clerk-delegated authentication, mapped onto local users via `user_identities`
- User, board, column, ticket, and comment management
- Dockerized for easy development and deployment

---

## Further Documentation

- [Backend README](./backend/README.md) — backend structure and non-Docker setup
- [Authentication & security](./backend/docs/auth.md) — the Clerk flow, token handling, CSP, webhooks, deployment config
- [Database schema](./backend/docs/schema.md) — the seven tables and how they relate
- [Testing](./backend/docs/testing.md) — the automated suite, and driving the API by hand


## Epic 
I am worried the types file will get coonfusing as the frontend code go - e.g. I have a user interface for doing authetication but I will also need a user interface for the profile information I want to edit this going forward so I am furher aligned to patterns 