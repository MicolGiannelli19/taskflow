# User Story: Split `app/schemas.py` into a `app/schemas/` package (2026-09-05)

**As a** developer working on the Taskflow backend,
**I want** the Pydantic request/response schemas split one-module-per-entity, mirroring `app/database/models/`,
**So that** the ORM half and the API half of each entity live in the same-shaped place, and feature branches stop colliding in one shared file.

---

## Justification

### 1. It makes the two halves of the codebase symmetrical

`app/database/models/` is already one module per entity (`user.py`, `board.py`,
`ticket.py`, `comment.py`, `column.py`, `board_member.py`, `user_identity.py`) with
a package `__init__.py` that re-exports every name and declares `__all__`.
`app/schemas.py` is the same seven-ish entities in one flat file, separated only by
`# User schemas` / `# Board schemas` comments — i.e. it *already* has the module
boundaries, they're just written as comments instead of files. After this change,
"where does the `Ticket` X live" has one answer for both halves:
`app/database/models/ticket.py` and `app/schemas/ticket.py`.

### 2. The name stays `schemas`, and that matters

Do **not** name this folder `models/`. That word is taken by the SQLAlchemy ORM
classes under `app/database/models/`, and two things called "models" in one backend
is a permanent source of "which import did I mean". `models` = ORM,
`schemas` = Pydantic is the dominant FastAPI convention (it's what the official docs'
SQL tutorial established) and it's what this repo already follows. This story is a
*move*, not a rename.

### 3. The blast radius is zero

All ten call sites import the flat form:

```
app/routers/{auth,board,column,member,ticket,user}.py
app/services/{auth,board,column,ticket}_service.py
    from app.schemas import UserCreate, ...
```

If `app/schemas/__init__.py` re-exports every public name — exactly as
`app/database/models/__init__.py:8-24` does — then **not one of those ten lines
changes**. That's what makes this cheap enough to be worth doing for ergonomics
alone.

### 4. It reduces merge friction on a repo with parallel feature branches

`schemas.py` is a single file that every backend feature touches (the current branch
adds profile + member schemas; the comments story in `todo.md` will add more). One
file touched by every branch is a conflict magnet; entity modules mostly aren't.

### Honest counter-argument

At 210 lines and ~20 classes, `schemas.py` is not in trouble. This is a mirroring and
ergonomics win, not a rescue, and leaving it flat until it's ~400 lines would also be
defensible. The reason to do it now is that the cost is near-zero (point 3) and it
only grows: every schema added before the split is another one to move later.

---

## Acceptance Criteria

### Structure

- [ ] Delete `app/schemas.py`, create the package `app/schemas/`
- [ ] `app/schemas/user.py` — `UserCreate`, `UserProfileUpdate`, `UserResponse`, `UserSuggestion`
- [ ] `app/schemas/board.py` — `BoardCreate`, `BoardUpdate`, `BoardBase`, `BoardWithData`
- [ ] `app/schemas/member.py` — `MemberAdd`, `MemberRoleUpdate`, `MemberResponse`
- [ ] `app/schemas/column.py` — `ColumnCreate`, `ColumnUpdate`, `ColumnResponse`
- [ ] `app/schemas/ticket.py` — `TicketBasic`, `TicketCreate`, `TicketUpdate`, `TicketDetailed`, `AttachmentResponse`
- [ ] `app/schemas/comment.py` — `CommentCreate`, `CommentUpdate`, `CommentResponse`, `COMMENT_MAX_LENGTH`, `_clean_comment`
- [ ] `app/schemas/__init__.py` re-exports every public name above and declares `__all__`, following the docstring + import + `__all__` shape of `app/database/models/__init__.py`

### Imports

- [ ] No call site changes: all ten `from app.schemas import X` lines in `app/routers/` and `app/services/` are untouched by this commit
- [ ] Cross-module schema imports are explicit and acyclic (see dependency order below)
- [ ] No `TYPE_CHECKING` guards, string forward refs, or `model_rebuild()` calls are needed — if one appears to be, a cycle has been introduced and the module split is wrong

### Behaviour

- [ ] `pytest` passes
- [ ] `uvicorn app.main:app` boots and `/docs` renders with the same schema names as before
- [ ] `GET /api/boards/{board_id}` and the ticket detail endpoint return byte-identical JSON to `main`

---

## Proposed Structure

```
app/
  database/
    models/            # SQLAlchemy — unchanged by this story
      __init__.py
      user.py  board.py  ticket.py  comment.py  column.py
      board_member.py   user_identity.py
    session.py
  schemas/             # Pydantic — new package, mirrors the shape above
    __init__.py        # re-exports everything; keeps `from app.schemas import X` working
    user.py
    board.py
    member.py
    column.py
    ticket.py
    comment.py
```

### Module dependency order

The schemas are not independent — two of them compose others:

- `TicketDetailed` → `UserResponse`, `AttachmentResponse`, `CommentResponse` (`schemas.py:142-147`)
- `BoardWithData` → `ColumnResponse`, `TicketBasic` (`schemas.py:163-165`)

So the import direction is fixed, and it is acyclic:

```
user.py, comment.py, column.py, member.py   (leaves — import nothing)
        ↓
ticket.py        (imports user, comment)
        ↓
board.py         (imports column, ticket)
```

Write the modules in that order. If a genuine cycle ever appears later, that's the
signal to add a shared `app/schemas/common.py` — not the signal to reach for forward
refs.

---

## Explicitly Out of Scope

Keep this commit a **pure move** so the diff is reviewable as one — `git log --follow`
and `git diff -M` should show renames, not rewrites. Do not, in this commit:

- **Migrate `class Config: from_attributes = True` → `model_config = ConfigDict(...)`.**
  Every response schema still uses the Pydantic v1-style inner `Config` class, which
  is deprecated in v2. Worth doing — as its own commit, after this one lands.
- **Move `app/database/models/` → `app/models/`.** Most FastAPI projects keep ORM
  models at the app root and reserve `database/` for engine/session wiring alone, so
  the current nesting is the mild outlier (and is arguably why "should schemas go in a
  models folder?" came up at all — the obvious top-level `models/` slot is empty).
  But it's coherent as-is, it touches far more imports than this story does, and it
  buys familiarity rather than function. Separate story if ever.
- **Fix `TicketBasic`'s normalisation TODO** (`schemas.py:79`).
- **Resolve `AttachmentResponse`.** Note for whoever picks this up: it has no ORM
  model, no table, and no producer — `app/routers/ticket.py:44` hardcodes
  `attachments=[]`. It is speculative API surface. Move it to `ticket.py` as-is here;
  decide whether to build it or delete it separately.

---

## Notes

- Suggested sequencing: land the current `board-settings-and-profile-page` work
  first. This refactor touches the same file as the in-flight profile/member schema
  additions, and rebasing a whole-file move across those is needless pain.
- Do it with `git mv`-style discipline (create modules, cut-paste bodies verbatim, no
  reformatting) so review is "did every class land in the right file" and nothing else.

**Priority:** Low — pure ergonomics, nothing is broken today.
**Dependencies:** none blocking; sequencing preference above.
