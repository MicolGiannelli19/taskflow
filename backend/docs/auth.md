# Authentication

Taskflow uses JWT (JSON Web Tokens) for authentication. Credentials are stored separately from user profiles in the `user_identities` table, which supports multiple auth providers per user.

---

## Overview

```
Client                        Backend
  |                              |
  |  POST /api/auth/token        |
  |  { username, password }      |
  | ---------------------------> |
  |                              |  1. Look up user by email
  |                              |  2. Find password identity
  |                              |  3. Verify bcrypt hash
  |                              |  4. Sign JWT with user ID
  |  { access_token }            |
  | <--------------------------- |
  |                              |
  |  GET /api/boards             |
  |  Authorization: Bearer <token>
  | ---------------------------> |
  |                              |  5. Decode JWT → user ID
  |                              |  6. Load user from DB
  |                              |  7. Handle request
  |  { boards }                  |
  | <--------------------------- |
```

---

## Files

| File | Responsibility |
|---|---|
| `app/routers/auth.py` | Register and login endpoints |
| `app/auth_utils.py` | Password hashing and JWT creation |
| `app/dependencies.py` | `get_current_user` — protects routes |

---

## Registration Flow

**Endpoint**: `POST /api/auth/register`

1. Check no existing user has the same email
2. Create a `users` row (profile data only — no password)
3. `db.flush()` to get the new user's ID without committing
4. Create a `user_identities` row with `provider="password"` and the bcrypt-hashed password
5. Commit both rows together in one transaction

```python
new_user = User(email=user.email, name=user.name, avatar=user.avatar)
db.add(new_user)
db.flush()  # get new_user.id before committing

identity = UserIdentity(
    user_id=new_user.id,
    provider="password",
    provider_id=user.email,
    password_hash=get_password_hash(user.password)
)
db.add(identity)
db.commit()
```

> `flush()` sends the SQL to the DB within the current transaction without committing, so the ID is generated and available but the row isn't permanent yet. If the identity insert fails, the whole transaction rolls back.

---

## Login Flow

**Endpoint**: `POST /api/auth/token`

Accepts `application/x-www-form-urlencoded` (OAuth2 standard form) with `username` (email) and `password`.

1. Look up the user by email
2. Look up their `user_identities` row where `provider = 'password'`
3. Verify the submitted password against the stored bcrypt hash
4. If valid, return a signed JWT containing the user's ID

```python
access_token = create_access_token(data={"sub": str(user.id)})
return {"access_token": access_token, "token_type": "bearer"}
```

The JWT payload (`sub`) contains the user's UUID. The token expires after `ACCESS_TOKEN_EXPIRE_MINUTES` (default: 30 minutes).

---

## Protecting Routes

Any route that needs an authenticated user uses the `get_current_user` dependency:

```python
@router.get("/api/boards")
def get_boards(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ...
```

`get_current_user` in `dependencies.py`:
1. Extracts the Bearer token from the `Authorization` header
2. Decodes and validates the JWT signature
3. Reads the `sub` claim to get the user ID
4. Loads and returns the `User` from the database

If the token is missing, expired, or invalid it returns `401 Unauthorized`.

---

## Password Hashing

Passwords are hashed using **bcrypt** via the `passlib` library. Bcrypt is a slow-by-design algorithm that makes brute-force attacks expensive.

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

get_password_hash("mypassword")   # returns "$2b$12$..."
verify_password("mypassword", hash)  # returns True/False
```

Plain-text passwords are never stored.

---

## Development Mode (Mock Auth)

`dependencies.py` has a `USE_MOCK_AUTH` flag (defaults to `true`) that bypasses JWT entirely and returns a hardcoded user:

```python
USE_MOCK_AUTH = os.getenv("USE_MOCK_AUTH", "true").lower() == "true"
MOCK_USER_ID = "550e8400-e29b-41d4-a716-446655440000"
```

> **Known issue**: this mock user ID does not exist in the current seed data. To use mock auth, either update `MOCK_USER_ID` to `a0000000-0000-0000-0000-000000000001` (Alice from seed data) or set `USE_MOCK_AUTH=false` to use real JWT login.

To disable mock auth and use real JWT:

```env
USE_MOCK_AUTH=false
```

---

## Limitations (current MVP)

- **No refresh tokens** — when the access token expires the user must log in again
- **No OAuth providers** — the `user_identities` schema supports Google/GitHub but the login endpoints are not implemented yet
- **No email verification** on registration
- **No password reset** flow
