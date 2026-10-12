/**
 * Finding the board's keyboard cursor from outside the grid: dialogs that open
 * over the board (new ticket, palette) hand focus back here when they close.
 * The grid marks every card and "New ticket" button with `data-roving`; exactly
 * one of them has `tabIndex=0`.
 */

export function ticketElement(ticketId: string, columnId?: string): HTMLElement | null {
  const id = CSS.escape(ticketId);
  const selector = columnId
    ? `[data-column-id="${CSS.escape(columnId)}"] [data-ticket-id="${id}"]`
    : `[data-ticket-id="${id}"]`;
  return document.querySelector<HTMLElement>(selector);
}

/** Focus the board's cursor (the one card or button in the tab order). */
export function focusBoardCursor(): boolean {
  const el = document.querySelector<HTMLElement>('[data-board-grid] [data-roving][tabindex="0"]');
  el?.focus();
  return Boolean(el);
}

const lastTicketKey = (boardId: string) => `taskflow:last-ticket:${boardId}`;

/** The ticket that last had focus on this board, this browser session. */
export function readLastTicket(boardId: string): string | null {
  try {
    return sessionStorage.getItem(lastTicketKey(boardId));
  } catch {
    return null;
  }
}

export function writeLastTicket(boardId: string, ticketId: string) {
  try {
    sessionStorage.setItem(lastTicketKey(boardId), ticketId);
  } catch {
    // Private mode or blocked storage: re-entry falls back to the first card.
  }
}
