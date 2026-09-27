# Testing the API

Two kinds of testing live here: the automated suite, and driving the API by
hand without the frontend.

---

## The automated suite

```bash
cd backend
pytest                          # everything
pytest tests/test_auth.py       # one file
pytest -k authorization         # one topic
```

No Clerk key, no database, and no network are needed — a test that opens a
socket fails on purpose (`no_network` in `conftest.py`).

| File | Covers |
|---|---|
| `tests/conftest.py` | Fixtures: in-memory database, clients, a user at each board role |
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

This section covers how to manually test API endpoints without running the frontend.

---

## Option 1: Swagger UI (recommended)

FastAPI generates interactive docs automatically.

1. Start the backend: `uvicorn app.main:app --reload`
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
