import { createContext } from "react";
import type { TicketEditPatch } from "@/hooks/useUpdateTicket";

/**
 * Shared state for the keyboard layer, provided once by `ShortcutsProvider`
 * inside the app shell. Kept in a plain module so the provider file only
 * exports components (React Refresh needs that).
 */

/** Say something to screen readers through one polite live region. */
export type Announce = (message: string) => void;

export const AnnouncerContext = createContext<Announce>(() => {});

export interface PaletteState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const PaletteContext = createContext<PaletteState | null>(null);

/**
 * What the board grid lets the command palette do. The grid owns focus, the
 * delete confirmation and the card notices, so the palette asks it rather than
 * duplicating that logic.
 */
export interface BoardCommands {
  boardId: string;
  openTicket: (ticketId: string) => void;
  moveTicket: (ticketId: string, columnId: string) => void;
  requestDelete: (ticketId: string) => void;
  copyLink: (ticketId: string) => void;
  focusTicket: (ticketId: string) => void;
  /** Apply `patch`, then confirm with `done` on the card and to screen readers. */
  updateTicket: (ticketId: string, patch: TicketEditPatch, done: string) => void;
}

export interface BoardCommandsSlot {
  get: () => BoardCommands | null;
  set: (commands: BoardCommands | null) => void;
}

export const BoardCommandsContext = createContext<BoardCommandsSlot | null>(null);
