import type { Platform, ResolvedCombo } from "./combo.ts";

/**
 * Key combos that already belong to someone else: the browser, the operating
 * system, or a screen reader. `registry.test.ts` fails if a TaskFlow shortcut
 * lands on one of these without a written reason.
 *
 * What is left out, and why:
 * - Address-bar, tab-strip and Find-bar shortcuts: they only fire while focus
 *   is in the browser's own UI, so the page never sees them.
 * - Finder-only and mouse shortcuts.
 *
 * `verified: true` means the entry was checked against the `source` page
 * (Chrome, Safari and macOS on 2026-10-11). Firefox entries are from memory
 * because Mozilla's help page blocked automated reading; confirm them by hand
 * and flip the flag. Windows-only system shortcuts (the Windows key) are
 * covered by a family rule below rather than listed one by one.
 */

/** `"os"` covers Windows and Linux desktops, where no single vendor list was checked. */
export type ReservedOwner = "chrome" | "safari" | "firefox" | "macos" | "os" | "voiceover";

export interface ReservedCombo {
  /** Stable id that a shortcut names in its `overrides` list. */
  id: string;
  /** Same syntax as shortcut combos; `Mod` resolves per platform. */
  keys: string;
  platforms: readonly Platform[];
  owner: ReservedOwner;
  action: string;
  /**
   * `"text"`: only applies while typing in a text field (word-jumping,
   * select-to-line-end). It conflicts only with shortcuts that also fire while
   * typing. `"always"`: applies wherever focus is.
   */
  context: "always" | "text";
  /**
   * True only where a page *can* take the combo over and doing so is an
   * accepted web-app convention (⌘K for a palette, arrows inside a focused
   * widget). False means the browser keeps it, or nobody has shown it is safe
   * to take: treat it as off limits.
   */
  mayOverride: boolean;
  source: string;
  verified: boolean;
}

/** A whole family of combos owned by one party, such as every ⌃⌥ combo on a Mac. */
export interface ReservedFamily {
  id: string;
  platforms: readonly Platform[];
  owner: ReservedOwner;
  action: string;
  matches: (c: ResolvedCombo) => boolean;
  source: string;
  verified: boolean;
}

const CHROME = "https://support.google.com/chrome/answer/157179";
const SAFARI = "https://support.apple.com/guide/safari/keyboard-shortcuts-and-gestures-cpsh003/mac";
const MACOS = "https://support.apple.com/en-us/102650";
const FIREFOX = "https://support.mozilla.org/kb/keyboard-shortcuts-perform-firefox-tasks-quickly";
const VOICEOVER = "https://support.apple.com/guide/voiceover/welcome/mac";

const ALL: readonly Platform[] = ["mac", "windows", "linux"];
const MAC: readonly Platform[] = ["mac"];
const PC: readonly Platform[] = ["windows", "linux"];

type Defaults = Pick<ReservedCombo, "owner" | "source" | "verified">;

/** Build entries for one owner: `[id, keys, platforms, action, options?]`. */
function group(
  defaults: Defaults,
  rows: ReadonlyArray<
    readonly [
      id: string,
      keys: string,
      platforms: readonly Platform[],
      action: string,
      options?: Partial<Pick<ReservedCombo, "context" | "mayOverride">>,
    ]
  >,
): ReservedCombo[] {
  return rows.map(([id, keys, platforms, action, options]) => ({
    ...defaults,
    id,
    keys,
    platforms,
    action,
    context: options?.context ?? "always",
    mayOverride: options?.mayOverride ?? false,
  }));
}

const digits = (prefix: string, owner: string, platforms: readonly Platform[]) =>
  Array.from({ length: 9 }, (_, i) =>
    [`${owner}-tab-${i + 1}`, `${prefix}+${i + 1}`, platforms, `Jump to tab ${i + 1}`] as const,
  );

const chrome = group({ owner: "chrome", source: CHROME, verified: true }, [
  // Tabs and windows. The browser keeps these; preventDefault does nothing.
  ["chrome-new-window", "Mod+n", ALL, "Open a new window"],
  ["chrome-new-incognito", "Mod+Shift+n", ALL, "Open a new Incognito window"],
  ["chrome-new-tab", "Mod+t", ALL, "Open a new tab"],
  ["chrome-reopen-tab", "Mod+Shift+t", ALL, "Reopen closed tabs"],
  ["chrome-close-tab", "Mod+w", ALL, "Close the current tab"],
  ["chrome-close-window", "Mod+Shift+w", ALL, "Close the current window"],
  ["chrome-next-tab", "Ctrl+Tab", PC, "Go to the next tab"],
  ["chrome-prev-tab", "Ctrl+Shift+Tab", PC, "Go to the previous tab"],
  ["chrome-next-tab-pgdn", "Ctrl+PageDown", PC, "Go to the next tab"],
  ["chrome-prev-tab-pgup", "Ctrl+PageUp", PC, "Go to the previous tab"],
  ["chrome-next-tab-mac", "Meta+Alt+ArrowRight", MAC, "Go to the next tab"],
  ["chrome-prev-tab-mac", "Meta+Alt+ArrowLeft", MAC, "Go to the previous tab"],
  ["chrome-move-tab-left", "Ctrl+Shift+PageUp", ALL, "Move the current tab left"],
  ["chrome-move-tab-right", "Ctrl+Shift+PageDown", ALL, "Move the current tab right"],
  ...digits("Mod", "chrome", ALL),
  ["chrome-back", "Alt+ArrowLeft", PC, "Go back in history"],
  ["chrome-forward", "Alt+ArrowRight", PC, "Go forward in history"],
  ["chrome-back-mac", "Meta+ArrowLeft", MAC, "Go back in history"],
  ["chrome-forward-mac", "Meta+ArrowRight", MAC, "Go forward in history"],
  ["chrome-back-bracket", "Meta+[", MAC, "Go back in history"],
  ["chrome-forward-bracket", "Meta+]", MAC, "Go forward in history"],
  ["chrome-home-page", "Alt+Home", PC, "Open the home page"],
  ["chrome-home-page-mac", "Meta+Shift+h", MAC, "Open the home page"],
  ["chrome-close-tab-f4", "Ctrl+F4", PC, "Close the current tab"],
  ["chrome-close-window-f4", "Alt+F4", PC, "Close the current window"],
  ["chrome-minimise", "Meta+m", MAC, "Minimise the window"],
  ["chrome-hide", "Meta+h", MAC, "Hide Chrome"],
  ["chrome-quit", "Meta+q", MAC, "Quit Chrome"],

  // Browser features.
  ["chrome-menu-f", "Alt+f", PC, "Open the Chrome menu"],
  ["chrome-menu-e", "Alt+e", PC, "Open the Chrome menu"],
  ["chrome-bookmarks-bar", "Mod+Shift+b", ALL, "Show or hide the bookmarks bar"],
  ["chrome-bookmark-manager", "Ctrl+Shift+o", PC, "Open the Bookmark Manager"],
  ["chrome-bookmark-manager-mac", "Meta+Alt+b", MAC, "Open the Bookmark Manager"],
  ["chrome-settings", "Meta+,", MAC, "Open Settings"],
  ["chrome-history", "Ctrl+h", PC, "Open History"],
  ["chrome-history-mac", "Meta+y", MAC, "Open History"],
  ["chrome-downloads", "Ctrl+j", PC, "Open Downloads"],
  ["chrome-downloads-mac", "Meta+Shift+j", MAC, "Open Downloads"],
  ["chrome-task-manager", "Shift+Escape", PC, "Open the Chrome Task Manager"],
  ["chrome-toolbar-focus", "Shift+Alt+t", PC, "Focus the toolbar"],
  ["chrome-find", "Mod+f", ALL, "Open the Find bar"],
  ["chrome-find-next", "Mod+g", ALL, "Next Find match"],
  ["chrome-find-prev", "Mod+Shift+g", ALL, "Previous Find match"],
  ["chrome-find-selection", "Meta+e", MAC, "Search for the selected text"],
  ["chrome-devtools", "Ctrl+Shift+j", PC, "Open Developer Tools"],
  ["chrome-devtools-mac", "Meta+Alt+i", MAC, "Open Developer Tools"],
  ["chrome-console-mac", "Meta+Alt+j", MAC, "Open the JavaScript Console"],
  ["chrome-clear-data", "Ctrl+Shift+Delete", PC, "Delete browsing data"],
  ["chrome-clear-data-mac", "Meta+Shift+Backspace", MAC, "Delete browsing data"],
  ["chrome-switch-profile", "Mod+Shift+m", ALL, "Switch user or browse as Guest"],
  ["chrome-feedback", "Alt+Shift+i", PC, "Open a feedback form"],
  ["chrome-feedback-mac", "Meta+Alt+Shift+i", MAC, "Open a feedback form"],
  ["chrome-inactive-dialogs", "Alt+Shift+a", PC, "Focus inactive dialogs"],
  ["chrome-inactive-dialogs-mac", "Meta+Alt+Shift+a", MAC, "Focus inactive dialogs"],
  ["chrome-split-view", "Shift+Alt+n", PC, "Open split view"],
  ["chrome-split-view-mac", "Meta+Alt+n", MAC, "Open split view"],
  ["chrome-cycle-dialogs-up", "Meta+Alt+ArrowUp", MAC, "Cycle focus through dialogs and toolbars"],
  ["chrome-cycle-dialogs-down", "Meta+Alt+ArrowDown", MAC, "Cycle focus through dialogs and toolbars"],
  ["chrome-address-bar", "Mod+l", ALL, "Jump to the address bar"],
  ["chrome-address-bar-alt", "Alt+d", PC, "Jump to the address bar"],
  // Command palettes in web apps (Slack, GitHub, Linear) take Ctrl+K.
  ["chrome-search-k", "Ctrl+k", PC, "Search from anywhere on the page", { mayOverride: true }],
  ["chrome-search-e", "Ctrl+e", PC, "Search from anywhere on the page"],
  ["chrome-search-web-mac", "Meta+Alt+f", MAC, "Search the web"],

  // The current page.
  ["chrome-print", "Mod+p", ALL, "Print"],
  ["chrome-page-setup-mac", "Meta+Alt+p", MAC, "Page Setup"],
  ["chrome-save", "Mod+s", ALL, "Save the page"],
  ["chrome-reload", "Ctrl+r", PC, "Reload"],
  ["chrome-hard-reload", "Mod+Shift+r", ALL, "Reload, ignoring the cache"],
  ["chrome-stop", "Escape", ALL, "Stop the page loading", { mayOverride: true }],
  ["chrome-open-file", "Mod+o", ALL, "Open a file"],
  ["chrome-view-source", "Ctrl+u", PC, "View page source"],
  ["chrome-view-source-mac", "Meta+Alt+u", MAC, "View page source"],
  ["chrome-email-link-mac", "Meta+Shift+i", MAC, "Email a link to the page"],
  ["chrome-bookmark", "Mod+d", ALL, "Bookmark the page"],
  ["chrome-bookmark-all", "Mod+Shift+d", ALL, "Bookmark all open tabs"],
  ["chrome-zoom-in", "Mod+Plus", ALL, "Zoom in"],
  ["chrome-zoom-in-equals", "Mod+=", ALL, "Zoom in"],
  ["chrome-zoom-out", "Mod+-", ALL, "Zoom out"],
  ["chrome-zoom-reset", "Mod+0", ALL, "Reset zoom"],
  // Scrolling keys: a focused widget (a grid, a listbox) may take these over.
  ["chrome-scroll-down", "Space", ALL, "Scroll down one screen", { mayOverride: true }],
  ["chrome-scroll-up", "Shift+Space", ALL, "Scroll up one screen", { mayOverride: true }],
  ["chrome-page-down", "PageDown", PC, "Scroll down one screen", { mayOverride: true }],
  ["chrome-page-up", "PageUp", PC, "Scroll up one screen", { mayOverride: true }],
  ["chrome-top", "Home", PC, "Go to the top of the page", { mayOverride: true }],
  ["chrome-bottom", "End", PC, "Go to the bottom of the page", { mayOverride: true }],

  // Text fields.
  ["chrome-word-left", "Ctrl+ArrowLeft", PC, "Previous word", { context: "text" }],
  ["chrome-word-right", "Ctrl+ArrowRight", PC, "Next word", { context: "text" }],
  ["chrome-delete-word", "Ctrl+Backspace", PC, "Delete the previous word", { context: "text" }],
]);

const safari = group({ owner: "safari", source: SAFARI, verified: true }, [
  ["safari-scroll-up", "ArrowUp", MAC, "Scroll up", { mayOverride: true }],
  ["safari-scroll-down", "ArrowDown", MAC, "Scroll down", { mayOverride: true }],
  ["safari-scroll-left", "ArrowLeft", MAC, "Scroll left", { mayOverride: true }],
  ["safari-scroll-right", "ArrowRight", MAC, "Scroll right", { mayOverride: true }],
  ["safari-scroll-up-large", "Alt+ArrowUp", MAC, "Scroll up in larger steps", { mayOverride: true }],
  ["safari-scroll-down-large", "Alt+ArrowDown", MAC, "Scroll down in larger steps", { mayOverride: true }],
  ["safari-scroll-top", "Meta+ArrowUp", MAC, "Scroll to the top", { mayOverride: true }],
  ["safari-scroll-bottom", "Meta+ArrowDown", MAC, "Scroll to the bottom", { mayOverride: true }],
  ["safari-next-clickable", "Alt+Tab", MAC, "Highlight the next clickable item"],
  ["safari-search-field", "Meta+l", MAC, "Select the Smart Search field"],
  ["safari-find", "Meta+f", MAC, "Search the page"],
  ["safari-print", "Meta+p", MAC, "Print"],
  ["safari-tab-overview", "Meta+Shift+\\", MAC, "Show tab overview"],
  ["safari-next-tab", "Ctrl+Tab", MAC, "Go to the next tab"],
  ["safari-prev-tab", "Ctrl+Shift+Tab", MAC, "Go to the previous tab"],
  ["safari-next-tab-bracket", "Meta+Shift+]", MAC, "Go to the next tab"],
  ["safari-prev-tab-bracket", "Meta+Shift+[", MAC, "Go to the previous tab"],
  ...digits("Meta", "safari", MAC),
  ["safari-close-tab", "Meta+w", MAC, "Close the active tab"],
  ["safari-reopen", "Meta+Shift+t", MAC, "Reopen the last closed tab or window"],
  ["safari-home-page", "Meta+Shift+h", MAC, "Go to the homepage"],
  ["safari-settings", "Meta+,", MAC, "Open Safari settings"],
  ["safari-back", "Meta+[", MAC, "Go back"],
  ["safari-forward", "Meta+]", MAC, "Go forward"],
  ["safari-zoom-in", "Meta+Plus", MAC, "Zoom in"],
  ["safari-zoom-out", "Meta+-", MAC, "Zoom out"],
  ["safari-switch-window", "Meta+`", MAC, "Switch Safari window"],
  ["safari-reading-list", "Ctrl+Meta+2", MAC, "Show or hide the Reading List"],
  ["safari-reading-list-add", "Meta+Shift+d", MAC, "Add the page to the Reading List"],
  ["safari-reader", "Meta+Shift+r", MAC, "Open Reader"],
  ["safari-bookmarks-sidebar", "Ctrl+Meta+1", MAC, "Show or hide the Bookmarks sidebar"],
]);

const firefox = group({ owner: "firefox", source: FIREFOX, verified: false }, [
  ["firefox-private-window", "Mod+Shift+p", ALL, "Open a private window"],
  // Command palettes take this one too.
  ["firefox-search-k", "Mod+k", ALL, "Focus the search bar", { mayOverride: true }],
  // Editors (Google Docs, this app's sidebar) already take Ctrl/⌘+B.
  ["firefox-bookmarks-sidebar", "Mod+b", ALL, "Show the bookmarks sidebar", { mayOverride: true }],
  ["firefox-history-library", "Mod+Shift+h", ALL, "Open the history library"],
  ["firefox-history-sidebar", "Ctrl+h", PC, "Show the history sidebar"],
  ["firefox-add-ons", "Mod+Shift+a", ALL, "Open Add-ons"],
  ["firefox-downloads", "Ctrl+j", PC, "Open Downloads"],
  ["firefox-clear-history", "Ctrl+Shift+Delete", PC, "Clear recent history"],
  ["firefox-clear-history-mac", "Meta+Shift+Backspace", MAC, "Clear recent history"],
  ["firefox-devtools", "Ctrl+Shift+i", PC, "Open Developer Tools"],
  ["firefox-web-console", "Mod+Shift+k", ALL, "Open the Web Console"],
]);

const macos = group({ owner: "macos", source: MACOS, verified: true }, [
  // System-wide: the OS takes these before the browser.
  ["macos-spotlight", "Meta+Space", MAC, "Spotlight"],
  ["macos-spotlight-finder", "Meta+Alt+Space", MAC, "Spotlight in Finder"],
  ["macos-character-viewer", "Ctrl+Meta+Space", MAC, "Character Viewer"],
  ["macos-full-screen", "Ctrl+Meta+f", MAC, "Toggle full screen"],
  ["macos-app-switcher", "Meta+Tab", MAC, "Switch apps"],
  ["macos-window-switcher", "Meta+`", MAC, "Switch windows of the app"],
  ["macos-prev-window", "Meta+Shift+`", MAC, "Previous window of the app"],
  ["macos-screenshot-3", "Meta+Shift+3", MAC, "Screenshot"],
  ["macos-screenshot-4", "Meta+Shift+4", MAC, "Screenshot"],
  ["macos-screenshot-5", "Meta+Shift+5", MAC, "Screenshot or recording"],
  ["macos-siri-6", "Meta+Shift+6", MAC, "Siri actions"],
  ["macos-siri-space", "Meta+Shift+Space", MAC, "Siri actions"],
  ["macos-lock", "Ctrl+Meta+q", MAC, "Lock the screen"],
  ["macos-log-out", "Meta+Shift+q", MAC, "Log out"],
  ["macos-input-source", "Ctrl+Space", MAC, "Switch input source"],
  ["macos-input-source-alt", "Ctrl+Alt+Space", MAC, "Switch input source"],
  ["macos-mission-control", "Ctrl+ArrowUp", MAC, "Mission Control"],
  ["macos-app-windows", "Ctrl+ArrowDown", MAC, "Show the app's windows"],
  ["macos-force-quit", "Meta+Alt+Escape", MAC, "Force quit"],
  ["macos-hide-others", "Meta+Alt+h", MAC, "Hide other apps"],
  ["macos-minimise-all", "Meta+Alt+m", MAC, "Minimise all windows"],
  ["macos-help-menu", "Meta+Shift+/", MAC, "Open the Help menu"],

  // Edit commands. A page may take Copy only when nothing is selected.
  ["macos-cut", "Meta+x", MAC, "Cut"],
  ["macos-copy", "Meta+c", MAC, "Copy", { mayOverride: true }],
  ["macos-paste", "Meta+v", MAC, "Paste"],
  ["macos-undo", "Meta+z", MAC, "Undo"],
  ["macos-redo", "Meta+Shift+z", MAC, "Redo"],
  ["macos-select-all", "Meta+a", MAC, "Select all"],

  // Text fields.
  ["macos-bold", "Meta+b", MAC, "Bold", { context: "text" }],
  ["macos-italic", "Meta+i", MAC, "Italic", { context: "text" }],
  ["macos-underline", "Meta+u", MAC, "Underline", { context: "text" }],
  ["macos-add-link", "Meta+k", MAC, "Add a link", { context: "text" }],
  ["macos-doc-start", "Meta+ArrowUp", MAC, "Start of document", { context: "text" }],
  ["macos-doc-end", "Meta+ArrowDown", MAC, "End of document", { context: "text" }],
  ["macos-line-start", "Meta+ArrowLeft", MAC, "Start of line", { context: "text" }],
  ["macos-line-end", "Meta+ArrowRight", MAC, "End of line", { context: "text" }],
  ["macos-word-left", "Alt+ArrowLeft", MAC, "Previous word", { context: "text" }],
  ["macos-word-right", "Alt+ArrowRight", MAC, "Next word", { context: "text" }],
  ["macos-select-doc-start", "Meta+Shift+ArrowUp", MAC, "Select to start of document", { context: "text" }],
  ["macos-select-doc-end", "Meta+Shift+ArrowDown", MAC, "Select to end of document", { context: "text" }],
  ["macos-select-line-start", "Meta+Shift+ArrowLeft", MAC, "Select to start of line", { context: "text" }],
  ["macos-select-line-end", "Meta+Shift+ArrowRight", MAC, "Select to end of line", { context: "text" }],
  ["macos-select-word-left", "Alt+Shift+ArrowLeft", MAC, "Select previous word", { context: "text" }],
  ["macos-select-word-right", "Alt+Shift+ArrowRight", MAC, "Select next word", { context: "text" }],
  ["macos-delete-word", "Alt+Backspace", MAC, "Delete the previous word", { context: "text" }],
  ["macos-spelling", "Meta+;", MAC, "Find misspelled words", { context: "text" }],
  ["macos-definition", "Ctrl+Meta+d", MAC, "Show the definition", { context: "text" }],
  // Emacs-style caret keys, live in every macOS text field.
  ...(["a", "e", "f", "b", "p", "n", "k", "y", "h", "d", "l", "o", "t"] as const).map(
    (k) => [`macos-emacs-${k}`, `Ctrl+${k}`, MAC, `Emacs-style editing (Control-${k.toUpperCase()})`, { context: "text" }] as const,
  ),
]);

const pcEdit = group({ owner: "os", source: "", verified: false }, [
  // Universal edit commands. No primary source was fetched for these.
  ["pc-cut", "Ctrl+x", PC, "Cut"],
  ["pc-copy", "Ctrl+c", PC, "Copy", { mayOverride: true }],
  ["pc-paste", "Ctrl+v", PC, "Paste"],
  ["pc-undo", "Ctrl+z", PC, "Undo"],
  ["pc-redo", "Ctrl+y", PC, "Redo"],
  ["pc-select-all", "Ctrl+a", PC, "Select all"],
]);

export const RESERVED_COMBOS: readonly ReservedCombo[] = [
  ...chrome,
  ...safari,
  ...firefox,
  ...macos,
  ...pcEdit,
];

const isTypedCharacter = (key: string) => key.length === 1 && key !== " ";

export const RESERVED_FAMILIES: readonly ReservedFamily[] = [
  {
    id: "voiceover-keys",
    platforms: MAC,
    owner: "voiceover",
    action: "VoiceOver commands use Control-Option (the VO keys) with any key",
    matches: (c) => c.ctrl && c.alt,
    source: VOICEOVER,
    verified: false,
  },
  {
    id: "macos-option-characters",
    platforms: MAC,
    owner: "macos",
    action:
      "Option (and Option-Shift) with a character key types a special character, " +
      "so KeyboardEvent.key reports that character instead of the letter",
    matches: (c) => c.alt && !c.meta && !c.ctrl && isTypedCharacter(c.key),
    source: MACOS,
    verified: false,
  },
  {
    id: "windows-key",
    platforms: PC,
    owner: "os",
    action: "The Windows / Super key belongs to the desktop shell",
    matches: (c) => c.meta,
    source: "",
    verified: false,
  },
];
