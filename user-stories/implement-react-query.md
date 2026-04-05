# User Story: Implement React Query for Data Fetching

**As a** developer working on the Taskflow frontend,
**I want** to replace manual `useEffect`/`useState` data fetching with React Query (TanStack Query),
**So that** the app handles caching, background refetching, and mutations efficiently as the number of boards, columns, and tickets grows.

---

## Acceptance Criteria

### Setup

- [ ] Install `@tanstack/react-query`
- [ ] Wrap the app in a `QueryClientProvider` in `main.tsx`
- [ ] Configure a `QueryClient` with sensible defaults (e.g. `staleTime`, `retry`)

### Board Data

- [ ] Replace `useEffect` + `useState` fetch in `Board.tsx` with a `useQuery` hook
- [ ] Query key should include `boardId` so each board has its own cache entry
- [ ] Expose `isLoading` and `error` states from the query and handle them in the UI

### Create Ticket Mutation

- [ ] Replace the `handleNewTicket` POST logic with a `useMutation` hook
- [ ] On mutation success, invalidate the board query so the ticket list updates
- [ ] Handle error state and surface it to the user

### Edit / Delete Ticket Mutations (when built)

- [ ] All future ticket mutations should follow the same pattern: `useMutation` + `invalidateQueries` on success

### General

- [ ] No raw `axios` calls remain inside components — all fetching goes through query/mutation hooks
- [ ] Hooks are co-located in a `hooks/` directory alongside the relevant page (e.g. `src/pages/Board/hooks/`)

---

## Notes

- Avoid `invalidateQueries` on every mutation if data can be updated directly from the mutation response — prefer appending/updating cache for simple creates to reduce unnecessary network requests
- Pagination or infinite scroll for tickets should be considered a follow-up story once React Query is in place — `useInfiniteQuery` supports this natively
- `staleTime` should be set high enough to avoid over-fetching on tab focus for large boards
