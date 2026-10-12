# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TaskFlow is a full-stack Jira-like task management board. The project is a learning vehicle focused on React frontend skills with a FastAPI + PostgreSQL backend.

## Running the Stack

```bash
# Start everything (DB + backend + frontend)
docker compose up

# Rebuild after dependency changes
docker compose up --build
```

Services:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432

Test credentials (from seed data): `alice@example.com` / the `SEED_PASSWORD` from the root `.env`

## Frontend (React + TypeScript + Vite)

```bash
cd frontend
yarn install
yarn dev         # dev server
yarn build       # production build (runs tsc first)
yarn lint        # ESLint
yarn test        # node --test on src/**/*.test.ts (no test framework; Node ≥ 22.18)
```

Keyboard shortcuts are declared once in `src/lib/shortcuts/registry.ts`; `yarn test` fails if one collides with a browser, OS or screen-reader combo listed in `reserved.ts`. Plan: `docs/specs/keyboard-shortcuts.md`.

## Backend (FastAPI + Python)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Tests:
```bash
cd backend
pytest                        # all tests
pytest tests/test_auth.py     # single file
pytest -k authorization       # one topic
```

Tests need no Clerk key, no database and no network: `get_current_user` is
overridden with a known user and the schema is built in SQLite in memory. A
test that opens a socket fails deliberately. See `docs/backend/testing.md`.

## Architecture

### Data Flow

```
React component (useState + useEffect)
  → axios instance (frontend/src/api/axios.ts)
    → awaits a Clerk session token and attaches it via request interceptor
    → redirects to /login on 401 via response interceptor
  → FastAPI router (backend/app/routers/)
    → get_current_user() dependency injects authenticated user
    → SQLAlchemy session queries PostgreSQL
  → Pydantic schema serializes response
```

### Auth

Authentication is delegated to **Clerk**. See `docs/backend/auth.md` for the full picture.

- Backend: `clerk-backend-api` verifies session tokens (`authenticate_request`); no passwords, no local token signing
- Token claim: `sub` = **Clerk** user id (e.g. `user_2abc…`), *not* a TaskFlow UUID
- `IdentityService` exchanges that for the local `users` row via `user_identities` (`provider='clerk'`), provisioning on first sight
- Frontend: `ClerkProvider` owns the session; `useAuth()` still returns the **local** user so `user.id` keeps matching `assignee_id` / `board_members.user_id`
- All protected routes use `Depends(get_current_user)` in FastAPI
- Requires `CLERK_SECRET_KEY` (backend) and `VITE_CLERK_PUBLISHABLE_KEY` (frontend); get them with `npx clerk@latest auth login && npx clerk@latest env pull` in `frontend/`
- `POST /api/webhooks/clerk` is the one **public** route: Clerk sends no session token, so its auth is the Svix signature on the body (`CLERK_WEBHOOK_SIGNING_SECRET`). It keeps the local `name`/`avatar` copy fresh
- Deployment config is environment-driven: `CLERK_AUTHORIZED_PARTIES` (the `azp` allowlist) and `CORS_ALLOWED_ORIGINS`, both comma-separated, both defaulting to `http://localhost:5173`

### Key Files

| File | Purpose |
|------|---------|
| `backend/app/models.py` | SQLAlchemy ORM models |
| `backend/app/schemas/` | Pydantic request/response schemas, one module per entity |
| `backend/app/routers/` | Board, ticket, column, member, user and webhook route handlers |
| `backend/app/dependencies.py` | `get_current_user()` dependency |
| `frontend/src/api/axios.ts` | Axios instance with auth interceptors |
| `frontend/src/hooks/useAuth.ts` | Clerk session + local user record |
| `frontend/src/api/clerkToken.ts` | Bridges Clerk's `getToken` to axios |
| `backend/app/services/identity_service.py` | Clerk account → TaskFlow user |
| `backend/app/routers/webhook.py` | Clerk webhook, verified by signature |
| `backend/app/core/security_headers.py` | CSP + security headers on API responses |
| `backend/tests/conftest.py` | Test fixtures (dependency overrides, in-memory DB) |
| `frontend/csp.ts` | CSP for the app page, applied by `vite.config.ts` |
| `frontend/src/types.ts` | TypeScript interfaces |

### Database Schema

7 tables: `users`, `user_identities` (multi-provider auth), `boards`, `board_members`, `columns`, `tickets`, `comments`. Auth credentials are stored in `user_identities` (separate from the `users` profile table) to support future OAuth providers.

### Frontend Routing

- `/` → board listing (redirects to `/login` if unauthenticated)
- `/login` → Clerk `<SignIn />` (mounted at `/login/*`)
- `/sign-up` → Clerk `<SignUp />` (mounted at `/sign-up/*`)
- `/profile` → Clerk `<UserProfile />` (mounted at `/profile/*`)
- `/new-board` → board creation
- `/board/:boardId` → board view
- `/board/:boardId/new-ticket` → ticket creation (nested route)

### State Management

Server state is **React Query** (`@tanstack/react-query`): one hook per operation in `frontend/src/hooks/` (`useBoards`, `useTicketDetail`, `useUpdateTicket`, …), with the client configured in `frontend/src/lib/queryClient.ts`. Cache invalidation replaced the old `refetchKey` counter. Local UI state still uses `useState`/`useEffect`; auth state lives in Clerk (`ClerkProvider`).

### CORS and security headers

CORS origins come from `CORS_ALLOWED_ORIGINS` (default `http://localhost:5173`), not a literal in `main.py`.

Every API response carries `Content-Security-Policy: default-src 'none'`, `nosniff`, a referrer policy and `frame-ancestors 'none'`. The policy that protects the *app page* — the one behind the markdown renderer — is separate and lives in `frontend/csp.ts`, because a CSP ships with the document and the API does not serve the document. It is report-only until verified against a live Clerk instance; see `docs/backend/auth.md`.

## Documentation

All docs live under the root `docs/` folder (`backend/`, `frontend/`, `specs/`); put new ones there too.

When a change adds or reshapes a feature beyond basic CRUD (a new library, a security mechanism, infrastructure behaviour such as seeding), update `docs/features.md` in the same change: an entry saying what the feature does, how it works and where its code lives, plus a line in the list at the top.
