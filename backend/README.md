# Taskflow Backend API

FastAPI backend service for the taskflow board application with PostgreSQL database.

---

## Features

* RESTful API built with FastAPI
* PostgreSQL database with SQLAlchemy ORM
* JWT authentication
* Automatic API documentation (Swagger UI)
* Dockerized for easy development and deployment
* Hot reload in development mode

---

## Tech Stack

* **FastAPI** - Modern Python web framework
* **SQLAlchemy** - SQL toolkit and ORM
* **PostgreSQL** - Relational database
* **Pydantic** - Data validation
* **JWT** - Authentication tokens
* **Uvicorn** - ASGI server

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Configuration and settings
│   ├── database.py          # Database connection
│   ├── models.py            # SQLAlchemy database models
│   ├── schemas.py           # Pydantic validation schemas
│   ├── auth_utils.py        # Authentication utilities
│   ├── dependencies.py      # Shared dependencies
│   └── routers/             # API route modules
│       ├── __init__.py
│       ├── auth.py          # Login/register endpoints
│       ├── board.py         # Board management
│       └── ticket.py        # Ticket CRUD operations
├── requirements.txt         # Python dependencies
└── Dockerfile               # Docker configuration
```

---

## Setup - Docker (recommended)

See the [main README](../README.md) for Docker setup instructions.

---

## Setup - Local Development (without Docker)

### 1. Create Virtual Environment

```bash
cd backend
python3.12 -m venv .venv   # 3.11 or 3.12; psycopg2-binary won't install on 3.14
source .venv/bin/activate  # macOS/Linux
.venv\Scripts\activate     # Windows
```

### 2. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt -r requirements-test.txt
```

### 3. Configure Environment Variables

Settings are read from the **root** `.env` (`env_file="../.env"` in
`app/config.py`) — there is no `backend/.env`. Set it up as described in the
[main README](../README.md#1-create-your-env). Outside Docker, the database
host is `localhost`, not `db`, so override `DATABASE_URL` when starting the
server (step 5).

(The tests need none of this — skip to [Running the Tests](#running-the-tests).)

### 4. Set Up Database

No manual schema step is needed — the app creates all tables on startup
(`Base.metadata.create_all`, from the ORM models in `app/database/models/`) and
loads demo data via `app/seed.py`. Just ensure the database exists and
`DATABASE_URL` points at it. A visual model lives in
[`database/schema.dbml`](../database/schema.dbml); the authorization design is
in [`docs/specs/authorization-data-model.md`](../docs/specs/authorization-data-model.md).

> Schema changes: since there are no migrations during the MVP, apply them by
> recreating the volume — `docker compose down -v && docker compose up`.

### 5. Run the Server

With Postgres running (`docker compose up db` from the project root):

```bash
DATABASE_URL=postgresql://taskflow_user:taskflow_pass@localhost:5432/taskflow_db \
  uvicorn app.main:app --reload --port 8000
```

* **API**: http://localhost:8000
* **Interactive Docs**: http://localhost:8000/docs
* **ReDoc**: http://localhost:8000/redoc

---

## Running the Tests

The suite runs with nothing else started — no Docker, no Postgres, no server,
no Clerk key. Each test builds a fresh SQLite database in memory and replaces
`get_current_user` with a known user.

With the venv from steps 1–2 active:

```bash
pytest                        # everything
pytest tests/test_auth.py     # one file
pytest -k authorization       # tests whose name matches a keyword
pytest -x                     # stop at the first failure
```

See [docs/testing.md](./docs/testing.md) for what each file covers, how the
auth override works, and how to call the running API by hand with a real token.

---

## API Documentation

FastAPI automatically generates interactive API documentation:

* **Swagger UI**: http://localhost:8000/docs
* **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

#### Authentication
* `GET /api/auth/me` - The signed-in user's TaskFlow record

Sign-up and sign-in are handled by Clerk in the frontend, not by this API.

#### Boards
* `GET /api/boards` - List all boards
* `GET /api/boards/{board_id}` - Get board with columns and tickets
* `POST /api/boards` - Create new board

#### Tickets
* `GET /api/boards/{board_id}/tickets/{ticket_id}` - Get ticket details
* `POST /api/boards/{board_id}/tickets` - Create new ticket
* `PATCH /api/boards/{board_id}/tickets/{ticket_id}` - Update ticket
* `DELETE /api/boards/{board_id}/tickets/{ticket_id}` - Delete ticket

---

## Authentication

Authentication is delegated to [Clerk](https://clerk.com). Clerk verifies the
session token; `user_identities` maps the Clerk account (`provider='clerk'`) to
the local `users` row that boards and tickets reference.

For a full explanation of the auth flow see [docs/auth.md](./docs/auth.md).

### Getting a Token

Tokens are minted by Clerk in the browser, so grab one from a signed-in tab's
console:

```js
await window.Clerk.session.getToken()
```

### Using the Token

```bash
curl -X GET "http://localhost:8000/api/boards" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Authorization

Access to a board is governed by membership-based, role-scoped authorization. Every board-scoped request — reads included — is checked live against the `board_members` table, which is the single source of truth for who can do what: each membership carries one of four roles (`owner`, `admin`, `member`, `viewer`), and non-members get a `404` so a board's existence is never leaked. The check is enforced through a reusable FastAPI dependency so every route re-invokes the same logic rather than reimplementing it. See [docs/specs/authorization-data-model.md](../docs/specs/authorization-data-model.md) for the full data model, permission matrix, and design rationale.

---

## Development Tips

### View Logs

```bash
docker logs -f taskflow-backend
```

### Database Inspection

```bash
docker exec -it taskflow-db psql -U taskflow_user -d taskflow_db
```

### Testing Endpoints

Use the interactive Swagger UI at `/docs` or tools like Postman, Insomnia, or curl.

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://taskflow_user:taskflow_pass@db:5432/taskflow_db

# Clerk (see ../frontend: `npx clerk@latest env pull`)
CLERK_SECRET_KEY=sk_test_...
```

**Important**: Never commit `.env` to version control.

---

## Production Deployment

### Security Checklist

- [ ] Claim the Clerk app (`npx clerk@latest auth login`) and switch to production keys (`npx clerk@latest deploy`)
- [ ] Add the production origin to `clerk_authorized_parties` in `app/config.py`
- [ ] Update `allow_origins` in `main.py` to your production frontend domain
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Remove `--reload` flag from uvicorn

---

## Troubleshooting

### Database Connection Failed

* Check if PostgreSQL is running: `docker ps` or `pg_isready`
* Verify environment variables
* Ensure database exists: `psql -l`

### Import Errors

* Make sure virtual environment is activated
* Reinstall dependencies: `pip install -r requirements.txt`

### Port Already in Use

```bash
lsof -i :8000
kill -9 <PID>
```
