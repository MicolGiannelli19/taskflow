import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { useShortcut } from "@/hooks/useShortcut";
import {
  AnnouncerContext,
  BoardCommandsContext,
  PaletteContext,
  type BoardCommands,
  type BoardCommandsSlot,
} from "./contexts";
import CommandPalette, { type PaletteOrigin } from "./CommandPalette";

/** Where focus was when the palette opened: its context and where to return. */
function captureOrigin(): PaletteOrigin {
  const el = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  return {
    element: el,
    ticketId: el?.closest<HTMLElement>("[data-ticket-id]")?.dataset.ticketId ?? null,
    columnId: el?.closest<HTMLElement>("[data-column-id]")?.dataset.columnId ?? null,
  };
}

/**
 * The app-wide keyboard layer: the screen-reader announcer, the ⌘K palette,
 * the global shortcuts (palette, sidebar) and the slot through which the board
 * grid lends the palette its commands. Must sit inside `SidebarProvider`.
 */
export default function ShortcutsProvider({ children }: { children: ReactNode }) {
  // ─── Announcer ─────────────────────────────────────────────────────────────
  const [message, setMessage] = useState("");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const announce = useCallback((text: string) => {
    // Clear first so the same sentence twice is still read twice.
    setMessage("");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(text), 60);
  }, []);

  // ─── Board commands slot ───────────────────────────────────────────────────
  const commandsRef = useRef<BoardCommands | null>(null);
  const slot = useMemo<BoardCommandsSlot>(
    () => ({
      get: () => commandsRef.current,
      set: (commands) => {
        commandsRef.current = commands;
      },
    }),
    []
  );

  // ─── Palette ───────────────────────────────────────────────────────────────
  const [paletteOpen, setPaletteOpenState] = useState(false);
  const [origin, setOrigin] = useState<PaletteOrigin | null>(null);

  const setPaletteOpen = useCallback((open: boolean) => {
    if (open) setOrigin(captureOrigin());
    setPaletteOpenState(open);
  }, []);

  const palette = useMemo(
    () => ({ open: paletteOpen, setOpen: setPaletteOpen }),
    [paletteOpen, setPaletteOpen]
  );

  // ─── Global shortcuts ──────────────────────────────────────────────────────
  const { toggleSidebar } = useSidebar();
  useShortcut("palette.open", () => setPaletteOpen(true));
  useShortcut("sidebar.toggle", toggleSidebar);

  return (
    <AnnouncerContext.Provider value={announce}>
      <BoardCommandsContext.Provider value={slot}>
        <PaletteContext.Provider value={palette}>
          {children}
          <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} origin={origin} />
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {message}
          </div>
        </PaletteContext.Provider>
      </BoardCommandsContext.Provider>
    </AnnouncerContext.Provider>
  );
}
