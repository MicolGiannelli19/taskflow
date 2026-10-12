# Keyboard shortcuts: plan

Status: built (steps 0 and 2 to 8). Step 1, checking by hand in real
browsers, is still to do. Where the build departed from the plan is listed
under [Changes from the plan](#changes-from-the-plan).

## Goal

Every core board action can be done without the mouse, with as few keys to
learn as possible. This follows the Keyboard-first and Low-noise commitments
in `PRODUCT.md`. It works when people use the keyboard without having to think
about which key does what.

## Decisions

| Question | Decision |
|---|---|
| Breadth | Full keyboard path on the board, plus a ⌘K command palette |
| Key style | Modifier combos (⌘ / Ctrl) for actions. No single-letter shortcuts |
| Focus movement | Plain Arrow keys, Enter and Esc, only while a ticket card has focus |
| Discovery | Key hints in tooltips, menus and palette rows. No cheat sheet, no intro popups |
| Palette search | All boards by name, plus tickets on the current board. No search across boards |
| v1 actions | Create, move, edit priority/assignee/due date, copy link, delete, save and close in the detail view |

The palette is context-aware. With a ticket focused, its top section is that
ticket's actions (move to…, priority…, assignee…, due date…, copy link, delete).
Navigation and app actions come below. This means only the most frequent
actions need their own combo; everything else is one ⌘K away.

## How a combo is kept clear of the browser

Every shortcut is listed in `frontend/src/lib/shortcuts/registry.ts`. That
list is meant to drive the listeners, the hints and the palette, so the three
can never disagree. `reserved.ts` lists the combos the browser, the operating
system and screen readers already own. `yarn test` runs `registry.test.ts`,
which fails when:

- a shortcut lands on a reserved combo;
- a shortcut "overrides" a combo the browser keeps anyway (⌘T, ⌘W, ⌘N: the page
  never receives them);
- an override names a combo that doesn't exist or no longer collides (stale);
- two TaskFlow shortcuts share keys in scopes that are live together.

A shortcut may take over a reserved combo only if that combo is marked
`mayOverride` (⌘K, arrows inside a focused widget, Copy through the `copy`
event) **and** the shortcut gives a written `reason`. Text-editing combos
(⌘⇧← selects to line start, ⌥← jumps a word) only count against shortcuts that
fire while typing.

Sources: Chrome's and Safari's official shortcut pages and Apple's macOS
shortcut page, checked on 2026-10-11. Firefox entries are from memory, because
Mozilla's help page blocked automated reading. They are marked
`verified: false` until step 1.

## Current key map

| Action | Keys | Where it works | Status |
|---|---|---|---|
| Command palette | ⌘K / Ctrl+K | Anywhere | live |
| Toggle sidebar | ⌘B / Ctrl+B | Anywhere except text fields | live |
| New ticket | ⌘Enter | Board, in the focused card's column | live |
| Open ticket | Enter, Space | Focused card | live |
| Move focus | ↑ ↓ ← →, Home, End | Focused card | live |
| Move ticket a column | ⇧⌘← / ⇧⌘→ | Focused card | live |
| Copy ticket link | ⌘C (nothing selected) | Focused card | live |
| Delete ticket | ⌘⌫ / Ctrl+Backspace, then confirm | Focused card | live |
| Save | ⌘Enter | Ticket detail, including text fields | live |
| Close | Esc | Dialogs (Radix) | live |

Hints show modifiers in Apple's order on a Mac (⌃⌥⇧⌘, so "⇧⌘←"), and as
"Ctrl+Shift+←" elsewhere.

Combos found to be off limits while making this list: **⌘←** (Back in Chrome on
Mac), **Alt+←** (Back on Windows), **⌘⇧P** (private window in Firefox), **⌘⇧M**
(switch profile in Chrome), any **⌃⌥** combo on Mac (VoiceOver), and **⌥ plus a
letter** on Mac (types a special character).

## Build steps

Each step leaves the app working and `yarn test` passing.

### 0. Reserved list and guard test (done)

`frontend/src/lib/shortcuts/`: `combo.ts` (combo syntax, `Mod` resolved per
platform), `reserved.ts`, `conflicts.ts`, `registry.ts`, `registry.test.ts`.
These files have no DOM dependency, so Node's built-in test runner runs them
directly with no extra package. Node 22.18 or newer is needed.

### 1. Check by hand in real browsers

Automated key presses can skip the browser's own shortcut handling, so this
step needs a real keyboard. Add a dev-only page that logs `keydown` and calls
`preventDefault()`. Then press every combo in the registry in Chrome, Safari and
Firefox on macOS, and on Windows if one is available. For each combo, record one
of:

- **reaches the page, browser stays quiet**: fine;
- **reaches the page, browser acts anyway**: add it to `reserved.ts` with
  `mayOverride: false`;
- **never reaches the page**: same.

Confirm the Firefox entries and set `verified: true`.

**Decision needed:** ⌘B is kept from shadcn's sidebar, which takes away Firefox's
bookmarks-sidebar shortcut while TaskFlow has focus. Keep it, or move it?

### 2. Shortcut runtime

- **One `keydown` listener reads the registry.** The registry stays the only
  place a combo is written.
- **Ignore key presses while typing.** Skip events whose target is an input, a
  textarea, a contenteditable element or a Clerk component, unless the shortcut
  has `firesInText`. Also skip `e.isComposing`, so typing with an input method
  (as for Japanese or Chinese) doesn't trigger anything.
- **Match letters by `e.code` as a fallback.** On non-Latin keyboard layouts,
  `e.key` returns another script, so ⌘K would arrive as ⌘Л.
- **Track which scopes are live:** the board is mounted, a card has focus, a
  dialog is open. Board shortcuts pause while a dialog is open.
- **Detect the platform** from `navigator.userAgentData?.platform`, falling back
  to `navigator.platform`.
- **Move ⌘B onto the runtime.** Remove the listener in
  `components/ui/sidebar.tsx`; this fixes ⌘B firing inside the markdown editor.
  It's an edit to a shadcn file, so note it in `docs/frontend/ui-system.md`.

### 3. Key hints

- **`formatCombo(keys, platform)`** produces "⌘⇧←" on Mac and "Ctrl+Shift+←"
  elsewhere.
- **A `<Kbd>` component** displays it.
- **Add hints where the action already lives:** the sidebar trigger, the
  new-ticket button, the "move →" menu.
- **Hide hints on touch devices.**

### 4. Moving around the board

- **Only one card at a time can be reached with Tab** (the "roving tabindex"
  technique) across `BoardGrid`, `Column` and `Ticket`.
  - ↑/↓ move within a column.
  - ←/→ move between columns, landing on the nearest matching row.
  - Home/End jump to the first or last card in the column.
  - An empty column focuses its "new ticket" option.
- **Focus follows the ticket.** It stays on a ticket after an optimistic move,
  goes to the next card after a delete, and returns to the opening card when the
  dialog closes.
- **Returning to a board refocuses the last ticket you had focused**, kept in
  `sessionStorage` per board.
- **Screen readers hear every move and change** through a live region, e.g.
  "Moved 'Fix login' to In Progress, 3 of 5". Drag and drop should use the same
  messages: check whether `@atlaskit/pragmatic-drag-and-drop-live-region` fits.
- **Move `Ticket.tsx`'s existing Enter/Space handler onto the registry.**

### 5. Actions on a focused card

- **Move:** ⌘⇧←/→ through `useMoveTicket`, which is already optimistic.
- **Copy link:** listen for the `copy` event when a card has focus and nothing is
  selected; reuse `useCopyLink`.
- **Delete:** confirmation dialog, then a new `useDeleteTicket` hook. The
  backend's `DELETE /api/boards/{board_id}/tickets/{ticket_id}` already exists.
- **New ticket:** ⌘Enter opens the new-ticket dialog for the focused column.
  `Board.tsx` currently always uses the backlog column, so the column needs to
  be passed in.
- **Viewers:** shortcuts that change data do nothing on a board where you're a
  viewer, apart from one screen-reader message. Find your role through
  `useBoardMembers` and `useAuth().user.id`.

### 6. Ticket detail

- **⌘Enter saves** the description and comment editors.
- **Esc closes**, which Radix already handles.
- **Every field can be reached by keyboard.**
- **On close, focus returns to the card.**

### 7. Command palette

- **Build it on shadcn's `command` component** (`npx shadcn@latest add command`,
  built on `cmdk`). It's bundled code, so the page's Content Security Policy is
  unaffected.
- **Sections:**
  - actions for the focused ticket;
  - boards by name;
  - tickets on the current board;
  - app actions: new ticket, new board, board settings, toggle sidebar.
- **Every row shows its combo from the registry.**
- **Priority, assignee and due date** open as sub-lists inside the palette.
- **Viewers never see actions that change data.**
- **A quiet "Search ⌘K" control in the header** keeps the palette reachable
  without the shortcut, including on touch screens.
- **States:**
  - empty query: context actions, then recent boards;
  - no results: one line;
  - boards still loading: whatever React Query has cached.

### 8. Docs

Add an entry to `docs/features.md` (what it does, how it works, where the code
lives) plus a line in its list at the top.

## Changes from the plan

- **Matching, not one listener.** Combos still live only in the registry, but
  there is no single global `keydown` listener. `useShortcut` covers the window
  (`global` and `board` scopes); shortcuts tied to a focused element (card,
  editor) call `matchShortcut` in that element's `onKeyDown`. Where the
  listener sits *is* the scope, which is simpler than tracking a scope stack.
- **Copy link uses keydown, not the `copy` event.** Safari fires no `copy`
  event when nothing is selected, so the grid handles ⌘C on a focused card and
  lets it through untouched whenever text is selected.
- **Each column has a quiet "New ticket" button** at the bottom. It is where
  the cursor lands in an empty column, and it creates the ticket in that column.
- **Card notices.** Keyboard actions confirm visibly on the card for 1.8 s
  ("Link copied", "Saved", "View only") as well as to screen readers.
- **The palette lists all boards, not "recent" ones.** Nothing records which
  boards were opened recently yet.
- **Screen readers in browse mode** may read arrow keys instead of sending them
  to the board. The cards describe the keys, and Tab plus the palette always
  work; a full ARIA grid pattern is a possible follow-up.

## Out of scope for v1

- Searching tickets across all boards (needs a backend endpoint scoped by board
  membership).
- A `?` cheat sheet.
- A setting to turn shortcuts off.
- Single-letter shortcuts.
- Changing the visual design.
