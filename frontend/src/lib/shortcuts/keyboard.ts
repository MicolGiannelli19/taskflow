import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { eventMatches, resolveCombo, type Platform } from "./combo.ts";
import { SHORTCUT_BY_ID, type ShortcutId } from "./registry.ts";

/**
 * The browser side of shortcuts: which platform we are on, whether the user is
 * typing, and whether a keydown is a given registry shortcut. Every listener in
 * the app goes through `matchShortcut`, so a combo is only ever written in
 * `registry.ts`.
 */

interface NavigatorWithUAData extends Navigator {
  userAgentData?: { platform?: string };
}

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "windows";
  const nav = navigator as NavigatorWithUAData;
  const name = nav.userAgentData?.platform || nav.platform || nav.userAgent;
  if (/mac|iphone|ipad|ipod/i.test(name)) return "mac";
  if (/linux|cros|android/i.test(name)) return "linux";
  return "windows";
}

export const PLATFORM: Platform = detectPlatform();

const TEXT_INPUT_TYPES = new Set([
  "text", "search", "email", "url", "tel", "password", "number", "date",
  "datetime-local", "month", "time", "week",
]);

/** True when a keypress on `target` is the user typing, not issuing a command. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(target.type);
  // Clerk's prebuilt components own their keyboard handling.
  return Boolean(target.closest("[class*='cl-rootBox'], [class*='cl-component']"));
}

/** True while a modal dialog (ticket detail, palette, confirm) is open. */
export function isModalOpen(): boolean {
  return Boolean(document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'));
}

/** True when `e` is shortcut `id` and should fire where it was pressed. */
export function matchShortcut(e: KeyboardEvent | ReactKeyboardEvent, id: ShortcutId): boolean {
  const native = "nativeEvent" in e ? e.nativeEvent : e;
  // Mid-composition keys (Japanese, Chinese input) belong to the input method.
  if (native.isComposing || native.keyCode === 229) return false;
  const def = SHORTCUT_BY_ID[id];
  if (!def.firesInText && isTypingTarget(e.target)) return false;
  return def.keys.some((k) => eventMatches(resolveCombo(k, PLATFORM), e));
}
