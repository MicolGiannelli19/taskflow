# TaskFlow

A fast, keyboard-friendly task board in the spirit of Jira and Linear, meant to
hold work, side projects and everyday life without adding more noise.

It is also a learning project: a full-stack app where new engineering ideas,
such as a frontend pattern, a security feature or real-time updates, get built
into a real product instead of throwaway demos.

**What it does:** boards with columns and tickets, moving tickets between
columns, markdown descriptions and comments, due dates, and shared boards with members.

**Stack:** React + TypeScript (Vite, React Query) frontend, FastAPI +
PostgreSQL backend, Clerk for authentication, Docker Compose for local
development.

For the full background, goals and the topics still to explore, see the
[project overview](./docs/project-overview.md).

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A free [Clerk](https://clerk.com) account with one application in development
  mode. This is **required**: the app has no local-password mode.

## Start the app

**1. Create your `.env`** in the project root. Leave the `POSTGRES_*` entries blank.

```bash
cp .env.template .env
```

**2. Get your Clerk keys.** Run these from `frontend/`:

```bash
cd frontend
npx clerk@latest auth login   # creates a default application on first login
npx clerk@latest link         # pick that application
npx clerk@latest env pull     # writes frontend/.env.local
```

Copy the two keys from `frontend/.env.local` into the **root** `.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**3. Set a password for the demo users.** It must be random, because Clerk rejects
passwords found in data breaches:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(16))"
```

```env
SEED_PASSWORD=<the value it printed>
```

**4. Start everything** from the project root:

```bash
docker compose up
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API docs (Swagger UI) | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

On first start, the backend creates the schema and seeds demo data.

**5. Sign in** at http://localhost:5173 as `alice@example.com`, `bob@example.com`
or `carol@example.com`, using your `SEED_PASSWORD`. Alice owns the demo board.

To wipe the database and re-seed: `docker compose down -v && docker compose up`.

If something doesn't work, see
[Troubleshooting](./docs/local-development.md#troubleshooting).

## Documentation

- [Local development](./docs/local-development.md): background on each setup
  step, everyday commands, running outside Docker, tests, Clerk webhooks and
  troubleshooting
- [Project overview](./docs/project-overview.md): why TaskFlow exists, its goals
  and its features
- [Backend README](./backend/README.md): backend structure and API endpoints
- [Authentication and security](./backend/docs/auth.md): the Clerk flow, token
  handling, CSP, webhooks and deployment config
- [Database schema](./backend/docs/schema.md): the seven tables and how they relate
- [Testing](./backend/docs/testing.md): the automated suite, and calling the API
  by hand
- [Frontend architecture](./frontend/docs/architecture.md)
