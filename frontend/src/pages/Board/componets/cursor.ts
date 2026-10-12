/** Where the board's keyboard cursor is: a ticket card, or a column's "New ticket" button. */
export type Cursor = { kind: "ticket"; id: string } | { kind: "add"; columnId: string };

/** A short confirmation shown on a card ("Link copied") after a keyboard action. */
export interface CardNotice {
  ticketId: string;
  text: string;
  tone: "ok" | "error";
  /** Changes on every notice, so a repeat replays its entrance. */
  key: number;
}
