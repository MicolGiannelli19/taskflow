# Frontend Structure

A map of `frontend/src/`: what each folder is for, how the pieces connect, and where new code should go. For styling, see [`ui-system.md`](./ui-system.md). For keyboard shortcuts, see [`../specs/keyboard-shortcuts.md`](../specs/keyboard-shortcuts.md).

---

## The folders at a glance

```
frontend/
├── index.html            # Vite entry: loads src/main.tsx
├── vite.config.ts        # Vite + React + Tailwind plugins, `@/` alias, applies csp.ts
├── csp.ts                # Content-Security-Policy for the app page
├── components.json       # shadcn/ui config (where `npx shadcn add` puts primitives)
└── src/
    ├── main.tsx          # Mounts React and the global providers
    ├── router.tsx        # The route tree
    ├── routes.ts         # Every URL pattern and URL builder, in one place
    ├── App.tsx           # Root layout route (just an <Outlet />)
    ├── types.ts          # Shared TypeScript interfaces (API shapes)
    ├── index.css         # Tailwind import + design tokens (CSS variables)
    │
    ├── api/              # Talking to the backend
    ├── hooks/            # One hook per server operation, plus a few UI hooks
    ├── lib/              # Plain TypeScript helpers (no components)
    ├── components/       # Components shared by more than one page
    └── pages/            # One folder per screen
```

The data flow, top to bottom:

```
pages/ (components)
  → hooks/ (React Query: useQuery / useMutation)
    → api/axios.ts (adds the Clerk token, handles 401)
      → FastAPI at http://localhost:8000/api
```

A component never calls axios directly. It calls a hook, and the hook knows the URL, the cache key and what to refresh afterwards.

---

## 1. Startup: `main.tsx`

`main.tsx` mounts React and wraps the app in its global providers. Each provider can only use the ones above it:

```
<StrictMode>
  <ClerkProvider>              ← owns the sign-in session
    <QueryClientProvider>      ← owns the server-data cache (lib/queryClient.ts)
      <ClerkTokenBridge />     ← passes Clerk's getToken to axios (renders nothing)
      <RouterProvider />       ← picks the page from the URL (router.tsx)
      <ReactQueryDevtools />   ← dev-only cache inspector
```

- **Clerk sits outermost** because everything below needs the session: queries need a token, and route guards need to know whether someone is signed in.
- **`ClerkTokenBridge`** exists because the axios interceptor is plain TypeScript, not a component, so it can't call Clerk's `useAuth()` hook. The bridge is a component that can. It stores `getToken` in `api/clerkToken.ts`, and the interceptor reads it from there.
- If `VITE_CLERK_PUBLISHABLE_KEY` is missing, the app throws at startup with instructions for fetching the key.

To add a new global provider, edit this file. Where it goes depends on what it needs to read.

---

## 2. Routing: `routes.ts` + `router.tsx`

**`routes.ts`** is the single source of truth for URLs. It exports two objects:

- `routePatterns`: the `:param` templates given to the router (`"/board/:boardId"`)
- `paths`: functions that build real URLs for links and `navigate()` (`paths.board(id)`)

Never hand-write a URL string in a component. Use `paths.*`, so changing a URL means editing one file.

**`router.tsx`** builds the route tree with `createBrowserRouter`. It nests layout routes, which are components that render shared UI around an `<Outlet />`:

```
App                              (root layout)
├── /login/*                     LoginPage      ← Clerk <SignIn />, no app shell
├── /sign-up/*                   SignUpPage     ← Clerk <SignUp />, no app shell
└── RequireAuth                  (redirects to /login if signed out)
    └── AppLayout                (sidebar + header)
        ├── /                    Home           ← board list
        ├── /new-board           NewBoardForm
        ├── /board/:boardId      Board
        │   └── new-ticket       NewTicketForm  ← dialog over the board
        ├── /board/:boardId/ticket/:ticketId   TicketPage
        ├── /board/:boardId/history            ComingSoon
        ├── /board/:boardId/settings           BoardSettings
        └── /profile/*           ProfilePage    ← Clerk <UserProfile />
```

- **`RequireAuth`** ([components/RequireAuth.tsx](../../frontend/src/components/RequireAuth.tsx)) does the auth check once for every protected page, so pages don't each check. It remembers where the user was going so sign-in can send them back.
- **`AppLayout`** ([components/layout/AppLayout.tsx](../../frontend/src/components/layout/AppLayout.tsx)) is the signed-in shell: `AppSidebar`, `AppHeader`, and the keyboard-shortcut layer (`ShortcutsProvider`). Pages render inside its `<SidebarInset>`, which is already the page's `<main>`, so pages must not add another `<main>`.
- The Clerk routes end in `/*` because Clerk runs its own sub-pages under them (2FA, email verification and so on).

To add a page: add its pattern and path builder to `routes.ts`, create the page under `pages/`, and register it in `router.tsx`.

---

## 3. Talking to the backend: `api/` and `hooks/`

### `api/`

| File | Role |
|---|---|
| `axios.ts` | The one axios instance. Its request interceptor awaits a Clerk token and sets `Authorization: Bearer …`; its response interceptor sends the browser to `/login` on a 401. |
| `clerkToken.ts` | Holds the `getToken` function that `ClerkTokenBridge` puts there. Returns `null` before Clerk loads or when nobody is signed in. |

The base URL is hard-coded to `http://localhost:8000/api` for now (there's a TODO to move it to an env variable).

### `hooks/`

Server state lives in **React Query**. Each backend operation has its own hook, named after what it does:

| Kind | Examples | Built on |
|---|---|---|
| Reads | `useBoards`, `useBoard`, `useTicketDetail`, `useBoardMembers`, `useUserSearch` | `useQuery` |
| Writes | `useCreateTicket`, `useUpdateTicket`, `useMoveTicket`, `useDeleteBoard`, `useCreateComment`, … | `useMutation` |
| Auth | `useAuth` (the local TaskFlow user), `useBoardPermissions` (your role on a board) | `useQuery` + Clerk |
| UI | `useShortcut`, `useCopyLink`, `useTicketEditor`, `use-mobile` | plain React |

Patterns to follow:

- **Query keys identify cached data.** `["boards"]` is the board list, `["board", boardId]` is one board with its columns and tickets, and `["profile"]` is the signed-in user. A mutation calls `queryClient.invalidateQueries({ queryKey })` on success, so the affected data is fetched again. This replaced the old `refetchKey` counter.
- **Optimistic updates** are used where waiting would feel slow. `useMoveTicket` moves the card in the cache straight away, rolls back if the request fails, and refetches either way.
- **`useAuth()` returns the *local* user**, not the Clerk user. `user.id` is the TaskFlow UUID, which is what `assignee_id`, board members and comment authors store.
- Cache defaults (30 s `staleTime`, one retry, refetch when the window regains focus) are set in `lib/queryClient.ts`.

Use [`useBoards.ts`](../../frontend/src/hooks/useBoards.ts) as the template for a new read and [`useMoveTicket.ts`](../../frontend/src/hooks/useMoveTicket.ts) for a write with an optimistic update.

---

## 4. Pages: `pages/`

One folder per area of the app. Each page owns its layout and padding. Components only that page uses sit next to it, in a local `components/` subfolder.

```
pages/
├── Home/
│   ├── Home.tsx                 # Board list
│   ├── NewBoardForm.tsx
│   └── components/BoardElemnet.tsx
├── Board/
│   ├── Board.tsx                # Loads the board, renders BoardGrid, hosts the new-ticket dialog
│   ├── NewTicketForm.tsx        # Dialog route nested under Board
│   ├── TicketDetail.tsx         # Ticket in a dialog over the board
│   ├── TicketPage.tsx           # The same ticket as a full page (permalink)
│   ├── TicketDetailContent.tsx  # Body shared by the dialog and the page
│   ├── boardFocus.ts            # Keyboard focus helpers for the grid
│   ├── componets/               # BoardGrid, Column, Ticket, Comment, MarkdownEditor, …
│   └── Settings/                # BoardSettings + member management
├── Login/                       # LoginPage, SignUpPage (Clerk components)
├── Profile/ProfilePage.tsx      # Clerk <UserProfile />
└── ComingSoon.tsx               # Placeholder for unbuilt pages
```

Two things worth knowing:

- **Parent pages pass data to child routes with Outlet context.** `Board` renders `<Outlet context={…} />`, and `NewTicketForm` reads `handleNewTicket` and the target column from it (`BoardOutletContext` in `Board.tsx`).
- `pages/Board/componets/` and `BoardElemnet.tsx` are misspelt. Renaming them means updating every import in the same commit.

---

## 5. Shared components: `components/`

```
components/
├── ui/                # shadcn/ui primitives (button, dialog, select, sidebar, …)
├── layout/            # AppLayout, AppSidebar, AppHeader
├── shortcuts/         # ShortcutsProvider, CommandPalette, Kbd, ShortcutTooltip
├── RequireAuth.tsx    # Auth gate (layout route)
├── ClerkTokenBridge.tsx
├── UserAvatar.tsx
└── DueDatePicker.tsx
```

- **`ui/`** holds generated shadcn primitives built on Radix. Treat them as a library: compose them, and avoid editing them. Details are in [`ui-system.md`](./ui-system.md).
- A component moves here from a page folder only when a **second** page needs it.

---

## 6. Helpers: `lib/`

Plain TypeScript with no components.

| File | Role |
|---|---|
| `queryClient.ts` | The React Query client and its defaults |
| `apiError.ts` | `apiErrorMessage(error, fallback)`: shows the backend's human-readable `detail`, falling back to your wording |
| `date.ts` | Converts due dates between API strings, `<input type="date">` values and `Date` objects |
| `utils.ts` | `cn()`, which merges Tailwind class names (used by shadcn) |
| `shortcuts/` | Keyboard shortcut registry, key matching and conflict checks (see below) |

**Keyboard shortcuts** are declared once in `lib/shortcuts/registry.ts`, the same way `routes.ts` declares URLs. Components subscribe with `useShortcut("ticket.create", handler)`, and tooltips and the command palette render their key hints from the same list. `registry.test.ts` fails if a shortcut collides with a combo the browser, OS or a screen reader already uses (`reserved.ts`).

---

## 7. Styling, types and tests

- **Styling**: two systems side by side. Page layouts use CSS Modules (`Home.module.css` next to `Home.tsx`), and shadcn primitives use Tailwind utilities. Colors are CSS variables in `index.css`. See [`ui-system.md`](./ui-system.md).
- **Types**: API response and form shapes live in `src/types.ts` (`BoardSummary`, `TicketTypeSmall`, `UserType`, …). Hooks use them to type the data axios returns.
- **Imports**: `@/` means `src/` (set in `vite.config.ts` and `tsconfig.app.json`). Newer files use it, older ones use relative paths. Both work.
- **Tests**: `yarn test` runs Node's built-in test runner over `src/**/*.test.ts`. There's no test framework and no component tests yet. Today the tests cover the shortcut logic.

---

## Where does new code go?

| I want to… | Put it in |
|---|---|
| Add a page | `pages/<Area>/`, plus its URL in `routes.ts` and its route in `router.tsx` |
| Fetch or change server data | A new hook in `hooks/`, using the shared `instance` from `api/axios.ts` |
| Add a component used by one page | That page's `components/` folder |
| Add a component used by several pages | `components/` |
| Add a basic UI building block (input, menu) | `npx shadcn add …` into `components/ui/` |
| Add a keyboard shortcut | `lib/shortcuts/registry.ts`, then `useShortcut()` where it applies |
| Add a pure helper | `lib/` |
| Add a type for an API response | `types.ts` |
| Add an app-wide provider | `main.tsx` (global) or `AppLayout.tsx` (signed-in pages only) |
