# Testing the API

Two kinds of testing live here: the automated suite, and driving the API by
hand without the frontend.

---

## The automated suite

### Running it on your machine

Nothing has to be running first — not Docker, not Postgres, not the API server,
and no Clerk key in `.env`. The suite runs entirely inside the pytest process:

- **Database** — each test gets a fresh SQLite database in memory.
- **Auth** — `get_current_user` is swapped for a known user (see below), so
  Clerk is never called.
- **HTTP** — `TestClient` calls the app in-process; nothing listens on port 8000.
- **Network** — any test that opens a socket fails on purpose (`no_network` in
  `conftest.py`), so the suite can't quietly start depending on a live service.

One-time setup, from the project root. Use Python 3.11 or 3.12 (the Docker
image runs 3.11); on 3.14 the install fails because the pinned
`psycopg2-binary` has no wheel for it. Check with `python3 --version`, and if
it's too new, name the version explicitly (e.g. `python3.12`, from
`brew install python@3.12`):

```bash
cd backend
python3.12 -m venv .venv              # .venv is gitignored
source .venv/bin/activate
pip install -r requirements.txt -r requirements-test.txt
```

Both files are needed: `requirements-test.txt` holds only pytest and its
helpers; the app's own dependencies are in `requirements.txt`.

Then, with the venv active:

```bash
pytest                          # everything
pytest tests/unit               # one layer (unit, services or api)
pytest tests/api/test_auth.py   # one file
pytest -k authorization         # tests whose name matches a keyword
pytest -x                       # stop at the first failure
pytest -v                       # print each test's name
pytest -p no:warnings           # hide the deprecation-warning summary
pytest --cov                    # plus a coverage report (see below)
```

Without activating the venv: `.venv/bin/python -m pytest`.

The full run takes about a second. The long warnings summary at the end
(`.dict()`, `datetime.utcnow()`) is deprecation noise, not failures — the line
that matters is `N passed`.

### The three layers

The suite is split by how much of the app each test runs. A rule belongs in the
lowest layer that can see it; a test placed higher than that is slower and
fails for more unrelated reasons.

| Folder | Runs | Uses | Belongs here |
|---|---|---|---|
| `tests/unit/` | One function or Pydantic model | Nothing: no database, no `TestClient` | Validation rules, parsing, the role hierarchy |
| `tests/services/` | A service class against a real session | `db_session` (SQLite in memory) | Business rules: ordering, invariants, what gets written |
| `tests/api/` | The app over HTTP via `TestClient` | `as_user`, `unauthenticated` | Status codes, auth and authorization wiring, response shapes |

Unit tests call the code directly and need no fixtures: building
`TicketUpdate(priority="urgent")` is exactly what FastAPI does with a request
body, minus the HTTP. Services are tested against SQLite rather than a mocked
`Session` because a mock only checks *which* query methods were called, so it
breaks on a harmless refactor and still passes when the query is wrong. Mocks
and fakes are kept for what this app does not own: Clerk.

| File | Covers |
|---|---|
| `tests/conftest.py` | Fixtures shared by every layer: in-memory database, clients, a user at each board role |
| `tests/unit/test_roles.py` | `role_satisfies` hierarchy and fail-closed; `parse_role` |
| `tests/unit/test_ticket_schemas.py` | `TicketCreate` / `TicketUpdate`: blank titles, priorities, omitted vs null |
| `tests/unit/test_comment_schemas.py` | Comment trimming and the length limit, at the boundary |
| `tests/unit/test_config.py` | Origin lists from the environment: single, comma-separated, JSON |
| `tests/unit/test_user_search_escaping.py` | LIKE wildcards in the user search are escaped |
| `tests/unit/test_clerk_profile.py` | Picking the primary email and display name from a Clerk user |
| `tests/services/test_identity_service.py` | `IdentityService`: adoption, provisioning, the race |
| `tests/api/test_api.py` | Smoke test: `GET /` answers |
| `tests/api/test_auth.py` | `GET /api/users/me`; the 401 boundary |
| `tests/api/test_authorization.py` | The `require_board_role` matrix: 404-not-403, roles, comment ownership |
| `tests/api/test_tickets.py` | Creating a ticket: defaults and rejected fields |
| `tests/api/test_webhook.py` | Signature verification, profile sync, replay |
| `tests/api/test_security_headers.py` | CSP and friends on API responses |

### Coverage

`pytest --cov` prints, per module in `app/`, the lines and branches no test ran
(settings in `backend/.coveragerc`; fully covered files are left out). Read the
*Missing* column as a to-do list, not the percentage as a grade: a line counts
as covered once it has run, whether or not any test checked what it did. That
is also why `pytest tests/unit --cov` looks better than it is — importing a
module "covers" every `def` line in it.

There is deliberately no minimum (`--cov-fail-under`): a floor rewards tests
written to touch lines rather than to pin down behaviour.

### How authentication is faked

`get_current_user` is a FastAPI dependency, so tests swap it for a known user:

```python
def test_viewer_cannot_create_a_ticket(as_user, viewer, board, column):
    response = as_user(viewer).post(
        f"/api/boards/{board.id}/tickets",
        json={"title": "Viewers may not write", "column_id": str(column.id)},
    )
    assert response.status_code == 403
```

`app.dependency_overrides` lives in test code only. The running server never
imports `conftest.py`, so no setting — in `.env` or anywhere else — can switch
this bypass on outside pytest. That is deliberate: an environment flag that
disables auth "for localhost" would ship inside the real server, one stray
config value away from logging every visitor in as the fake user. To call the
*running* API, use a real Clerk token instead (see
[Testing the API by hand](#testing-the-api-by-hand)).

**What this does not cover:** the token-verification path itself —
`authenticate_request`, the `azp` check, the `sub` extraction. Those belong to
the Clerk SDK. The practical consequence is that a misconfigured
`CLERK_AUTHORIZED_PARTIES` will **not** fail the suite; it has to be checked
against a running deployment.

### Why SQLite

The suite builds the whole schema in memory, fresh per test. That works because
the models use SQLAlchemy's dialect-agnostic `Uuid` type — Postgres still gets
a native `uuid` column, and the DDL there is unchanged. The one place the two
dialects had to be named explicitly is the partial index in
`app/database/models/board_member.py`.

---

## Testing the API by hand

This section covers calling the running API directly — Swagger, curl or
Postman — instead of through the board UI. Unlike the automated suite, this
goes through real Clerk auth, so it needs the whole stack up and Clerk keys in
the root `.env` (see the [main README](../../README.md#start-the-app)). The
frontend is still needed once: it is where you sign in to get a token.

---

## Option 1: Swagger UI (recommended)

FastAPI generates interactive docs automatically.

1. Start the stack from the project root: `docker compose up`
   (or run the backend outside Docker — see the main README)
2. Open `http://localhost:8000/docs` in your browser

### Getting a token

Every endpoint requires a Clerk session token; there is no mock-auth bypass.

1. Sign in to the app at http://localhost:5173
2. In that tab's devtools console, run:
   ```js
   await window.Clerk.session.getToken()
   ```
3. In Swagger UI, click **Authorize** (top right)
4. Paste the token — Swagger will include it on all subsequent requests

Tokens are short-lived, so re-run step 2 when requests start returning 401.

Seed users available for testing (all use the `SEED_PASSWORD` from `.env`,
pushed to Clerk by the seed):

| Name | Email |
|---|---|
| Alice Johnson | alice@example.com |
| Bob Smith | bob@example.com |
| Carol White | carol@example.com |

---

## Option 2: curl

```bash
# Token comes from a signed-in browser tab:
#   await window.Clerk.session.getToken()
curl http://localhost:8000/api/boards \
  -H "Authorization: Bearer <paste_token_here>"
```

---

## Option 3: Postman

1. Create a new request
2. To authenticate:
   - Go to the **Authorization** tab
   - Select **Bearer Token**
   - Paste your token (obtained from the browser console as above)

---

## Useful endpoints to test

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/boards` | List all boards for the current user |
| `GET` | `/api/boards/{id}` | Get a single board, with its columns and tickets |
| `POST` | `/api/boards` | Create a board |
| `GET` | `/api/boards/{id}/tickets/{ticket_id}` | Get one ticket, with its comments |
| `POST` | `/api/boards/{id}/tickets` | Create a ticket |
| `GET` | `/api/users/me` | The local user behind your token |

> Full endpoint list is always available at `http://localhost:8000/docs`
