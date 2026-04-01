# User Story: Refactor Frontend Directory Structure

**As a** developer working on the Taskflow frontend,
**I want** to reorganise `src/` into a pages-based layout with co-located components and shared utilities,
**So that** the codebase is easier to navigate and scale as new features are added.

---

## Acceptance Criteria

### Directory Structure

- [ ] Create `src/pages/Board/` and move `Board.tsx`, `Board.module.css`, `Column.tsx`, `Column.module.css`, `Ticket.tsx`, `Ticket.module.css` into it
- [ ] Create `src/pages/Login/` and move `LogInForm.tsx` into it
- [ ] Create `src/pages/NewTicket/` and move `NewTicketForm.tsx`, `NewTicketForm.module.css` into it
- [ ] Move `Comment.tsx` into `src/pages/Board/` (Board-specific, not shared)
- [ ] Move `Task.tsx` into the appropriate page directory or `src/components/` if shared
- [ ] Keep `src/context/AuthContext.tsx` at the top level as a global context
- [ ] Keep `src/api/axios.ts` at the top level
- [ ] Keep `src/types.ts` at the top level

### Extract Board Logic from App.tsx

- [ ] Create `src/pages/Board/hooks/useBoardData.ts`
- [ ] Move the `useEffect` fetch logic and `columns`/`tickets` state out of `App.tsx` into `useBoardData`
- [ ] `useBoardData` should return `{ columns, tickets }`
- [ ] `Board.tsx` should consume `useBoardData` directly instead of receiving data via props from `App.tsx`

### App.tsx Cleanup

- [ ] `App.tsx` should only contain routing logic after the refactor
- [ ] Remove `columns`, `tickets` state and `fetchBoard` logic from `App.tsx`
- [ ] Remove `handleNewTicket` from `App.tsx` and move it to `NewTicket/` page or `NewTicketForm.tsx`

### Imports

- [ ] All internal imports updated to reflect new file paths
- [ ] No broken imports remain

---

## Proposed Structure

```
src/
  pages/
    Board/
      index.tsx         (was Board.tsx)
      Board.module.css
      Column.tsx
      Column.module.css
      Ticket.tsx
      Ticket.module.css
      Comment.tsx
      hooks/
        useBoardData.ts
    Login/
      index.tsx         (was LogInForm.tsx)
    NewTicket/
      index.tsx         (was NewTicketForm.tsx)
      NewTicketForm.module.css
  components/           # shared/reusable components (none yet)
  context/
    AuthContext.tsx
  api/
    axios.ts
  types.ts
  App.tsx
  App.css
  main.tsx
  index.css
```

---

## Notes

- `Task.tsx` — confirm what this component does before placing it, it may be a leftover or shared component
- Board ID is currently hardcoded in the fetch logic — this is a separate TODO and out of scope for this refactor
