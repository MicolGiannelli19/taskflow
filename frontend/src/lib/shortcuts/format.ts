import { resolveCombo, type Platform } from "./combo.ts";

/**
 * How a combo is shown to people (`⌘⇧←` on a Mac, `Ctrl+Shift+←` elsewhere)
 * and announced to assistive tech (`aria-keyshortcuts`).
 */

const MAC_KEYS: Record<string, string> = {
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Enter: "↩",
  Backspace: "⌫",
  Delete: "⌦",
  Escape: "Esc",
  Tab: "⇥",
  " ": "Space",
};

const PC_KEYS: Record<string, string> = {
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Escape: "Esc",
  " ": "Space",
};

/** One label per key, in the platform's usual modifier order. */
export function comboParts(keys: string, platform: Platform): string[] {
  const c = resolveCombo(keys, platform);
  const isMac = platform === "mac";
  const key = (isMac ? MAC_KEYS : PC_KEYS)[c.key] ?? (c.key.length === 1 ? c.key.toUpperCase() : c.key);

  // Apple orders modifiers ⌃⌥⇧⌘; Windows writes Ctrl+Alt+Shift.
  const mods = isMac
    ? [c.ctrl && "⌃", c.alt && "⌥", c.shift && "⇧", c.meta && "⌘"]
    : [c.ctrl && "Ctrl", c.alt && "Alt", c.shift && "Shift", c.meta && "Win"];

  return [...mods.filter((m): m is string => Boolean(m)), key];
}

/** `"⌘⇧←"` on a Mac, `"Ctrl+Shift+←"` elsewhere. */
export function comboText(keys: string, platform: Platform): string {
  return comboParts(keys, platform).join(platform === "mac" ? "" : "+");
}

const ARIA_KEYS: Record<string, string> = { " ": "Space", "+": "Plus" };

/** The `aria-keyshortcuts` value, e.g. `"Meta+Shift+ArrowLeft"`. */
export function ariaKeyShortcuts(keys: readonly string[], platform: Platform): string {
  return keys
    .map((k) => {
      const c = resolveCombo(k, platform);
      const key = ARIA_KEYS[c.key] ?? (c.key.length === 1 ? c.key.toUpperCase() : c.key);
      return [c.ctrl && "Control", c.alt && "Alt", c.shift && "Shift", c.meta && "Meta", key]
        .filter(Boolean)
        .join("+");
    })
    .join(" ");
}
