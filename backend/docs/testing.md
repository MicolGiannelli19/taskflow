# Testing the API in Isolation

This guide covers how to manually test API endpoints without running the frontend.

---

## Option 1: Swagger UI (recommended)

FastAPI generates interactive docs automatically.

1. Start the backend: `uvicorn app.main:app --reload`
2. Open `http://localhost:8000/docs` in your browser

### Without authentication (mock mode)

By default `USE_MOCK_AUTH=true`, which means all endpoints are accessible without a token — requests are automatically treated as Alice (`a0000000-0000-0000-0000-000000000001`).

Just call any endpoint directly in the Swagger UI — no login required.

### With real JWT authentication

1. Set `USE_MOCK_AUTH=false` in your `.env`
2. In Swagger UI, call `POST /api/auth/token`:
   - **username**: `alice@example.com`
   - **password**: `password123`
   - Leave **scope** and **grant_type** blank
3. Copy the `access_token` from the response
4. Click **Authorize** (top right)
5. Paste the token — Swagger will include it on all subsequent requests

Seed users available for testing (all use password `password123`):

| Name | Email |
|---|---|
| Alice Johnson | alice@example.com |
| Bob Smith | bob@example.com |
| Carol White | carol@example.com |

---

## Option 2: curl

### Mock auth (default)

```bash
curl http://localhost:8000/api/boards
```

### Real JWT auth

```bash
# 1. Get a token
curl -X POST http://localhost:8000/api/auth/token \
  -d "username=alice@example.com&password=password123"

# 2. Copy the access_token from the response, then use it
curl http://localhost:8000/api/boards \
  -H "Authorization: Bearer <paste_token_here>"
```

---

## Option 3: Postman

1. Create a new request
2. To authenticate:
   - Go to the **Authorization** tab
   - Select **Bearer Token**
   - Paste your token (obtained from `POST /api/auth/token` as above)
3. Or use the built-in OAuth2 flow to fetch the token automatically

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
