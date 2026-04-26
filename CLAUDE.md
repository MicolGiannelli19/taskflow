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

Test credentials (from seed data): `alice@example.com` / `password123`

## Frontend (React + TypeScript + Vite)

```bash
cd frontend
yarn install
yarn dev         # dev server
yarn build       # production build (runs tsc first)
yarn lint        # ESLint
```

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
```

## Architecture

### Data Flow

```
React component (useState + useEffect)
  → axios instance (frontend/src/api/axios.ts)
    → adds JWT from localStorage via request interceptor
    → redirects to /login on 401 via response interceptor
  → FastAPI router (backend/app/routers/)
    → get_current_user() dependency injects authenticated user
    → SQLAlchemy session queries PostgreSQL
  → Pydantic schema serializes response
```

### Auth

- Backend: JWT tokens (python-jose), bcrypt passwords (passlib), 30-minute expiry
- Token claim: `sub` = user_id
- Frontend: `AuthProvider` reads localStorage on mount, validates JWT expiry from payload
- All protected routes use `Depends(get_current_user)` in FastAPI

### Key Files

| File | Purpose |
|------|---------|
| `backend/app/models.py` | SQLAlchemy ORM models |
| `backend/app/schemas.py` | Pydantic request/response schemas |
| `backend/app/routers/` | Auth, board, ticket route handlers |
| `backend/app/dependencies.py` | `get_current_user()` dependency |
| `frontend/src/api/axios.ts` | Axios instance with auth interceptors |
| `frontend/src/context/AuthProvider.tsx` | Global auth state + localStorage |
| `frontend/src/types.ts` | TypeScript interfaces |

### Database Schema

7 tables: `users`, `user_identities` (multi-provider auth), `boards`, `board_members`, `columns`, `tickets`, `comments`. Auth credentials are stored in `user_identities` (separate from the `users` profile table) to support future OAuth providers.

### Frontend Routing

- `/` → board listing (redirects to `/login` if unauthenticated)
- `/login` → login form
- `/new-board` → board creation
- `/board/:boardId` → board view
- `/board/:boardId/new-ticket` → ticket creation (nested route)

### State Management

Components use `useState`/`useEffect` directly. Auth state lives in `AuthContext`. Board data is refetched by incrementing a `refetchKey` state variable. React Query is a planned improvement but not yet implemented.

### CORS

Backend allows only `http://localhost:5173`. Update `backend/app/main.py` if the frontend port changes.
