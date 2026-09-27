# 🎫 Ticket View & Edit — Spec

**Status:** 🟢 View shipped · 🟢 Edit shipped
**Author:** Micol · **Updated:** 2026-08-29

> **TL;DR** — Click a ticket → a modal opens with its full details (done ✅).
> Next: add an **Edit** mode to that same modal so members can change the
> title, description, priority, assignee, and due date. Backend already has the
> `PATCH` endpoint — this is frontend-only work.

---

## 1. The whole feature in one picture

```mermaid
flowchart LR
    Card["🗂️ Ticket card<br/>on the board"] -->|click| View["👁️ VIEW modal<br/>read-only details"]
    View -->|"Edit button"| Edit["✏️ EDIT mode<br/>form fields"]
    Edit -->|Save| Save["💾 PATCH → API"]
    Edit -->|Cancel| View
    Save -->|success| View
    Save -->|error| Edit

    style View fill:#E4F3F1,stroke:#008B7F,color:#000
    style Edit fill:#F4F4E0,stroke:#8F9000,color:#000
    style Save fill:#FBE9E5,stroke:#BC3113,color:#000
```

**Two halves:**

| Half | State | What it does |
|------|-------|--------------|
| 👁️ **View** | ✅ Done | Opens a modal, shows everything read-only |
| ✏️ **Edit** | 🟡 To build | Turns the modal into a form, saves changes |

---

## 2. Modal states (view ↔ edit ↔ saving)

```mermaid
stateDiagram-v2
    [*] --> Closed
    Closed --> Loading: click card
    Loading --> View: data arrives
    Loading --> Error: fetch failed
    View --> Edit: click ✏️ Edit
    Edit --> Saving: click 💾 Save
    Edit --> View: click Cancel
    Saving --> View: 200 OK
    Saving --> Edit: error (keep edits)
    View --> Closed: close / Esc
    Error --> Closed: close
```

**Rules that matter:**
- 🔒 Modal **cannot close** while `Saving`.
- 💾 Save is **disabled** if the title is empty.
- ❌ On save error → back to `Edit` with the user's changes **intact** (never wipe input).

---

## 3. What you can edit

Only these five fields. Everything else (moving columns, position) stays with the
existing drag-and-drop + "move →" flow.

```mermaid
flowchart TD
    T["✏️ Editable ticket"] --> A["📝 title — text · required"]
    T --> B["📄 description — textarea · optional"]
    T --> C["🚦 priority — select: low/med/high"]
    T --> D["👤 assignee — select of members · or Unassigned"]
    T --> E["📅 due_date — date · optional"]

    X["🚫 NOT here"] --> F["column_id → drag & drop"]
    X --> G["position → drag & drop"]
    X --> H["comments → separate story"]
```

| Field | Control | Empty means |
|-------|---------|-------------|
| `title` | text input | ⛔ not allowed (required) |
| `description` | textarea | `null` |
| `priority` | select | always set |
| `assignee_id` | member dropdown | `null` (Unassigned) |
| `due_date` | date input | `null` |

---

## 4. Opening a ticket (VIEW — already built)

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant Card as Ticket card
    participant Modal as TicketDetail
    participant Hook as useTicketDetail
    participant API as Backend

    U->>Card: click
    Card->>Modal: open (detailOpen = true)
    Modal->>Hook: fetch (enabled only when open)
    Hook->>API: GET /boards/:b/tickets/:t
    API-->>Hook: TicketDetailed (+ comments)
    Hook-->>Modal: render details
    Modal-->>U: 👁️ read-only view
```

Already-shipped files:

| File | Job |
|------|-----|
| `pages/Board/TicketDetail.tsx` | The modal (read-only) |
| `hooks/useTicketDetail.ts` | `GET` the full ticket |
| `pages/Board/componets/Ticket.tsx` | Card click → opens modal |
| `types.ts` | `TicketDetailed`, `CommentType` |

---

## 5. Saving an edit (EDIT — to build)

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant Modal as TicketDetail (edit)
    participant Hook as useUpdateTicket ✨new
    participant API as Backend
    participant QC as React Query cache

    U->>Modal: change fields, click 💾 Save
    Modal->>Modal: build diff (only changed fields)
    Modal->>Hook: mutate(diff)
    Hook->>API: PATCH /boards/:b/tickets/:t
    API-->>Hook: 200 OK
    Hook->>QC: invalidate ["ticket", b, t]
    Hook->>QC: invalidate ["board", b]
    QC-->>Modal: fresh ticket → VIEW mode
    QC-->>U: card on board updates too
```

**Why invalidate two things?**
- `["ticket", …]` → refreshes the **modal**.
- `["board", b]` → refreshes the **card** on the board (title/priority/assignee show there).

---

## 6. The "diff" — only send what changed

```mermaid
flowchart TD
    Start["User clicks Save"] --> Loop{"for each field"}
    Loop -->|changed| Add["➕ add to PATCH body"]
    Loop -->|same| Skip["skip it"]
    Add --> Done
    Skip --> Done
    Done{"body empty?"} -->|yes| NoOp["do nothing, close"]
    Done -->|no| Send["PATCH with only changed fields"]
```

> 🎯 Sending only changed fields means we never overwrite something with a stale
> value we happened to be holding.

---

## 7. Who's allowed to edit?

```mermaid
flowchart TD
    A["User opens ticket"] --> B{"role on this board?"}
    B -->|owner / admin / member| C["✅ show ✏️ Edit button"]
    B -->|viewer| D["🚫 no Edit button"]
    C --> E{"PATCH accepted?"}
    E -->|200| F["✅ saved"]
    E -->|403| G["⚠️ inline error → back to View"]

    style C fill:#E4F3F1,stroke:#008B7F,color:#000
    style D fill:#FBE9E5,stroke:#BC3113,color:#000
```

- Backend **already enforces** `require_board_role(Role.MEMBER)` on `PATCH`.
- Frontend just **hides** the button for viewers + handles a 403 gracefully.

---

## 8. How the pieces connect

```mermaid
flowchart TD
    subgraph Board
      BG["BoardGrid"] --> Col["Column"] --> Tk["Ticket card"]
    end
    Tk --> Modal["TicketDetail modal"]
    Modal --> RH["useTicketDetail (read)"]
    Modal --> WH["useUpdateTicket ✨ (write)"]
    Modal --> MH["useBoardMembers ✨ (assignee options)"]
    RH --> API["Backend /tickets/:id"]
    WH --> API
    MH --> MAPI["Backend /boards/:id/members"]

    style WH fill:#F4F4E0,stroke:#8F9000,color:#000
    style MH fill:#F4F4E0,stroke:#8F9000,color:#000
```

✨ = new to build. Everything else exists.

---

## 9. Build checklist

**New files**
- [ ] `hooks/useUpdateTicket.ts` — `PATCH` mutation (copy shape of `useMoveTicket.ts`)
- [ ] `hooks/useBoardMembers.ts` — `GET /boards/:id/members` for the assignee dropdown

**Edit `TicketDetail.tsx`**
- [ ] Add `mode` state: `"view" | "edit"`
- [ ] ✏️ Edit button (gated on role) → switch to edit mode
- [ ] Render form fields pre-filled from the ticket
- [ ] 💾 Save (diff + mutate) · Cancel (discard) footer
- [ ] Disable Save when title empty; pending state while saving
- [ ] Inline error on failure, keep edits

**Behaviour**
- [ ] After save: modal + board card both update
- [ ] Viewers never see Edit; 403 handled

---

## 10. Acceptance criteria

### 👁️ View (done — don't regress)
- [x] Click card → modal opens
- [x] Shows title, description, priority, assignee, reporter, due date, comments
- [x] "move →" and drag-and-drop still work, don't open modal

### ✏️ Edit (new)
- [ ] Edit button shows for member/admin/owner only
- [ ] Fields pre-fill correctly
- [ ] Only changed fields sent in `PATCH`
- [ ] Save persists and returns to View
- [ ] Modal **and** board card reflect new values
- [ ] Cancel discards
- [ ] Empty title disables Save; Save shows pending
- [ ] Failed save → inline error, edits preserved
- [ ] Viewer sees no Edit button; 403 handled

---

## 11. Open questions 🤔

1. **Assignee list** — build `useBoardMembers`, or does a members query already exist?
2. **Optimistic updates?** — start with invalidate-on-success (simpler); add optimism only if it feels slow.
3. **Delete ticket** — endpoint exists; add a guarded "Delete" to this modal as a follow-up?

---

## 📎 Reference: field → API mapping

`PATCH /api/boards/{board_id}/tickets/{ticket_id}` — body uses the existing
`TicketUpdate` schema (all fields optional):

```jsonc
{
  "title":       "string",      // required if present, non-empty
  "description": "string|null",
  "priority":    "low|medium|high",
  "assignee_id": "uuid|null",
  "due_date":    "ISO datetime|null"
  // column_id / position: NOT set from this UI
}
```
