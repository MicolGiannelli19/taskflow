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
pytest tests/test_auth.py       # one file
pytest -k authorization         # tests whose name matches a keyword
pytest -x                       # stop at the first failure
pytest -v                       # print each test's name
pytest -p no:warnings           # hide the deprecation-warning summary
```

Without activating the venv: `.venv/bin/python -m pytest`.

The full run takes well under a second. The long warnings summary at the end
(`.dict()`, `datetime.utcnow()`) is deprecation noise, not failures — the line
that matters is `N passed`.

| File | Covers |
|---|---|
| `tests/conftest.py` | Fixtures: in-memory database, clients, a user at each board role |
| `tests/test_api.py` | Smoke test: `GET /` answers |
| `tests/test_auth.py` | `GET /api/auth/me`; the 401 boundary |
| `tests/test_authorization.py` | The `require_board_role` matrix: 404-not-403, role hierarchy, comment ownership |
| `tests/test_identity.py` | `IdentityService`: adoption, provisioning, the race |
| `tests/test_webhook.py` | Signature verification, profile sync, replay |
| `tests/test_security_headers.py` | CSP and friends on API responses |

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
the root `.env` (see the [main README](../../README.md#running-locally)). The
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
| `GET` | `/api/boards/{id}` | Get a single board |
| `POST` | `/api/boards` | Create a board |
| `GET` | `/api/boards/{id}/tickets` | List tickets on a board |
| `POST` | `/api/boards/{id}/tickets` | Create a ticket |

> Full endpoint list is always available at `http://localhost:8000/docs`
