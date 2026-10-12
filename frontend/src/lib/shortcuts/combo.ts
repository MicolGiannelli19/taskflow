/**
 * Key-combo strings and how they resolve on each platform.
 *
 * A combo is modifiers then one key, joined by "+": `"Mod+Shift+ArrowLeft"`.
 * `Mod` is ⌘ on macOS and Ctrl everywhere else, so one definition covers every
 * platform. The key is the physical key's *unshifted* character (`"/"`, not
 * `"?"`), letters in lowercase, or a `KeyboardEvent.key` name such as
 * `"Enter"`. `"Plus"` and `"Space"` stand in for `+` and ` `, because `+` is
 * the separator and a space is invisible.
 *
 * DOM-free on purpose: `node --test` loads this file directly.
 */

export type Platform = "mac" | "windows" | "linux";

export const PLATFORMS: readonly Platform[] = ["mac", "windows", "linux"];

export interface ResolvedCombo {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  key: string;
}

const NAMED_KEYS = new Set([
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "Enter", "Escape", "Backspace", "Delete", "Tab",
  "Home", "End", "PageUp", "PageDown",
  "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
]);

function normaliseKey(raw: string, combo: string): string {
  if (raw === "Plus") return "+";
  if (raw === "Space") return " ";
  if (raw.length === 1) return raw.toLowerCase();
  if (NAMED_KEYS.has(raw)) return raw;
  throw new Error(`Unknown key "${raw}" in combo "${combo}"`);
}

/** Turn a combo string into the concrete keys pressed on `platform`. */
export function resolveCombo(combo: string, platform: Platform): ResolvedCombo {
  const parts = combo.split("+");
  const rawKey = parts.pop();
  if (!rawKey) throw new Error(`Combo "${combo}" has no key`);

  const resolved: ResolvedCombo = {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    key: normaliseKey(rawKey, combo),
  };

  for (const part of parts) {
    switch (part) {
      case "Mod":
        if (platform === "mac") resolved.meta = true;
        else resolved.ctrl = true;
        break;
      case "Ctrl":
        resolved.ctrl = true;
        break;
      case "Alt":
        resolved.alt = true;
        break;
      case "Shift":
        resolved.shift = true;
        break;
      case "Meta":
        resolved.meta = true;
        break;
      default:
        throw new Error(`Unknown modifier "${part}" in combo "${combo}"`);
    }
  }
  return resolved;
}

/** The parts of a `KeyboardEvent` that matching reads; structural so tests need no DOM. */
export interface KeyLike {
  key: string;
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

/** `"KeyK"` → `"k"`, `"Digit1"` → `"1"`, `"Space"` → `" "`. */
function keyFromCode(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (code === "Space") return " ";
  return null;
}

/** True when the event is exactly this combo: same modifiers, same key. */
export function eventMatches(c: ResolvedCombo, e: KeyLike): boolean {
  if (e.ctrlKey !== c.ctrl || e.altKey !== c.alt || e.shiftKey !== c.shift || e.metaKey !== c.meta) {
    return false;
  }
  if (e.key === c.key || e.key.toLowerCase() === c.key) return true;
  // On a non-Latin layout ⌘K arrives as ⌘Л: fall back to the physical key. A
  // Latin letter is trusted as typed, so Dvorak users get the letter they see.
  if (/^[a-z]$/i.test(e.key)) return false;
  return keyFromCode(e.code) === c.key;
}

/** A stable string for comparing two resolved combos, e.g. `"Ctrl+Shift+arrowleft"`. */
export function comboId(c: ResolvedCombo): string {
  return [
    c.ctrl && "Ctrl",
    c.alt && "Alt",
    c.shift && "Shift",
    c.meta && "Meta",
    c.key.toLowerCase(),
  ]
    .filter(Boolean)
    .join("+");
}
