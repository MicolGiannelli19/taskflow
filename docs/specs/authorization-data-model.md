# Spec: Authorization-Aware Data Model

**Status:** Draft — in progress
**Author:** Micol
**Last updated:** 2026-07-26

> This is a clean-slate design of TaskFlow's data model with authorization as a
> first-class concern. It intentionally **ignores the current POC schema** and
> designs from requirements. Where a decision was made, the rationale is
> recorded inline so the *why* survives, not just the *what*.

---

## 1. Goals

1. Model users, boards, memberships, columns, tickets, and comments for a
   Jira/Linear-style Kanban app.
2. Make **authorization structural**: who can do what is answered by the schema,
   not scattered through handler code.
3. **Membership is required for all access** — including reads. A user who is
   not a member of a board cannot see it or anything inside it.
4. Keep exactly **one source of truth** for "who can do what on a board."

## 2. Authorization requirements

- Access to a board is granted **only** through membership.
- Membership carries a **role**, and the role determines what the member may do.
- Four roles, most to least privileged: **`owner`**, **`admin`**, **`member`**,
  **`viewer`**.
- A non-member has **no access at all** — reads included. From a non-member's
  perspective, the board does not exist (`404`, not `403`, to avoid leaking
  existence).

---

## 3. Entities & relationships

```
users ──< board_members >── boards ──< columns ──< tickets ──< comments
                                           │            │
                                           └── tickets ─┘ (also FK straight to board)
tickets.assignee_id ─> users
tickets.creator_id  ─> users
comments.user_id    ─> users
```

The heart of the model is `board_members`, the **join table** that makes the
many-to-many relationship between `users` and `boards` real. Each row is a
single membership: "this user is in this board, with this role."

Key idea: **`role` is an attribute of the *relationship*, not of the user or the
board.** Alice can be an `owner` of board A and a `viewer` of board B at the same
time — so the role has to live on the pairing, which is the join row.

---

## 4. Table definitions

> Types shown as Postgres. All PKs are UUIDs. All timestamps are UTC.

### `users`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| email | varchar(255) | unique, not null |
| name | varchar(255) | |
| avatar | varchar(500) | |
| created_at / updated_at | timestamptz | |

### `boards`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | varchar(255) | not null |
| description | text | |
| created_at / updated_at | timestamptz | |

> **No `owner_id` column.** See Decision 1. Ownership lives entirely in
> `board_members`.

### `board_members`  ← the authorization table
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| board_id | uuid FK → boards.id | not null, `ON DELETE CASCADE` |
| user_id | uuid FK → users.id | not null, `ON DELETE CASCADE` |
| role | enum(`owner`,`admin`,`member`,`viewer`) | not null |
| created_at | timestamptz | |

Constraints & indexes:
- `UNIQUE (user_id, board_id) INCLUDE (role)` — enforces one membership per user
  per board, **and** serves both hot queries. Column order is deliberate
  (`user_id` leads) — see §9.
- `INDEX (board_id)` — the mirror-image "who is on this board" access pattern
  (admin member list), which filters by board and so needs `board_id` leading.
- `UNIQUE (board_id) WHERE role = 'owner'` (partial index) — at most one owner
  per board. See Decision 1.

### `columns`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| board_id | uuid FK → boards.id | not null, `ON DELETE CASCADE` |
| name | varchar(255) | not null |
| position | int | ordering within the board |

### `tickets`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| board_id | uuid FK → boards.id | not null, `ON DELETE CASCADE` |
| column_id | uuid FK → columns.id | not null, `ON DELETE CASCADE` |
| title | varchar(255) | not null |
| description | text | |
| position | int | ordering within the column |
| priority | text/enum | TBD |
| assignee_id | uuid FK → users.id | nullable |
| creator_id | uuid FK → users.id | not null |
| due_date | timestamptz | nullable |
| created_at / updated_at | timestamptz | |

### `comments`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| ticket_id | uuid FK → tickets.id | not null, `ON DELETE CASCADE` |
| user_id | uuid FK → users.id | not null (author) |
| body | text | not null |
| created_at / updated_at | timestamptz | |

---

## 5. Authorization model

Every board-scoped request resolves to the **same question**:

> Fetch the `board_members` row for `(current_user, board)`.
> No row → deny (treat as `404`). Otherwise, read `role` and check it against
> the action.

### Permission matrix (draft)

| Action | owner | admin | member | viewer |
|---|:--:|:--:|:--:|:--:|
| View board / tickets / comments | ✅ | ✅ | ✅ | ✅ |
| Create / edit / move / delete tickets | ✅ | ✅ | ✅ | ❌ |
| Create / edit / delete columns | ✅ | ✅ | ✅ | ❌ |
| Comment | ✅ | ✅ | ✅ | ❌ |
| Add / remove members, change roles | ✅ | ✅ | ❌ | ❌ |
| Rename / edit board settings | ✅ | ✅ | ❌ | ❌ |
| Delete board, transfer ownership | ✅ | ❌ | ❌ | ❌ |

> This matrix is the thing to argue about — it's cheaper to move a ✅ here than
> to re-code handlers later.

### 5.1 Enforcement (FastAPI)

**Authentication ≠ authorization.** Authentication ("who are you?") is proven
once at login and carried in the JWT. Authorization ("may *you* do *this* to
*this board*?") is a per-resource, per-action question the token cannot answer —
so it is checked **on every board-scoped request**, live against
`board_members`. Checking live (rather than baking role into the token) means a
demotion or removal takes effect immediately.

The check is written **once** as a reusable dependency and declared by every
route — handlers re-*invoke* it, they never re-implement it:

```python
def require_board_role(min_role: Role):
    def checker(board_id, user=Depends(get_current_user), db=Depends(get_db)) -> BoardMember:
        m = db.query(BoardMember).filter_by(board_id=board_id, user_id=user.id).first()
        if not m:            raise NotFoundError()   # 404 — board is invisible to non-members
        if m.role < min_role: raise ForbiddenError() # 403 — member, but role too weak
        return m
    return checker
```

Because `require_board_role` itself depends on `get_current_user`, FastAPI
resolves **auth first, then authz, then the handler body** automatically.

**Nested resources resolve their `board_id` before checking.** A comment lives
at `POST /tickets/{ticket_id}/comments` with no `board_id` in the path, so the
chain is `comment → ticket.board_id → board_members`. Two options (see Decision
4): resolve the parent inside the dependency (clean URLs, one extra lookup), or
put `board_id` in the URL and **also verify the ticket belongs to that board**
(guards against IDOR). Either way, every board-scoped write — however deeply
nested — must trace back to a membership row.

---

## 6. Design decisions (with rationale)

### Decision 1 — `board_members` is the single source of truth for access; drop `owner_id`

Ownership is `role = 'owner'` on a membership row, **not** a column on `boards`.

**Why:** one place to get authz right (every check is the same lookup against
one table), and the data can't contradict itself (no "owner_id says Alice but
her membership says viewer").

**The trade we accept:** with `owner_id NOT NULL`, the database guaranteed
"exactly one owner" for free. Moving ownership into a join row gives that up, so
we buy back part of it:
- *At most one owner* → partial unique index `UNIQUE (board_id) WHERE role = 'owner'`.
- *At least one owner* → **application invariant**: the owner's membership row is
  inserted in the **same transaction** that creates the board, and the system
  refuses to delete/demote the last owner.

### Decision 2 — reads require membership (`404` for non-members)

A missing membership row is indistinguishable from a missing board to the
caller. This keeps board existence private and means there is one access rule,
not a separate "public read" path.

### Decision 3 — `role` is a constrained set, not free text  *(open — see §7)*

Free-text `role` allows `'amdin'`, `'Owner'`, `'superuser'` — each silently
breaks authz in a different way. The role must be constrained to the four known
values. **Recommended:** a `CHECK (role IN ('owner','admin','member','viewer'))`
constraint — simplest, portable, lives in the table; a native Postgres `ENUM` or
a `roles` lookup table are the heavier alternatives, reserved for if roles later
need to become data or carry their own permission flags. All three push the
guarantee into the DB so no application bug can write a garbage role.
*(mechanism still soft — see §7.)*

### Decision 4 — every board-scoped request is authorized live, via one dependency

See §5.1. Authorization is a per-request check against `board_members`, not a
property of the authenticated session. Nested resources resolve `board_id` from
their parent before checking.

### Decision 5 — index for a **bounded-per-user** access pattern

A user belongs to `< 100` boards regardless of global scale (millions of users,
billions of boards). Every hot query is scoped to that tiny slice, so latency
stays flat as the tables grow — *if* indexes lead with the filtered column. See
§9. No denormalization, sharding, or caching is required to hit this target.

### Decision 6 — cache only within a request; defer cross-request authz caching

Per-request memoization of the membership row is adopted (free, zero staleness
window). Cross-request caching is **deferred** because caching an authorization
decision re-creates the stale-privilege risk we avoided by keeping role out of
the JWT — a stale cache = access that should have been revoked. To keep that
option cheap later, **all membership mutations route through one service
method**, giving invalidation a single home. See §10.

---

## 7. Open decisions

- [ ] **Role integrity mechanism** — leaning `CHECK` (Decision 3); confirm we
      don't need roles-as-data (lookup table) before locking it.
- [ ] **Ticket `priority`** representation (enum vs free text).
- [ ] Whether `admin` can remove/demote the `owner` (matrix currently: no).
- [ ] Invitations / pending memberships, or are members added directly?
- [ ] Do we keep `user_identities` (multi-provider auth) in this model, or is
      auth out of scope for this spec?

---

## 8. Invariants (summary)

1. Every board has **exactly one** `owner` at all times.
2. A user has **at most one** membership row per board.
3. Deleting a board cascades to its memberships, columns, tickets, comments.
4. No board-scoped data is reachable without a membership row.

---

## 9. Scale & indexing

**Target:** millions of users, billions of boards; each user in `< 100` boards.
The bounding fact is per-user fan-out, not table size.

**Hot queries** (both scoped to one user's slice):

```sql
-- list my boards            → < 100 rows
SELECT board_id, role FROM board_members WHERE user_id = :me;
-- authorize an action       → exactly 1 row
SELECT role     FROM board_members WHERE user_id = :me AND board_id = :b;
```

**Why it stays fast at scale:** a B-tree lookup is `O(log N)` to find where the
user's slice begins; then `< 100` contiguous rows are read and the scan stops.
The billions of rows the user doesn't own are never touched — so latency is flat
in table size.

**Index design (the load-bearing detail — column *order*):**
- `UNIQUE (user_id, board_id) INCLUDE (role)` — `user_id` leads, so "list my
  boards" is a contiguous prefix scan and the authz point-lookup is satisfied by
  the same index. `INCLUDE (role)` makes authz an **index-only scan** (no heap
  fetch). An index leading with `board_id` would *not* serve "list my boards".
- `INDEX (board_id)` — separate index for the board→members direction.
- Fetch the resolved boards by **primary key** afterward.

**UUID note:** at billions of rows, random **UUIDv4** PKs fragment index pages
and hurt insert locality. Prefer **time-ordered UUIDv7 / ULID** so inserts append
to the right edge of the B-tree. Schema shape is unchanged — only `id`
generation differs.

**No denormalization / sharding / caching needed** to hit this target; adding
them now would be premature.

---

## 10. Caching & performance

- **Per-request memoization — adopted.** A single request may check authz
  several times (board + columns + tickets + comments). Resolve the membership
  row once in the dependency and pass it down. The request is short-lived, so
  there is no staleness window — pure win.
- **Cross-request authz cache (Redis / in-process) — deferred.** Caching an
  authorization *decision* re-introduces the stale-privilege risk we avoided by
  keeping role out of the JWT: a demoted/removed user with a warm cache keeps
  access they should have lost. The underlying query is already a sub-millisecond
  index-only scan, so a cache saves a round-trip, not computation — only worth it
  once profiling proves the lookup is hot, and only *with* invalidation.
- **Design constraint adopted now (cheap now, expensive to retrofit):** route
  **all** membership mutations (add member, change role, remove member) through a
  single service method, so cache invalidation later has exactly one home.

---

## 11. Board completion & progress bar

**Scope (kept intentionally small):** per-board completion tracking that powers a
progress bar. The cross-board "tickets I've worked on" activity feed and a full
append-only event log are **out of scope for now** (deferred — see §7).

### Current-state completion on `tickets`

Add two nullable columns to `tickets`:

| column | type | notes |
|---|---|---|
| completed_at | timestamptz NULL | `NULL` = not done; a value = done, and *when* |
| completed_by | uuid FK → users NULL | who marked it complete |

`completed_at IS NULL` is the single definition of "done." Completing a ticket
sets both columns; reopening clears both.

> **Decision: snapshot-only, no history table.** These two columns hold only the
> *current* completion state — the latest value, overwritten on reopen. There is
> deliberately **no** stored history of completions (no `ticket_events` table
> yet). This matches what most task apps ship first; a durable event log is added
> only when history becomes a product or audit requirement (§12.1), at which
> point it sits *alongside* this snapshot rather than replacing it.

> **Completion is explicit, not column-derived.** "Done" is the `completed_at`
> flag, **not** "the ticket is in a column named Done." Columns are user-
> renamable and reorderable, so deriving progress from column identity is
> fragile. Keep completion a fact about the ticket itself, independent of where
> it sits.

### The progress-bar query

```sql
SELECT count(*) FILTER (WHERE completed_at IS NOT NULL) AS done,
       count(*)                                         AS total
FROM tickets
WHERE board_id = :board_id;
```

One board's tickets are a bounded set, so this aggregate is cheap. Index:

```sql
CREATE INDEX tickets_board_completed ON tickets (board_id, completed_at);
```

`board_id` leads (the filter); including `completed_at` lets the `FILTER` count
be answered from the index.

### Authorization

The progress bar is board-scoped like everything else: it goes through
`require_board_role(viewer)` (§5.1) — any member, including a `viewer`, may see
progress; a non-member gets `404`. `completed_by` requires `member`+ to set
(viewers can't complete tickets — see the matrix in §5).

### What this deliberately does *not* do

- Stores only the **latest** completion. If a ticket is reopened and re-
  completed, the earlier completion is overwritten, not kept.
- No per-user, cross-board "what have I worked on" history.

Both need the append-only `ticket_events` log; that's a clean additive step
later (current-state columns stay as the fast read path for the progress bar).
These are tracked as future features in §12.

---

## 12. Future features

Deferred by design, recorded here so the limitations are explicit and the growth
path is known. None of these require reworking §11 — the current-state columns
remain the fast read path; each item is *additive*.

### 12.1 Completion timeline (reopen history)

**Known limitation today:** completion is stored as current state only
(`completed_at` / `completed_by` on `tickets`). Reopening a ticket **clears**
those columns, so the fact that it was previously completed — and by whom, and
when — is **overwritten and lost**. The progress bar is correct, but there is no
"done → reopened → done again" trail.

**Future:** an append-only `ticket_events` log (one immutable row per state
transition: `completed`, `reopened`, …) captures the full timeline without
touching the progress-bar read path.

### 12.2 Cross-board "tickets I've worked on" activity feed

Per-user history spanning every board a user has acted on. Also built on
`ticket_events` (indexed by `actor_id, created_at`). Open sub-decisions when it's
picked up:
- **Definition of "worked on"** — completed/assigned only (narrow) vs. any
  touch: moved, commented, edited (broad).
- **History survival** — whether events outlive ticket/board deletion
  (`ON DELETE SET NULL` + denormalized fields) vs. cascade.
- **Authorization** — a user viewing their *own* past activity on a board they
  were later removed from: show the historical fact, gate live ticket contents
  behind current membership.

---

## Appendix A — Consolidated schema (DDL)

Postgres. Reflects every decision above. Not yet applied — this is the design of
record, not a migration.

```sql
-- All PKs are UUID. gen_random_uuid() shown for portability, but prefer
-- app-generated time-ordered UUIDv7 / ULID at scale (Decision 5 / §9).

-- ---------------------------------------------------------------- users
CREATE TABLE users (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email       varchar(255) NOT NULL UNIQUE,
    name        varchar(255),
    avatar      varchar(500),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------- boards
-- No owner_id: ownership is a board_members row with role='owner' (Decision 1).
CREATE TABLE boards (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        varchar(255) NOT NULL,
    description text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------- board_members
-- The authorization table (Decisions 1, 3, 5).
CREATE TABLE board_members (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id    uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    role        varchar(20) NOT NULL
                CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- One membership per (user, board); user_id leads to serve "list my boards"
-- + the authz point-lookup, INCLUDE(role) makes authz an index-only scan (§9).
CREATE UNIQUE INDEX uq_board_members_user_board
    ON board_members (user_id, board_id) INCLUDE (role);

-- At most one owner per board (Decision 1).
CREATE UNIQUE INDEX one_owner_per_board
    ON board_members (board_id) WHERE role = 'owner';

-- board -> members direction (admin member list, §9).
CREATE INDEX idx_board_members_board ON board_members (board_id);

-- -------------------------------------------------------------- columns
CREATE TABLE columns (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id    uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name        varchar(255) NOT NULL,
    position    integer NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_columns_board ON columns (board_id, position);

-- -------------------------------------------------------------- tickets
CREATE TABLE tickets (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id     uuid NOT NULL REFERENCES boards(id)  ON DELETE CASCADE,
    column_id    uuid NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    title        varchar(255) NOT NULL,
    description  text,
    position     integer NOT NULL,
    priority     varchar(20),          -- representation TBD (§7)
    assignee_id  uuid REFERENCES users(id) ON DELETE SET NULL,
    creator_id   uuid NOT NULL REFERENCES users(id),  -- user-deletion policy TBD
    due_date     timestamptz,
    completed_at timestamptz,          -- NULL = not done (§11)
    completed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
-- progress-bar aggregate (§11) and in-column ordering.
CREATE INDEX idx_tickets_board_completed ON tickets (board_id, completed_at);
CREATE INDEX idx_tickets_column          ON tickets (column_id, position);

-- ------------------------------------------------------------- comments
CREATE TABLE comments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES users(id),  -- author
    body        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_ticket ON comments (ticket_id, created_at);
```

**Not yet in this schema (open — §7):** `user_identities` (multi-provider auth),
the `priority` representation, and the `ticket_events` history log (§12).
