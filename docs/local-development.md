# Local development

The [README](../README.md) has the short path to a running app. This page has
the background behind each step, plus everything you need after the first start.

## Why a Clerk account is required

There is no offline mode and no local-password mode. Clerk handles sign-up,
sign-in, passwords and sessions, and this project keeps no credentials of its
own to fall back on. Without `VITE_CLERK_PUBLISHABLE_KEY` the frontend throws on
boot. Without `CLERK_SECRET_KEY` every authenticated API call fails.

Without keys you still get Postgres, the backend container, `GET /`, the Swagger
UI at `/docs` and the full backend test suite. That is enough to work on the
API, but you can't sign in to the board.

## The `.env` file

The **root** `.env` is the only env file. Docker Compose fills in
`docker-compose.yml` from it and passes the values into the containers. When
you run the backend directly from `backend/`, its settings read the same file
(`env_file="../.env"`), so there is no second file to keep in sync.

Leave the `POSTGRES_*` entries blank. `docker-compose.yml` sets the local
database credentials itself (`taskflow_user` / `taskflow_pass` / `taskflow_db`).

Everything else in `.env.template` beyond the Clerk keys and `SEED_PASSWORD` is
optional for local development:

- `CLERK_AUTHORIZED_PARTIES` and `CORS_ALLOWED_ORIGINS` both default to
  `http://localhost:5173`.
- `CLERK_WEBHOOK_SIGNING_SECRET` is only needed for the
  [webhook flow](#optional-clerk-webhooks).

## Clerk keys

**Every developer uses their own Clerk application.** The repo contains no keys
(`.env` is gitignored), so cloning it gives you the code but not anyone else's
Clerk instance. You create a free application, its users and settings are yours
alone, and the seed adds the demo users to it on first start.

Notes on the `npx clerk@latest` commands in the README:

- `auth login` creates a default application on your first login.
- Don't skip `link`. Without it, `env pull` fails with "No Clerk project linked
  to this directory".
- Don't run `clerk init`. It sets Clerk up in a new project, and this one
  already has it.
- `env pull` writes to `frontend/.env.local` (a hidden file), but Compose reads
  the root `.env`. Copying the two keys across is the step that gets them into
  the containers.

The publishable key (`pk_test_…`) is public and ships in the browser bundle. The
secret key (`sk_test_…`) must never reach the browser.

### Working with collaborators

The default is for everyone to use their own Clerk application. That needs no
coordination and is the recommended setup.

If you'd rather share one development instance (one set of Clerk settings),
invite collaborators to the application in the Clerk Dashboard and have them
`link` to it. Don't send keys over chat. Everyone must then use the **same**
`SEED_PASSWORD`, because the first person to seed creates the demo users in
Clerk, and later seeds reuse those accounts without changing their password.

Production is always a single separate instance (`pk_live_` / `sk_live_`).
Its keys are held by the hosting platform, not in anyone's `.env`.

## What happens on first start

The backend waits for Postgres to pass its healthcheck, then creates the schema
from the SQLAlchemy models (`Base.metadata.create_all`). It then seeds demo data
(`app/seed.py`):

- three users
- a board with four columns (Backlog, In Progress, In Review, Done)
- six tickets and a few comments

There is no manual migration or seeding step.

Both services hot-reload. The source directories are bind-mounted, so your edits
take effect without a rebuild.

To check it came up:

```bash
curl http://localhost:8000          # {"message":"taskflow API is running"}
docker compose ps                   # all three services up, db healthy
```

## Demo users

The seed pushes the demo users into Clerk only if `CLERK_SECRET_KEY` and
`SEED_PASSWORD` were both set when the database first seeded. Each user then
signs in with the `SEED_PASSWORD` from your `.env`:

- `alice@example.com` owns the demo board.
- `bob@example.com` and `carol@example.com` are members of it.

The password lives only in `.env`, never in the code, so it can't leak through
the repo. It must be random, because Clerk rejects passwords found in data
breaches (`password123` fails).

The push can fail if the secret key was missing at seed time or Clerk returned
an error. In that case the local rows exist but have no Clerk account behind
them. Sign up at http://localhost:5173/sign-up with one of those addresses.
The first Clerk account with a matching email **adopts** the existing row, so
you get Alice's board instead of an empty account. Signing up with any other
address gives you a new account with no boards.

## Everyday commands

```bash
docker compose up --build        # rebuild after dependency changes
docker compose logs -f backend   # follow one service's logs
docker compose down              # stop, keep data
docker compose down -v && docker compose up   # wipe and re-seed
```

The `-v` form removes the Postgres volume, so the backend recreates the schema
and re-seeds on the next start. The project has no migrations yet, so this is
also how schema changes get applied.

## Running a service outside Docker

This is useful for attaching a debugger. Keep `db` running in Docker either way:

```bash
docker compose up db             # Postgres only
```

**Backend.** `db` is a hostname that only exists on the Docker network. From
your machine, point `DATABASE_URL` at the published port instead:

```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

DATABASE_URL=postgresql://taskflow_user:taskflow_pass@localhost:5432/taskflow_db \
  uvicorn app.main:app --reload --port 8000
```

Those are the credentials `docker-compose.yml` gives the `db` service.

**Frontend.** Here Vite reads `VITE_*` variables from the `frontend/` directory,
where `clerk env pull` already put them:

```bash
cd frontend
yarn install
yarn dev
```

## Running the tests

The backend suite runs on your machine with nothing else started: no Docker, no
database, no Clerk key, no network. Pytest overrides `get_current_user` with a
known user and builds the schema in an in-memory SQLite database.

First time only (use Python 3.11 or 3.12, because the pinned `psycopg2-binary`
won't install on 3.14):

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

The auth override exists only inside pytest. No setting turns auth off for the
running server, so calling the live API by hand needs a real Clerk token. See
[docs/backend/testing.md](./backend/testing.md) for both.

## Optional: Clerk webhooks

`POST /api/webhooks/clerk` keeps the local `name`/`avatar` copy in step with
Clerk. Clerk needs a public URL to deliver to, so open a tunnel with the Clerk
CLI:

```bash
clerk webhooks listen --token "$(clerk webhooks token)" \
  --forward-to http://localhost:8000/api/webhooks/clerk
```

Register the relay URL as an endpoint in the Clerk Dashboard. Then copy that
endpoint's signing secret into `CLERK_WEBHOOK_SIGNING_SECRET`.

Without the secret, the endpoint rejects every delivery. That is deliberate: an
unconfigured endpoint must not accept unverified requests. The app runs fine
without webhooks, but profile changes made in Clerk won't reach the local copy
until the user signs in again.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `failed to connect to the docker API at unix:///…/docker.sock` | Docker Desktop isn't running | Open Docker Desktop (`open -a Docker`), wait for it to finish starting, then `docker compose up` again |
| Blank page, console reads `Missing VITE_CLERK_PUBLISHABLE_KEY` | Key never reached the container | Put it in the **root** `.env`, then `docker compose up` again. Compose reads env at container start |
| `401` on every API call | `CLERK_SECRET_KEY` missing or from a different Clerk application | Both keys must come from the same application. `npx clerk@latest env pull` gives a matching pair |
| Signed in, but no boards | Your Clerk email doesn't match a seeded user | Sign up as `alice@example.com`, or create a board |
| Demo login says account not found | Seed ran without `CLERK_SECRET_KEY` or `SEED_PASSWORD`, so no Clerk account was created | Set both, then `docker compose down -v && docker compose up` to re-seed |
| "This password has been found as part of a breach" | The Clerk account was created with an old seed password (`password123`) | Delete the three demo users in the Clerk Dashboard, then `docker compose down -v && docker compose up` to re-seed |
| Backend restarts in a loop | Postgres not ready, or `DATABASE_URL` wrong | `docker compose logs db`. In Compose the host is `db`, not `localhost` |
| Port already allocated | 5173 / 8000 / 5432 in use | Stop the other process, or remap the port in `docker-compose.yml` |
| CSP violations in the console | Page policy is report-only by default | Expected. See [docs/backend/auth.md](./backend/auth.md); set `VITE_CSP_MODE=enforce` to block instead |

More on the auth flow, CSP and deployment config:
[docs/backend/auth.md](./backend/auth.md).
