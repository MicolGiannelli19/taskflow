import { test } from "node:test";
import assert from "node:assert/strict";
import { eventMatches, resolveCombo, type KeyLike } from "./combo.ts";
import { ariaKeyShortcuts, comboText } from "./format.ts";

const press = (key: string, code: string, mods: Partial<KeyLike> = {}): KeyLike => ({
  key,
  code,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...mods,
});

test("Mod is ⌘ on a Mac and Ctrl elsewhere", () => {
  assert.ok(eventMatches(resolveCombo("Mod+k", "mac"), press("k", "KeyK", { metaKey: true })));
  assert.ok(!eventMatches(resolveCombo("Mod+k", "mac"), press("k", "KeyK", { ctrlKey: true })));
  assert.ok(eventMatches(resolveCombo("Mod+k", "windows"), press("k", "KeyK", { ctrlKey: true })));
});

test("modifiers must match exactly", () => {
  const moveLeft = resolveCombo("Mod+Shift+ArrowLeft", "mac");
  assert.ok(eventMatches(moveLeft, press("ArrowLeft", "ArrowLeft", { metaKey: true, shiftKey: true })));
  // ⌘← alone is Chrome's Back on a Mac; it must not move the ticket.
  assert.ok(!eventMatches(moveLeft, press("ArrowLeft", "ArrowLeft", { metaKey: true })));
  assert.ok(!eventMatches(resolveCombo("Enter", "mac"), press("Enter", "Enter", { metaKey: true })));
});

test("Shift turns a letter uppercase; it still matches", () => {
  assert.ok(eventMatches(resolveCombo("Mod+Shift+k", "windows"), press("K", "KeyK", { ctrlKey: true, shiftKey: true })));
});

test("a non-Latin layout falls back to the physical key", () => {
  // Russian layout: the K key types "л".
  assert.ok(eventMatches(resolveCombo("Mod+k", "mac"), press("л", "KeyK", { metaKey: true })));
  // A Latin letter is trusted as typed (Dvorak's K lives on another key).
  assert.ok(!eventMatches(resolveCombo("Mod+k", "mac"), press("t", "KeyK", { metaKey: true })));
});

test("Space matches by key or by code", () => {
  assert.ok(eventMatches(resolveCombo("Space", "linux"), press(" ", "Space")));
});

test("hints read the way each platform writes them", () => {
  // Apple's order is ⌃⌥⇧⌘, as in macOS menus.
  assert.equal(comboText("Mod+Shift+ArrowLeft", "mac"), "⇧⌘←");
  assert.equal(comboText("Mod+Shift+ArrowLeft", "windows"), "Ctrl+Shift+←");
  assert.equal(comboText("Mod+Enter", "mac"), "⌘↩");
  assert.equal(comboText("Mod+Backspace", "windows"), "Ctrl+Backspace");
  assert.equal(comboText("Mod+k", "linux"), "Ctrl+K");
});

test("aria-keyshortcuts uses the ARIA key names", () => {
  assert.equal(ariaKeyShortcuts(["Mod+k"], "mac"), "Meta+K");
  assert.equal(ariaKeyShortcuts(["Enter", "Space"], "windows"), "Enter Space");
  assert.equal(ariaKeyShortcuts(["Mod+Shift+ArrowRight"], "windows"), "Control+Shift+ArrowRight");
});
