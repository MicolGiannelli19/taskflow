import { test } from "node:test";
import assert from "node:assert/strict";
import { PLATFORMS, resolveCombo } from "./combo.ts";
import { findConflicts, formatConflicts } from "./conflicts.ts";
import { RESERVED_COMBOS, RESERVED_FAMILIES } from "./reserved.ts";
import { SHORTCUTS, type ShortcutDefinition } from "./registry.ts";

const check = (shortcuts: readonly ShortcutDefinition[]) =>
  findConflicts(shortcuts, RESERVED_COMBOS, RESERVED_FAMILIES);

const shortcut = (overrides: Partial<ShortcutDefinition>): ShortcutDefinition => ({
  id: "test.shortcut",
  keys: ["Mod+Enter"],
  label: "Test",
  scope: "board",
  firesInText: false,
  status: "planned",
  ...overrides,
});

test("no TaskFlow shortcut collides with a reserved combo or with another shortcut", () => {
  const conflicts = check(SHORTCUTS);
  assert.equal(conflicts.length, 0, `Shortcut conflicts:\n${formatConflicts(conflicts)}`);
});

test("every combo parses on every platform", () => {
  for (const platform of PLATFORMS) {
    for (const s of SHORTCUTS) for (const k of s.keys) resolveCombo(k, platform);
    for (const r of RESERVED_COMBOS) resolveCombo(r.keys, platform);
  }
});

test("ids are unique", () => {
  for (const list of [SHORTCUTS, RESERVED_COMBOS, RESERVED_FAMILIES]) {
    const ids = list.map((x) => x.id);
    assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
  }
});

// The checks below prove the guard can fail. Without them, an empty result
// above could just mean the checker is broken.

test("flags a combo the browser keeps, even with an override", () => {
  const conflicts = check([
    shortcut({ keys: ["Mod+t"], overrides: [{ id: "chrome-new-tab", reason: "test" }] }),
  ]);
  assert.ok(conflicts.some((c) => c.with === "chrome-new-tab" && c.reason.includes("cannot be overridden")));
});

test("flags a takeable combo when no override says why", () => {
  assert.ok(check([shortcut({ keys: ["Mod+k"] })]).some((c) => c.with === "chrome-search-k"));
});

test("accepts a takeable combo with an override", () => {
  const conflicts = check([
    shortcut({
      keys: ["Mod+k"],
      overrides: [
        { id: "chrome-search-k", reason: "test" },
        { id: "firefox-search-k", reason: "test" },
      ],
    }),
  ]);
  assert.deepEqual(conflicts, []);
});

test("text-field combos only matter to shortcuts that fire while typing", () => {
  // Alt+← is word-left in a Mac text field (ignored here) but Back on Windows/Linux.
  const withs = check([shortcut({ keys: ["Alt+ArrowLeft"], scope: "ticket-card" })]).map((c) => c.with);
  assert.deepEqual([...new Set(withs)], ["chrome-back"]);
  assert.ok(
    check([shortcut({ keys: ["Mod+b"], firesInText: true, overrides: [{ id: "firefox-bookmarks-sidebar", reason: "test" }] })])
      .some((c) => c.with === "macos-bold"),
  );
});

test("flags VoiceOver keys and Option-letter combos on macOS", () => {
  assert.ok(check([shortcut({ keys: ["Ctrl+Alt+m"] })]).some((c) => c.with === "voiceover-keys"));
  assert.ok(check([shortcut({ keys: ["Alt+n"] })]).some((c) => c.with === "macos-option-characters"));
});

test("flags stale or unknown overrides", () => {
  const conflicts = check([
    shortcut({
      overrides: [
        { id: "chrome-search-k", reason: "never collides with Mod+Enter" },
        { id: "no-such-id", reason: "typo" },
      ],
    }),
  ]);
  assert.deepEqual(conflicts.map((c) => c.with).sort(), ["chrome-search-k", "no-such-id"]);
});

test("flags two shortcuts on the same keys in overlapping scopes", () => {
  const conflicts = check([
    shortcut({ id: "a", keys: ["Mod+Shift+ArrowUp"], scope: "board" }),
    shortcut({ id: "b", keys: ["Mod+Shift+ArrowUp"], scope: "ticket-card" }),
  ]);
  assert.ok(conflicts.some((c) => c.shortcutId === "a" && c.with === "b"));
});
