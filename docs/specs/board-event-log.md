# Spec: Board Event Log — Ticket Closures

**Status:** Draft — not started
**Author:** Micol
**Last updated:** 2026-09-02

> The database currently stores **state, not history**. Nothing records that a
> ticket was closed, when, by whom, or who was carrying it at the time — a
> ticket's `column_id` only ever says where it is *now*, and `updated_at` is a
> single overwritten scalar with no actor attached.
>
> This spec adds an append-only `board_events` table and emits the first two
> event types into it: **`ticket.closed`** and **`ticket.reopened`**, each
> snapshotting the assignee at the moment of the transition. The table is
> deliberately general so later history features (moves, renames, role changes)
> land in it without a second migration.

---

## 1. Goals

1. Record every ticket closure as a durable, append-only event: **who closed
   it, when, and who was assigned at that moment**.
2. Snapshot the assignee's identity into the event so the record stays truthful
   even after reassignment, or after the assignee's account is deleted.
3. Record the inverse transition (`ticket.reopened`) so "is this ticket closed
   right now" is derivable from the log, and a close→reopen→close cycle reads
   correctly instead of appearing as two unexplained closes.
4. Give `/board/:boardId/history` (currently a `ComingSoon` stub) a real data
   source.
5. Leave room for further event types without a schema change.

## 2. Non-goals

- Logging ticket **moves** between non-terminal columns, edits, column renames,
  or membership changes. The table is shaped for them; this spec does not emit
  them.
- Backfilling history for tickets already sitting in a terminal column. There is
  no data to backfill *from* — the log starts empty and starts being true from
  deploy. See §9.
- Undo / revert from the history feed. The log is a record, not a command queue.
- Per-user activity feeds across boards, or notifications.
- Retention, archival, or pruning policy (§10 flags it as a known gap).

---

## 3. Current state

| Fact | Source |
|---|---|
| No history/audit/event table exists | Live DB — 7 tables: `users`, `user_identities`, `boards`, `board_members`, `columns`, `tickets`, `comments` |
| Ticket edits overwrite in place | `backend/app/services/ticket_service.py:133` — `setattr` loop, then commit |
| `current_user` is available at mutation time but discarded | same, used only for the log line at `:138` |
| All column changes funnel through one endpoint | `PATCH /api/boards/{board_id}/tickets/{ticket_id}` — used by both drag-and-drop (`useMoveTicket.ts`) and the detail modal (`useUpdateTicket.ts`) |
| Service logs name the actor but go to container stdout | unstructured, not queryable, lost on restart |
| History route is stubbed | `frontend/src/router.tsx` → `<ComingSoon title="Board history" />` |

The single funnel is what makes this cheap: one write site covers every way a
ticket can reach a terminal column.

---

## 4. Decision 1 — "Closed" means *the rightmost column*

A ticket is **closed** when it enters the column with the highest `position` on
its board. There is no `status` field and no Close button; in this app, closing
a ticket *is* dragging it to the end.

```sql
-- the terminal column for a board
SELECT id FROM columns
WHERE board_id = :board_id
ORDER BY position DESC, created_at ASC
LIMIT 1
```

`position` is not unique, so the `created_at ASC` tiebreak is required to make
the query deterministic. Ties are otherwise resolved arbitrarily by Postgres and
would make closure detection flap between requests.

**Chosen over** a `columns.is_terminal` flag, an explicit `tickets.closed_at`,
and name-matching on "Done". It needs no schema change on `columns` and no new
UI, and it holds for the default board (`Backlog | In Progress | Done`) and the
seeded one (`… | In Review | Done`).

**Known consequence, accepted:** the definition is positional, so it moves when
the board does.

- Adding any column to the right of "Done" (an "Archive", say) silently makes
  *that* the closing column. "Done" stops emitting closures, with no error and
  no warning.
- Reordering columns changes which column closes tickets, retroactively
  disagreeing with events already written.
- A board with one column means its only column is terminal, so every ticket
  created there is born closed.

Past events are **not** rewritten when this happens — they record what was true
when they fired, which is the point of an event log. But "tickets currently in
the terminal column" and "tickets whose last event was `ticket.closed`" can
drift apart after a reorder. Treat the log as authoritative and derive closed
state from it, not from column position (§7).

**Migration path if this bites:** add `columns.is_terminal boolean default
false`, backfill it to the current rightmost column per board, and swap the
helper in §6.1. No change to `board_events` or anything downstream of it —
that's the whole reason closure detection lives behind one function.

---

## 5. Decision 2 — one general event table, not a closures table

`board_events` is polymorphic: an actor, an entity reference, an action string,
and a JSONB payload. Closures are simply the first `action` values written to
it.

**Why not a typed `ticket_closures` table:** every subsequent history feature
(moves, renames, role changes) would need its own table and its own endpoint,
and the history feed would become a union query across all of them. One table
with an `action` discriminator keeps the feed a single indexed scan.

**The cost, accepted:** `payload` is schemaless, so nothing in the database
stops a malformed event. §6.3 pins the shape per action, and the service is the
only writer.

---

## 6. Backend design

### 6.1 Schema — `board_events`

New model at `backend/app/database/models/board_event.py`, exported from
`app/database/models/__init__.py`.

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `board_id` | uuid | FK → `boards.id` **ON DELETE CASCADE**, not null, indexed |
| `actor_id` | uuid | FK → `users.id` **ON DELETE SET NULL**, nullable |
| `actor_name` | varchar(255) | snapshot — survives the FK going null |
| `entity_type` | varchar(32) | `'ticket'` for now, not null |
| `entity_id` | uuid | **no FK, deliberately** — see below |
| `action` | varchar(64) | `'ticket.closed'` \| `'ticket.reopened'`, not null |
| `payload` | jsonb | not null, default `'{}'` |
| `created_at` | timestamp | not null, default `utcnow` |

Indexes:

```sql
CREATE INDEX ix_board_events_feed   ON board_events (board_id, created_at DESC);
CREATE INDEX ix_board_events_entity ON board_events (entity_type, entity_id, created_at DESC);
```

The first serves the board history feed, the second per-ticket history and the
"is this closed" lookup in §7.

**Why `entity_id` has no foreign key.** Deleting a ticket must not delete the
record that it was once closed — an audit trail that a delete can erase is not
an audit trail. A real FK would force either `CASCADE` (history vanishes) or
`SET NULL` (the event survives but no longer says which ticket it was about).
This is also why the payload denormalizes `ticket_title`: after a delete, the
snapshot is the only readable trace left.

This matters more than it looks. `BoardColumn.tickets` is
`cascade="all, delete-orphan"`, so **deleting the terminal column deletes every
ticket sitting in it.** Events written without an FK survive that; anything
joined to `tickets` would not.

`board_id` cascades on purpose, the opposite call: when a board is deleted the
board is gone, and orphan events for it have no reader and no meaning.

**Append-only** is a service-layer convention — there is no update or delete
path, and nothing else writes to the table. It is *not* enforced by the
database. Optional hardening (out of scope): `REVOKE UPDATE, DELETE ON
board_events` from the app role.

### 6.2 Where events are written

A new `EventService` (`backend/app/services/event_service.py`) owns writes, and
`TicketService` calls it. Two call sites:

**`TicketService.update_ticket`** — the main path. After resolving the target
column and *before* the existing `self.db.commit()`:

```
was_closed = ticket.column_id == terminal_column_id   # captured BEFORE setattr
… existing setattr loop …
is_closed  = ticket.column_id == terminal_column_id   # after

if is_closed and not was_closed:  → emit ticket.closed
if was_closed and not is_closed:  → emit ticket.reopened
```

The insert joins the **existing transaction** — one commit covers the ticket
update and its event. A closure and the record of it can never disagree, and a
failed update writes no event.

**`TicketService.create_ticket`** — a ticket created directly into the terminal
column emits `ticket.closed` with the creator as actor. Without this, a ticket
can sit in Done having never emitted a closure, which breaks the §7 derivation.

Both sites read the terminal column through one helper so Decision 1 has exactly
one implementation:

```python
def terminal_column_id(db: Session, board_id: uuid.UUID) -> uuid.UUID | None
```

Position-only changes within the terminal column, and moves between two
non-terminal columns, emit nothing.

### 6.3 Payload shape

`ticket.closed` and `ticket.reopened` carry the same keys:

```jsonc
{
  "ticket_title":   "Implement auth endpoints",  // snapshot
  "assignee_id":    "…uuid…",   // null when unassigned
  "assignee_name":  "Alice Johnson",             // snapshot, null when unassigned
  "assignee_email": "alice@example.com",         // snapshot; name is nullable on users
  "from_column_id": "…uuid…",
  "from_column_name": "In Review",               // snapshot
  "to_column_id":   "…uuid…",
  "to_column_name": "Done"                       // snapshot
}
```

**`assignee_*` is the answer to "who was assigned when it was closed"** and is
the reason every field here is a copy rather than a join. Reassigning the ticket
tomorrow, renaming the column, or deleting the assignee's account must not
change what this event says happened. `assignee_id` is kept alongside the
snapshot for filtering and grouping ("closures by assignee"), accepting that it
may point at a deleted user.

On `create_ticket`, `from_column_id` / `from_column_name` are `null`.

### 6.4 API

```
GET /api/boards/{board_id}/events
```

- Role: **`VIEWER`** — `Depends(require_board_role(Role.VIEWER))`. Anyone who
  can see the board can see its history; non-members already 404 on the board
  itself.
- Query params: `limit` (default 50, max 100), `cursor` (opaque, the
  `created_at`+`id` of the last row — keyset, not offset), `action` (filter),
  `entity_id` (per-ticket history).
- Ordered `created_at DESC, id DESC`.
- Lives in a new `backend/app/routers/event.py`, registered in `main.py`.

Response — `BoardEventResponse` in `schemas.py`:

```jsonc
{
  "id": "…", "action": "ticket.closed",
  "entity_type": "ticket", "entity_id": "…",
  "actor_id": "…", "actor_name": "Alice Johnson",
  "payload": { … },
  "created_at": "2026-09-02T10:14:03"
}
```

`payload` is passed through as an opaque object; the frontend renders per
`action`.

---

## 7. Deriving "is this ticket closed"

From the log, not from column position (Decision 1 explains why they can drift):

```sql
SELECT action FROM board_events
WHERE entity_type = 'ticket' AND entity_id = :ticket_id
  AND action IN ('ticket.closed', 'ticket.reopened')
ORDER BY created_at DESC, id DESC
LIMIT 1
```

`ticket.closed` → closed. `ticket.reopened` or no rows → open. Served by
`ix_board_events_entity`.

Not needed for v1's feed, but it is what a future "closed tickets" filter or
cycle-time metric should use.

---

## 8. Frontend

Replaces the `ComingSoon` stub at `/board/:boardId/history`.

| File | Role |
|---|---|
| `frontend/src/hooks/useBoardEvents.ts` | `useQuery` → `GET /boards/:id/events`, key `["board-events", boardId]` |
| `frontend/src/pages/Board/History/BoardHistory.tsx` | The feed page |
| `frontend/src/pages/Board/History/BoardHistory.module.css` | Styling, tokens as elsewhere |
| `frontend/src/router.tsx` | Swap `ComingSoon` for `BoardHistory` |

v1 renders a reverse-chronological list, one row per event:

> **`UserAvatar`** **Alice Johnson** closed **Implement auth endpoints**,
> assigned to **Bob Chen** · *2 hours ago*

- Unassigned at close reads "unassigned", not a blank.
- Both actor and assignee render through the existing `UserAvatar`, from the
  snapshotted name/email — no extra user fetch, and it still renders for deleted
  accounts.
- `ticket.reopened` uses the same row with "reopened" and an inverted icon.
- Ticket title links to the ticket. The ticket may be deleted — the link 404s in
  the modal, which is acceptable for v1; the row itself stays readable because
  the title is snapshotted.
- Loading / empty / error states match `BoardSettings.tsx`. Empty text should
  say history starts from when logging was enabled (§9), not "nothing happened".
- Pagination: "Load more" against the keyset cursor. No infinite scroll in v1.

---

## 9. Migration

No Alembic during the MVP — the ORM models are the source of truth and
`Base.metadata.create_all` in the `main.py` lifespan creates missing tables on
boot. Adding `board_events` therefore needs **no migration file**: define the
model, restart the backend, and the table appears. Existing data is untouched.

A full reset stays `docker compose down -v`.

**The log starts empty.** Tickets already in "Done" have no closure event and
will not appear in the feed — the information to backfill them (who moved them,
when, who was assigned then) does not exist anywhere. The seed data is the same:
`seed.py` places a ticket directly into `Done` without going through the
service, so it emits nothing. Either leave it (the feed simply starts at
deploy) or extend the seed to emit a plausible closure event for demo purposes —
recommend leaving it, since a fabricated event in an audit log is worse than an
empty one.

---

## 10. Known gaps

1. **Positional closure definition** — Decision 1's tradeoff. Adding a column to
   the right of the terminal one silently redefines "closed".
2. **No retention policy** — the table grows without bound. Fine at MVP volume;
   revisit before it matters.
3. **Append-only by convention only** — no database-level enforcement (§6.1).
4. **JSONB payload is unvalidated** — the service is the only writer, but
   nothing structural prevents a bad shape.
5. **Only two event types** — everything else in the history feed remains
   unrecorded, exactly as it is today.

---

## 11. Acceptance criteria

### Backend
- [ ] `board_events` table is created on boot with both indexes.
- [ ] Moving a ticket into the rightmost column writes exactly one
      `ticket.closed` event.
- [ ] The event's `actor_id` / `actor_name` is the user who made the request,
      not the assignee.
- [ ] The payload carries `assignee_id`, `assignee_name` and `assignee_email` as
      they were **at the moment of closure**.
- [ ] Closing a ticket with no assignee writes the event with null assignee
      fields — not a skipped event.
- [ ] Moving a closed ticket back out writes exactly one `ticket.reopened`.
- [ ] Close → reopen → close produces three events in order.
- [ ] Moving between two non-terminal columns writes nothing.
- [ ] Reordering within the terminal column writes nothing.
- [ ] A ticket created directly into the terminal column writes `ticket.closed`.
- [ ] A failed ticket update writes no event (same transaction).
- [ ] Deleting the ticket leaves its events intact and readable.
- [ ] Deleting the board deletes its events.
- [ ] Deleting the assignee's account leaves `assignee_name` readable with
      `assignee_id` null.
- [ ] `GET /boards/:id/events` returns newest-first, respects `limit`, and
      paginates by cursor without skipping or repeating rows.
- [ ] A non-member gets 404; a `viewer` gets 200.

### Frontend
- [ ] `/board/:boardId/history` renders the feed instead of `ComingSoon`.
- [ ] Each row names actor, ticket, assignee-at-close and a relative timestamp.
- [ ] Unassigned-at-close renders "unassigned".
- [ ] Loading, empty and error states render.
- [ ] "Load more" appends the next page.

### Tests
`backend/tests/test_events.py` — closure emission, reopen, the no-op cases,
assignee snapshotting, transactional rollback, and endpoint pagination and
permissions.

---

## 12. Open questions

1. **Reopen semantics on the feed** — should a reopen row visually pair with the
   close it undoes, or stand alone? Standalone in v1.
2. **Should `ticket.deleted` land in the same release?** It is the other event
   that destroys information irrecoverably today, and it's a few lines given the
   table exists. Deliberately excluded here to keep this spec to one behaviour.
3. **Relative vs absolute timestamps** — "2 hours ago" reads better in a feed but
   needs a formatter the codebase doesn't have yet (`lib/date.ts` handles date
   inputs only). Absolute dates via the existing `formatJoined` pattern would
   ship faster.
