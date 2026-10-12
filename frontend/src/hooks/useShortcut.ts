import { useContext, useEffect, useRef } from "react";
import { isModalOpen, matchShortcut } from "@/lib/shortcuts/keyboard";
import { SHORTCUT_BY_ID, type ShortcutId } from "@/lib/shortcuts/registry";
import {
  AnnouncerContext,
  BoardCommandsContext,
  PaletteContext,
} from "@/components/shortcuts/contexts";

/**
 * Run `handler` when registry shortcut `id` is pressed anywhere in the window.
 * For `global` and `board` shortcuts; ones tied to a focused element (a card,
 * an editor) call `matchShortcut` in that element's own `onKeyDown`.
 * `board` shortcuts pause while a dialog is open.
 */
export function useShortcut(id: ShortcutId, handler: (e: KeyboardEvent) => void, enabled = true) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;
    const scope = SHORTCUT_BY_ID[id].scope;

    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || !matchShortcut(e, id)) return;
      if (scope === "board" && isModalOpen()) return;
      e.preventDefault();
      handlerRef.current(e);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [id, enabled]);
}

export function useAnnounce() {
  return useContext(AnnouncerContext);
}

export function usePalette() {
  const palette = useContext(PaletteContext);
  if (!palette) throw new Error("usePalette must be used inside ShortcutsProvider.");
  return palette;
}

export function useBoardCommandsSlot() {
  const slot = useContext(BoardCommandsContext);
  if (!slot) throw new Error("useBoardCommandsSlot must be used inside ShortcutsProvider.");
  return slot;
}
