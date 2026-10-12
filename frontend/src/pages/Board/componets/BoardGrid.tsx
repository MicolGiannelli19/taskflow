import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useLocation } from "react-router-dom";
import Column from "./Column";
import TicketDetail from "../TicketDetail";
import styles from "./BoardGrid.module.css";
import type { ColumnType, TicketTypeSmall } from "../../../types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBoardPermissions } from "@/hooks/useBoardPermissions";
import { useCopyLink } from "@/hooks/useCopyLink";
import { useDeleteTicket } from "@/hooks/useDeleteTicket";
import { useMoveTicket } from "@/hooks/useMoveTicket";
import { useAnnounce, useBoardCommandsSlot } from "@/hooks/useShortcut";
import { useUpdateBoardTicket } from "@/hooks/useUpdateBoardTicket";
import type { TicketEditPatch } from "@/hooks/useUpdateTicket";
import { PLATFORM, matchShortcut, moveStep } from "@/lib/shortcuts/keyboard";
import { paths } from "@/routes";
import { readLastTicket, writeLastTicket } from "../boardFocus";
import type { CardNotice, Cursor } from "./cursor";

interface BoardGridProps {
  boardId: string;
  columns: ColumnType[];
  tickets: TicketTypeSmall[];
}

interface FocusRequest {
  cursor: Cursor;
  /** Wait until the card has landed in this column (after an optimistic move). */
  inColumn?: string;
  at: number;
}

function sameCursor(a: Cursor | null, b: Cursor): boolean {
  if (!a) return false;
  if (a.kind === "ticket") return b.kind === "ticket" && a.id === b.id;
  return b.kind === "add" && a.columnId === b.columnId;
}

const MOD_NAME = PLATFORM === "mac" ? "Command" : "Control";

/**
 * The columns, plus the board's keyboard model. Exactly one card (or a
 * column's "New ticket" button) is in the tab order: the cursor. Arrow keys
 * move it, focus follows a ticket when it moves column, and the grid lends
 * its actions to the ⌘K palette. Sidebar and top bar come from AppLayout.
 */
export default function BoardGrid({ boardId, columns, tickets }: BoardGridProps) {
  const announce = useAnnounce();
  const slot = useBoardCommandsSlot();
  const location = useLocation();
  const { role, canEdit } = useBoardPermissions(boardId);
  const moveTicket = useMoveTicket(boardId);
  const deleteTicket = useDeleteTicket(boardId);
  const updateTicket = useUpdateBoardTicket(boardId);
  const { copy } = useCopyLink();
  const helpId = useId();

  const gridRef = useRef<HTMLDivElement>(null);
  const focusRequest = useRef<FocusRequest | null>(null);
  const deleteOrigin = useRef<string | null>(null);
  const afterDelete = useRef<Cursor | null>(null);
  const noticeTimer = useRef<number | undefined>(undefined);

  const [cursorState, setCursorState] = useState<Cursor | null>(null);
  // One ticket dialog for the whole board. It stays mounted while its ticket
  // moves column (a per-card dialog would close and reopen) and keeps its
  // exit animation by holding the last id after `open` goes false.
  const [detail, setDetail] = useState<{ id: string; open: boolean } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TicketTypeSmall | null>(null);
  const [notice, setNotice] = useState<CardNotice | null>(null);

  const lanes = useMemo(
    () => columns.map((col) => ({ col, tickets: tickets.filter((t) => t.column_id === col.id) })),
    [columns, tickets]
  );

  // The stored cursor, or the first card when that one is gone.
  const cursor = useMemo<Cursor | null>(() => {
    const valid =
      cursorState &&
      (cursorState.kind === "ticket"
        ? tickets.some((t) => t.id === cursorState.id)
        : canEdit && columns.some((c) => c.id === cursorState.columnId));
    if (valid) return cursorState;
    const first = lanes.find((l) => l.tickets.length > 0)?.tickets[0];
    if (first) return { kind: "ticket", id: first.id };
    if (canEdit && columns[0]) return { kind: "add", columnId: columns[0].id };
    return null;
  }, [cursorState, tickets, columns, lanes, canEdit]);

  // ─── Focus ─────────────────────────────────────────────────────────────────

  function focusCursor(next: Cursor, inColumn?: string) {
    setCursorState(next);
    focusRequest.current = { cursor: next, inColumn, at: Date.now() };
  }

  // Runs after every render: a requested focus lands as soon as its element
  // exists (a moved card remounts in its new column a tick later).
  useLayoutEffect(() => {
    const req = focusRequest.current;
    const grid = gridRef.current;
    if (!req || !grid) return;
    if (Date.now() - req.at > 3000) {
      focusRequest.current = null;
      return;
    }
    const c = req.cursor;
    const selector =
      c.kind === "add"
        ? `[data-add-column="${CSS.escape(c.columnId)}"]`
        : `${req.inColumn ? `[data-column-id="${CSS.escape(req.inColumn)}"] ` : ""}[data-ticket-id="${CSS.escape(c.id)}"]`;
    const el = grid.querySelector<HTMLElement>(selector);
    if (!el) return;
    el.focus({ preventScroll: true });
    // A closing dialog can still hold focus; keep the request until it lets go.
    if (document.activeElement !== el) return;
    focusRequest.current = null;
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  const handleCursorFocus = useCallback(
    (next: Cursor) => {
      setCursorState((prev) => (sameCursor(prev, next) ? prev : next));
      if (next.kind === "ticket") writeLastTicket(boardId, next.id);
    },
    [boardId]
  );

  // Re-entry: coming back to a board puts you on the ticket you left.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || tickets.length === 0) return;
    restored.current = true;
    const last = readLastTicket(boardId);
    if (!last || !tickets.some((t) => t.id === last)) return;
    const next: Cursor = { kind: "ticket", id: last };
    setCursorState(next);
    // Only take focus when nothing else has it (arriving from a link).
    const active = document.activeElement;
    if (!active || active === document.body) {
      focusRequest.current = { cursor: next, at: Date.now() };
    }
  }, [tickets, boardId]);

  // A ticket just created through the new-ticket dialog takes the cursor.
  const createdId = (location.state as { focusTicketId?: string } | null)?.focusTicketId;
  const handledCreated = useRef<string | null>(null);
  useEffect(() => {
    if (!createdId || handledCreated.current === createdId) return;
    if (!tickets.some((t) => t.id === createdId)) return; // wait for the refetch
    handledCreated.current = createdId;
    writeLastTicket(boardId, createdId);
    const next: Cursor = { kind: "ticket", id: createdId };
    setCursorState(next);
    focusRequest.current = { cursor: next, at: Date.now() };
  }, [createdId, tickets, boardId]);

  // ─── Feedback ──────────────────────────────────────────────────────────────

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  function flash(ticketId: string, text: string, tone: CardNotice["tone"] = "ok") {
    window.clearTimeout(noticeTimer.current);
    setNotice({ ticketId, text, tone, key: Date.now() });
    noticeTimer.current = window.setTimeout(() => setNotice(null), 1800);
  }

  function viewOnly(ticketId?: string) {
    if (!role) return; // role still loading: say nothing rather than guess
    announce("This board is view-only.");
    if (ticketId) flash(ticketId, "View only", "error");
  }

  // ─── Actions (keyboard, drag and drop, move menu and palette) ─────────────

  /** `focus: false` when the ticket is open in its dialog, which keeps focus. */
  function move(ticketId: string, toColumnId: string, { focus = true } = {}) {
    const ticket = tickets.find((t) => t.id === ticketId);
    const from = columns.find((c) => c.id === ticket?.column_id);
    const to = columns.find((c) => c.id === toColumnId);
    if (!ticket || !from || !to || from.id === to.id) return;
    if (!canEdit) return viewOnly(ticketId);

    if (focus) focusCursor({ kind: "ticket", id: ticketId }, to.id);
    else setCursorState({ kind: "ticket", id: ticketId });
    announce(`Moved “${ticket.title}” to ${to.name}.`);
    moveTicket.mutate(
      { ticketId, columnId: to.id },
      {
        onError: () => {
          announce(`Couldn't move “${ticket.title}”. It's back in ${from.name}.`);
          flash(ticketId, "Couldn't move", "error");
          if (focus) focusCursor({ kind: "ticket", id: ticketId }, from.id);
        },
      }
    );
  }

  function requestDelete(ticketId: string) {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    if (!canEdit) return viewOnly(ticketId);
    deleteOrigin.current = ticketId;
    afterDelete.current = null;
    setPendingDelete(ticket);
  }

  function confirmDelete() {
    const ticket = pendingDelete;
    if (!ticket) return;
    const lane = lanes.find((l) => l.col.id === ticket.column_id);
    const index = lane?.tickets.findIndex((t) => t.id === ticket.id) ?? -1;
    const neighbour = lane?.tickets[index + 1] ?? lane?.tickets[index - 1];
    afterDelete.current = neighbour
      ? { kind: "ticket", id: neighbour.id }
      : canEdit
        ? { kind: "add", columnId: ticket.column_id }
        : null;

    setPendingDelete(null);
    announce(`Deleted “${ticket.title}”.`);
    deleteTicket.mutate(ticket.id, {
      onError: () => {
        announce(`Couldn't delete “${ticket.title}”. It's back on the board.`);
        flash(ticket.id, "Couldn't delete", "error");
      },
    });
  }

  async function copyLink(ticketId: string) {
    const ok = await copy(`${window.location.origin}${paths.ticket(boardId, ticketId)}`);
    announce(ok ? "Link copied." : "Couldn't copy the link.");
    flash(ticketId, ok ? "Link copied" : "Couldn't copy", ok ? "ok" : "error");
  }

  function update(ticketId: string, patch: TicketEditPatch, done: string) {
    if (!canEdit) return viewOnly(ticketId);
    announce(`${done}.`);
    flash(ticketId, "Saved");
    updateTicket.mutate(
      { ticketId, patch },
      {
        onError: () => {
          announce("Couldn't save that change. It's been undone.");
          flash(ticketId, "Couldn't save", "error");
        },
      }
    );
  }

  /** Move a ticket one column left (-1) or right (1), if there is one. */
  function moveByStep(ticketId: string, step: -1 | 1, options?: { focus?: boolean }) {
    const ticket = tickets.find((t) => t.id === ticketId);
    const index = columns.findIndex((c) => c.id === ticket?.column_id);
    const target = columns[index + step];
    if (ticket && target) move(ticketId, target.id, options);
  }

  function openTicket(ticketId: string) {
    setCursorState({ kind: "ticket", id: ticketId });
    setDetail({ id: ticketId, open: true });
  }

  const detailTicket = detail ? tickets.find((t) => t.id === detail.id) : undefined;
  const detailStatus = columns.find((c) => c.id === detailTicket?.column_id)?.name;

  // Lend the palette the current versions of these actions.
  useEffect(() => {
    slot.set({
      boardId,
      openTicket,
      moveTicket: move,
      requestDelete,
      copyLink: (id) => void copyLink(id),
      focusTicket: (id) => focusCursor({ kind: "ticket", id }),
      updateTicket: update,
    });
  });
  useEffect(() => () => slot.set(null), [slot]);

  // ─── Keys on a focused card or "New ticket" button ─────────────────────────

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const el = e.target as HTMLElement;
    if (!el.hasAttribute("data-roving")) return;
    const ticketId = el.dataset.ticketId;
    const columnId = el.closest<HTMLElement>("[data-column-id]")?.dataset.columnId;
    const colIndex = lanes.findIndex((l) => l.col.id === columnId);
    if (colIndex < 0) return;
    const lane = lanes[colIndex];
    // The "New ticket" button sits one row below the last card.
    const row = ticketId ? lane.tickets.findIndex((t) => t.id === ticketId) : lane.tickets.length;
    const ticketAt = (l: typeof lane, i: number): Cursor => ({ kind: "ticket", id: l.tickets[i].id });

    const handled = (() => {
      if (matchShortcut(e, "board.focusUp")) {
        if (row > 0) focusCursor(ticketAt(lane, row - 1));
        return true;
      }
      if (matchShortcut(e, "board.focusDown")) {
        if (row + 1 < lane.tickets.length) focusCursor(ticketAt(lane, row + 1));
        else if (ticketId && canEdit) focusCursor({ kind: "add", columnId: lane.col.id });
        return true;
      }
      const left = matchShortcut(e, "board.focusLeft");
      if (left || matchShortcut(e, "board.focusRight")) {
        const step = left ? -1 : 1;
        // Skip columns with nothing focusable in them (empty, for a viewer).
        for (let i = colIndex + step; i >= 0 && i < lanes.length; i += step) {
          const next = lanes[i];
          if (next.tickets.length > 0) {
            focusCursor(ticketAt(next, Math.min(row, next.tickets.length - 1)));
            break;
          }
          if (canEdit) {
            focusCursor({ kind: "add", columnId: next.col.id });
            break;
          }
        }
        return true;
      }
      if (matchShortcut(e, "board.focusFirst")) {
        if (lane.tickets.length > 0) focusCursor(ticketAt(lane, 0));
        return true;
      }
      if (matchShortcut(e, "board.focusLast")) {
        if (lane.tickets.length > 0) focusCursor(ticketAt(lane, lane.tickets.length - 1));
        return true;
      }

      if (!ticketId) return false;
      const step = moveStep(e);
      if (step) {
        moveByStep(ticketId, step);
        return true;
      }
      if (matchShortcut(e, "ticket.delete")) {
        requestDelete(ticketId);
        return true;
      }
      if (matchShortcut(e, "ticket.copyLink")) {
        // Text is selected: that is what the person means to copy.
        if (window.getSelection()?.toString()) return false;
        void copyLink(ticketId);
        return true;
      }
      return false;
    })();

    if (handled) e.preventDefault();
  }

  return (
    <>
      <div
        ref={gridRef}
        className={styles.mainBoard}
        data-board-grid=""
        onKeyDown={handleKeyDown}
        role="region"
        aria-label="Board columns"
      >
        <p id={helpId} className="sr-only">
          Arrow keys move between tickets; Enter opens one. {MOD_NAME}, Shift and Left or Right
          Arrow moves the ticket to the next column. {MOD_NAME} K opens the command palette.
        </p>
        {lanes.map(({ col, tickets: laneTickets }) => (
          <Column
            key={col.id}
            boardId={boardId}
            column={col}
            columns={columns}
            tickets={laneTickets}
            cursor={cursor}
            canEdit={canEdit}
            onOpenTicket={openTicket}
            onCursorFocus={handleCursorFocus}
            onMoveTicket={move}
            notice={notice}
            describedBy={helpId}
          />
        ))}
      </div>

      {detail && (
        <TicketDetail
          boardId={boardId}
          ticketId={detail.id}
          open={detail.open}
          onOpenChange={(open) => setDetail((d) => d && { ...d, open })}
          status={detailStatus}
          onMoveStep={(step) => moveByStep(detail.id, step, { focus: false })}
          // Back to the card, wherever it now sits, not to the top of the page.
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            focusCursor({ kind: "ticket", id: detail.id });
          }}
        />
      )}

      {/* Deleting a ticket is not recoverable, so confirm first. */}
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent
          className={styles.confirm}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            const target =
              afterDelete.current ??
              (deleteOrigin.current ? { kind: "ticket" as const, id: deleteOrigin.current } : null);
            afterDelete.current = null;
            deleteOrigin.current = null;
            if (target) focusCursor(target);
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete “{pendingDelete?.title}”?</DialogTitle>
            <DialogDescription>This can't be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete}>
              Delete ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
