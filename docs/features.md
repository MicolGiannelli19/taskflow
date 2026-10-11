# Features

TaskFlow is a learning project, so this page records the features that go
beyond basic create, read, update and delete (CRUD) work on boards, columns and
tickets. Each entry says what the feature does, how it works and where the code
lives.

- [Authentication with Clerk](#authentication-with-clerk)
- [Clerk webhooks with signature verification](#clerk-webhooks-with-signature-verification)
- [Role-based board permissions](#role-based-board-permissions)
- [Automatic database setup and seeding](#automatic-database-setup-and-seeding)
- [Drag and drop](#drag-and-drop)
- [Server state with React Query and optimistic updates](#server-state-with-react-query-and-optimistic-updates)
- [Markdown editor with live highlighting](#markdown-editor-with-live-highlighting)
- [Ticket permalinks](#ticket-permalinks)
- [Security headers and Content Security Policy](#security-headers-and-content-security-policy)
- [Offline backend test suite](#offline-backend-test-suite)

## Authentication with Clerk

Sign-up, sign-in, passwords and sessions are handled by
[Clerk](https://clerk.com), a hosted authentication service. TaskFlow stores no
passwords of its own.

- **Frontend:** `ClerkProvider` owns the session, and Clerk's prebuilt
  `<SignIn />`, `<SignUp />` and `<UserProfile />` components are mounted at
  `/login`, `/sign-up` and `/profile`. A small bridge hands Clerk's `getToken`
  to the axios instance, which attaches a fresh session token to every API
  request.
- **Backend:** each request's token is verified with Clerk's SDK, including a
  check that it was issued for an allowed frontend origin (the `azp` claim).
- **Identity mapping:** the token identifies a *Clerk* user, but boards and
  tickets reference *TaskFlow* users. `IdentityService` links the two through
  the `user_identities` table. It creates a local user the first time a Clerk
  account appears. If a local user with the same email already exists, such as
  a seeded demo user, the Clerk account takes over that row instead.
  Keeping credentials in `user_identities`, apart from the `users` profile
  table, leaves room for more sign-in providers later.

Code: `frontend/src/hooks/useAuth.ts`, `frontend/src/api/clerkToken.ts`,
`backend/app/dependencies.py`, `backend/app/services/identity_service.py`.
Full explanation: [backend/auth.md](./backend/auth.md).

## Clerk webhooks with signature verification

When a user changes their name or avatar in Clerk, Clerk calls
`POST /api/webhooks/clerk` so the local copy stays up to date. This is the only
public API route: Clerk sends no session token, so the backend checks the
request's [Svix](https://www.svix.com) signature against
`CLERK_WEBHOOK_SIGNING_SECRET` instead. Without that secret, every delivery is
rejected, so a missing setting can never mean an unchecked request.

Code: `backend/app/routers/webhook.py`. Local setup:
[local-development.md](./local-development.md).

## Role-based board permissions

Every board member has one of four roles: `owner`, `admin`, `member` or
`viewer`. Each board route declares the lowest role it needs, through a
reusable FastAPI dependency (`require_board_role`), and the check runs against
the `board_members` table on every request, reads included. A user who is not
a member gets `404 Not Found` rather than `403 Forbidden`, so outsiders can't
even tell that a board exists.

The board settings page lets owners and admins add members, change their roles
and remove them.

Code: `backend/app/core/authorization.py`, `backend/app/dependencies.py`,
`backend/app/services/membership_service.py`,
`frontend/src/pages/Board/Settings/`. Design:
[specs/authorization-data-model.md](./specs/authorization-data-model.md).

## Automatic database setup and seeding

`docker compose up` is the only command needed to get a working app with demo
data:

1. Compose starts Postgres and waits for its health check to pass before
   starting the backend.
2. On startup, the backend creates the tables from the SQLAlchemy models.
3. It then seeds three demo users (Alice, Bob and Carol), a board with four
   columns, six tickets and some comments.
4. The seed also creates the demo users in Clerk, sending bcrypt hashes of
   `SEED_PASSWORD` through Clerk's user import, so the demo accounts can sign
   in straight away.

The seed is safe to run more than once: it does nothing if the data is already
there, and it looks up existing Clerk accounts instead of creating duplicates.
The Clerk step is best-effort. If it fails, the local data is still created, and
the demo users can be claimed by signing up with their email addresses.

Code: `backend/app/seed.py`, `backend/app/main.py`, `docker-compose.yml`.

## Drag and drop

Tickets can be dragged from one column to another. This uses Atlassian's
[Pragmatic drag and drop](https://atlassian.design/components/pragmatic-drag-and-drop/)
library: each ticket card is registered as `draggable`, and each column as a
`dropTargetForElements` that highlights while a ticket is over it. Dropping a
ticket on a new column saves the move through `useMoveTicket` (see the next
section). Reordering tickets within a column and reordering columns are not
built yet.

Code: `frontend/src/pages/Board/componets/Ticket.tsx`,
`frontend/src/pages/Board/componets/Column.tsx`,
`frontend/src/hooks/useMoveTicket.ts`.

## Server state with React Query and optimistic updates

Data from the API is managed by [TanStack React Query](https://tanstack.com/query),
with one hook per operation in `frontend/src/hooks/` (`useBoards`,
`useTicketDetail`, `useUpdateTicket` and so on). After a change, the hook marks
the affected cached data as stale so it is fetched again. This replaced an
earlier approach that refetched everything when a manual counter changed.

Moving a ticket, deleting a board and removing a member use **optimistic
updates**: the screen changes immediately, before the server replies. If the
request fails, the hook puts the previous data back.

Code: `frontend/src/hooks/`, `frontend/src/lib/queryClient.ts`.

## Markdown editor with live highlighting

Ticket descriptions and comments are written in markdown and displayed with
`react-markdown`. The editor highlights markdown syntax as you type, using
`react-simple-code-editor` with [Prism](https://prismjs.com) for the
highlighting. Prism's markdown rules were adjusted so the editor highlights
headings the same way they render: `# Title` is a heading, and `#Title` is not.

Code: `frontend/src/pages/Board/componets/MarkdownEditor.tsx`,
`frontend/src/pages/Board/TicketDetailContent.tsx`.

## Ticket permalinks

Every ticket has its own page at `/board/:boardId/ticket/:ticketId`, and its
title can be clicked to copy that link. Copying uses the browser's Clipboard
API, with a fallback for pages served over plain HTTP, such as the dev server
opened from another device on your network, where that API is unavailable.

Code: `frontend/src/hooks/useCopyLink.ts`,
`frontend/src/pages/Board/componets/CopyableTitle.tsx`,
`frontend/src/pages/Board/TicketPage.tsx`.

## Security headers and Content Security Policy

A Content Security Policy (CSP) tells the browser which scripts, styles and
connections a page may use, which limits the damage an injected script can do.
TaskFlow has two:

- **API responses** carry a strict policy (`default-src 'none'`) along with
  other security headers: `nosniff`, a referrer policy and
  `frame-ancestors 'none'`.
- **The app page** has its own policy, which matters because the app renders
  user-written markdown. It is set in `frontend/csp.ts` and runs in report-only
  mode, which logs violations without blocking them, until it has been checked
  against a live Clerk instance.

Code: `backend/app/core/security_headers.py`, `frontend/csp.ts`,
`frontend/vite.config.ts`. Details: [backend/auth.md](./backend/auth.md).

## Offline backend test suite

The backend has 80 pytest tests that need no Docker, database, Clerk key or
network connection, and run in under a second. The tests swap in a known user
for `get_current_user` and build the schema in an in-memory SQLite database
for each test. Any test that tries to open a network connection fails on
purpose, so nothing can quietly depend on an outside service.

Code: `backend/tests/`. Details: [backend/testing.md](./backend/testing.md).
