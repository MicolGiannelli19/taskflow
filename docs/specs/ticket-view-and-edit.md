# Spec: Ticket View & Edit

**Status:** ✅ Shipped — view and edit both implemented
**Author:** Micol
**Last updated:** 2026-09-19

> Users can open a ticket from the board to see its full details, and edit those
> details in place. The **view** half (a read-only detail modal) is already
> implemented; this spec documents it and defines the **edit** half that builds
> on top of it. The backend already exposes everything needed — no schema or new
> endpoints required.

---

## 1. Goals

1. Let a user open any ticket card and see its full detail (description,
   priority, assignee, reporter, due date, comments) in a modal.
2. Let a user with the right role **edit** a ticket's core fields from that same
   modal, without leaving the board.
3. Reuse the existing `PATCH` endpoint and the React Query patterns already used
   for creating and moving tickets — no bespoke data flow.
4. Keep the board list in sync after an edit (title / priority / assignee shown
   on the card must update).

## 2. Non-goals

- Editing comments, or adding new comments (separate story).
- Editing attachments (not modelled on the frontend yet).
- ~~Rich-text / markdown description editing — plain `<textarea>` for now.~~ Superseded: `MarkdownEditor` shipped, and descriptions and comments both render as markdown.
- Reordering within a column (`position`) via this UI — moving between columns
  already exists through drag-and-drop and the "move →" dropdown.
- Ticket deletion UI (endpoint exists; surface it in a follow-up).

---

## 3. Current state (view — already shipped)

Clicking a ticket card opens a modal with its details. Relevant code:

| File | Role |
|------|------|
| `frontend/src/pages/Board/TicketDetail.tsx` | The modal (Radix `Dialog`), read-only |
| `frontend/src/pages/Board/TicketDetail.module.css` | Modal styling via design tokens |
| `frontend/src/hooks/useTicketDetail.ts` | `useQuery` → `GET /boards/:boardId/tickets/:ticketId`, `enabled` only while open |
| `frontend/src/pages/Board/componets/Ticket.tsx` | Card is clickable/keyboard-activatable; owns `detailOpen` state; move button `stopPropagation`s |
| `frontend/src/types.ts` | `TicketDetailed`, `CommentType` |

The modal fetches on open (query key `["ticket", boardId, ticketId]`) and shows
loading / error states. This spec extends this component with an edit mode.

---

## 4. User stories

**As a** board member,
**I want** to open a ticket and edit its title, description, priority, assignee,
and due date,
**So that** I can keep ticket information accurate without a separate edit screen.

**As a** viewer (read-only member),
**I want** the ticket to stay read-only,
**So that** I don't see controls I'm not allowed to use.

---

## 5. Editable fields

Driven by the existing `TicketUpdate` schema (`backend/app/schemas.py`), which
already accepts each of these as optional:

| Field | Control | Notes |
|-------|---------|-------|
| `title` | single-line text input | required, non-empty after trim |
| `description` | multi-line textarea | optional; empty → `null` |
| `priority` | select (`low` / `medium` / `high`) | reuse `Select` UI component |
| `assignee_id` | select of board members | "Unassigned" → `null`; options from `GET /boards/:id/members` |
| `due_date` | date input | optional; empty → `null` |

`column_id` and `position` are **not** edited here — moving stays with the
existing drag-and-drop / "move →" flow.

---

## 6. Interaction design

- The detail modal has two states: **view** (current) and **edit**.
- An **Edit** button in the modal header switches to edit mode (only rendered
  when the current user's role allows it — see §8). Edit mode renders the same
  fields as form controls, pre-filled from the fetched ticket.
- Edit mode footer: **Save** (primary) and **Cancel**.
  - **Cancel** discards local changes and returns to view mode.
  - **Save** submits a `PATCH`, and on success returns to view mode with fresh
    data.
- Only changed fields are sent in the `PATCH` body (compute a diff against the
  loaded ticket) so we never clobber a field with a stale value.
- The modal must not close while a save is in flight; the Save button shows a
  pending/disabled state.

---

## 7. Data flow

New hook `frontend/src/hooks/useUpdateTicket.ts`, following the shape of
`useMoveTicket.ts`:

```
useMutation({
  mutationFn: (patch) =>
    instance.patch(`/boards/${boardId}/tickets/${ticketId}`, patch),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["ticket", boardId, ticketId] });
    queryClient.invalidateQueries({ queryKey: ["board", boardId] });
  },
})
```

- Invalidating `["ticket", …]` refreshes the modal.
- Invalidating `["board", boardId]` refreshes the card on the board (title /
  priority / assignee are shown there via `TicketTypeSmall`).
- Optimistic update is **optional** for v1 — invalidate-on-success is simpler and
  matches the current pattern; revisit if the round-trip feels slow.
- Assignee options need the board's members. If no members hook exists yet, add
  `useBoardMembers(boardId)` → `GET /boards/:id/members` (backend
  `member.py` already serves `MemberResponse`).

---

## 8. Permissions

- The backend already enforces `require_board_role(Role.MEMBER)` on
  `PATCH /tickets/{id}` — a viewer's edit is rejected server-side (403).
- The frontend must **not show** the Edit button to users who can't edit.
  Determine the current user's role for this board (from the members list /
  membership) and gate the button on `role ∈ {owner, admin, member}`.
- Belt-and-suspenders: if a `PATCH` returns 403, surface an inline error and
  drop back to view mode rather than leaving a broken form.

---

## 9. Validation & errors

- `title` trimmed and required; Save disabled when empty.
- `due_date` sent as an ISO string (backend expects `datetime`); an empty input
  serialises to `null`.
- On mutation error, show an inline message in the modal (reuse the existing
  error styling in `TicketDetail.module.css`) and keep the user in edit mode with
  their changes intact — do not discard input on failure.

---

## 10. Acceptance criteria

### View (done — regression checks)
- [x] Clicking a ticket card opens the detail modal.
- [x] Modal shows title, description, priority, assignee, reporter, due date, comments.
- [x] "move →" and drag-and-drop still work and do not open the modal.

### Edit
- [x] An **Edit** button appears in the modal for members/admins/owners only. (`canEdit`, `EDIT_ROLES` in `useTicketEditor.ts`)
- [x] Edit mode pre-fills title, description, priority, assignee, due date. (`seedForm`)
- [x] Only changed fields are included in the `PATCH` request body. (`buildPatch`)
- [x] Save persists via `PATCH /boards/:boardId/tickets/:ticketId` and returns to view mode. (`useUpdateTicket`)
- [x] After save, both the modal and the board card reflect the new values. (invalidates `['ticket', …]` and `['board', …]`)
- [x] Cancel discards changes and returns to view mode. (`cancelEdit`)
- [x] Save is disabled when `title` is empty; Save shows a pending state while in flight. (`titleValid`, `isSaving`)
- [x] A failed save shows an inline error and preserves the user's edits. (`saveError`)
- [x] Viewers never see the Edit button; a rejected `PATCH` is handled gracefully. Now covered by a test: `test_viewer_cannot_edit_or_delete_a_ticket`.

---

## 11. Open questions

1. **Members hook** — does a board-members query already exist, or do we add
   `useBoardMembers`? (Needed for the assignee dropdown.)
2. **Optimistic vs invalidate** — start with invalidate-on-success; only add
   optimistic updates if latency is noticeable.
3. **Delete** — out of scope here, but the endpoint exists; worth a small
   follow-up story to add a guarded "Delete ticket" action to the same modal.
