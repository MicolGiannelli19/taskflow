/**
 * Single source of truth for TaskFlow's keyboard shortcuts, in the spirit of
 * `routes.ts`. Listeners match keys through `keyboard.ts`, and the key hints in
 * tooltips, menus and command palette rows render from this list, so they can
 * never disagree. `registry.test.ts` checks every entry against the combos
 * the browser, the OS and screen readers already own (`reserved.ts`).
 *
 * The plan behind these choices: `docs/specs/keyboard-shortcuts.md`.
 */

export type ShortcutScope =
  /** Anywhere in the signed-in app. */
  | "global"
  /** On a board page, with no dialog open. */
  | "board"
  /** While a ticket card has focus. */
  | "ticket-card"
  /** Inside the ticket detail dialog or page. */
  | "ticket-detail";

export interface ShortcutOverride {
  /** A `RESERVED_COMBOS` id this shortcut deliberately takes over. */
  id: string;
  /** Why taking it over is acceptable. Required, so the choice is reviewed. */
  reason: string;
}

export interface ShortcutDefinition {
  id: string;
  /** One or more combos that trigger it, in `combo.ts` syntax. */
  keys: readonly string[];
  label: string;
  scope: ShortcutScope;
  /**
   * True only for shortcuts that must work while typing (⌘Enter to save).
   * Everything else is ignored inside inputs, textareas, the markdown editor
   * and Clerk's components.
   */
  firesInText: boolean;
  overrides?: readonly ShortcutOverride[];
  /** `"planned"`: a candidate from the plan, not wired up yet. */
  status: "live" | "planned";
}

const FOCUSED_WIDGET =
  "Only while a ticket card has focus: moving within a focused widget is the ARIA grid pattern, and the page still scrolls normally everywhere else.";

export const SHORTCUTS = [
  {
    id: "palette.open",
    keys: ["Mod+k"],
    label: "Open command palette",
    scope: "global",
    firesInText: false,
    overrides: [
      {
        id: "chrome-search-k",
        reason: "Command palettes in web apps (Slack, GitHub, Linear) take Ctrl+K; the browser's search stays one click away.",
      },
      { id: "firefox-search-k", reason: "Same convention as Chrome's Ctrl+K." },
    ],
    status: "live",
  },
  {
    id: "sidebar.toggle",
    keys: ["Mod+b"],
    label: "Toggle sidebar",
    scope: "global",
    firesInText: false,
    overrides: [
      {
        id: "firefox-bookmarks-sidebar",
        reason: "Kept from shadcn's sidebar. Firefox users lose the bookmarks-sidebar shortcut while TaskFlow has focus.",
      },
    ],
    status: "live",
  },
  {
    id: "ticket.create",
    keys: ["Mod+Enter"],
    label: "New ticket",
    scope: "board",
    firesInText: false,
    status: "live",
  },
  {
    id: "ticket.open",
    keys: ["Enter", "Space"],
    label: "Open ticket",
    scope: "ticket-card",
    firesInText: false,
    overrides: [{ id: "chrome-scroll-down", reason: `Activates the focused card, like a button. ${FOCUSED_WIDGET}` }],
    status: "live",
  },
  {
    id: "board.focusUp",
    keys: ["ArrowUp"],
    label: "Previous ticket",
    scope: "ticket-card",
    firesInText: false,
    overrides: [{ id: "safari-scroll-up", reason: FOCUSED_WIDGET }],
    status: "live",
  },
  {
    id: "board.focusDown",
    keys: ["ArrowDown"],
    label: "Next ticket",
    scope: "ticket-card",
    firesInText: false,
    overrides: [{ id: "safari-scroll-down", reason: FOCUSED_WIDGET }],
    status: "live",
  },
  {
    id: "board.focusLeft",
    keys: ["ArrowLeft"],
    label: "Previous column",
    scope: "ticket-card",
    firesInText: false,
    overrides: [{ id: "safari-scroll-left", reason: FOCUSED_WIDGET }],
    status: "live",
  },
  {
    id: "board.focusRight",
    keys: ["ArrowRight"],
    label: "Next column",
    scope: "ticket-card",
    firesInText: false,
    overrides: [{ id: "safari-scroll-right", reason: FOCUSED_WIDGET }],
    status: "live",
  },
  {
    id: "board.focusFirst",
    keys: ["Home"],
    label: "First ticket in column",
    scope: "ticket-card",
    firesInText: false,
    overrides: [{ id: "chrome-top", reason: FOCUSED_WIDGET }],
    status: "live",
  },
  {
    id: "board.focusLast",
    keys: ["End"],
    label: "Last ticket in column",
    scope: "ticket-card",
    firesInText: false,
    overrides: [{ id: "chrome-bottom", reason: FOCUSED_WIDGET }],
    status: "live",
  },
  {
    id: "ticket.moveLeft",
    keys: ["Mod+Shift+ArrowLeft"],
    label: "Move ticket to previous column",
    scope: "ticket-card",
    firesInText: false,
    status: "live",
  },
  {
    id: "ticket.moveRight",
    keys: ["Mod+Shift+ArrowRight"],
    label: "Move ticket to next column",
    scope: "ticket-card",
    firesInText: false,
    status: "live",
  },
  {
    id: "ticket.copyLink",
    keys: ["Mod+c"],
    label: "Copy ticket link",
    scope: "ticket-card",
    firesInText: false,
    overrides: [
      {
        id: "macos-copy",
        reason: "Only when a card has focus and no text is selected, where native Copy would copy nothing; Copy keeps working everywhere else.",
      },
      { id: "pc-copy", reason: "Same rule as on macOS." },
    ],
    status: "live",
  },
  {
    id: "ticket.delete",
    keys: ["Mod+Backspace"],
    label: "Delete ticket",
    scope: "ticket-card",
    firesInText: false,
    status: "live",
  },
  {
    id: "ticket.save",
    keys: ["Mod+Enter"],
    label: "Save",
    scope: "ticket-detail",
    firesInText: true,
    status: "live",
  },
] as const satisfies readonly ShortcutDefinition[];

export type ShortcutId = (typeof SHORTCUTS)[number]["id"];

export const SHORTCUT_BY_ID = Object.fromEntries(
  SHORTCUTS.map((s): [ShortcutId, ShortcutDefinition] => [s.id, s])
) as Record<ShortcutId, ShortcutDefinition>;
