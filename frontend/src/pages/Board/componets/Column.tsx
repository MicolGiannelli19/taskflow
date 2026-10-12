import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import Ticket from "./Ticket";
import styles from "./Column.module.css";
import type { ColumnType, TicketTypeSmall } from "../../../types";
import { paths } from "@/routes";
import type { CardNotice, Cursor } from "./cursor";

interface ColumnProps {
  boardId: string;
  column: ColumnType;
  columns: ColumnType[];
  tickets: TicketTypeSmall[];
  /** The board's keyboard cursor; the matching card or button is tabbable. */
  cursor: Cursor | null;
  canEdit: boolean;
  openTicketId: string | null;
  onOpenTicketChange: (ticketId: string | null) => void;
  onCursorFocus: (cursor: Cursor) => void;
  onMoveTicket: (ticketId: string, columnId: string) => void;
  notice: CardNotice | null;
  /** Id of the board's keyboard instructions, read with each card. */
  describedBy: string;
}

export default function Column({
  boardId,
  column,
  columns,
  tickets,
  cursor,
  canEdit,
  openTicketId,
  onOpenTicketChange,
  onCursorFocus,
  onMoveTicket,
  notice,
  describedBy,
}: ColumnProps) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const [isDraggedOver, setIsDraggedOver] = useState(false)
  const columnId = column.id;

  // The drop handler is registered once per column; read the latest move
  // function through a ref so it never acts on stale board data.
  const onMoveRef = useRef(onMoveTicket);
  useEffect(() => {
    onMoveRef.current = onMoveTicket;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return dropTargetForElements({
      element: el,
      getData: () => ({ columnId }),
      onDrop: ({ source, self }) => {
        const ticketId = source.data.ticketId as string;
        const fromColumnId = source.data.fromColumnId as string;
        const toColumnId = self.data.columnId as string;
        setIsDraggedOver(false)
        if (fromColumnId === toColumnId) return;
        onMoveRef.current(ticketId, toColumnId);
      },
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
    });
  }, [columnId]); // (Micol) why is this use effect on change of column id

  const addActive = cursor?.kind === "add" && cursor.columnId === columnId;

  return (
    <div
      className={`${styles.column} ${isDraggedOver ? styles.over : ""}`}
      ref={ref}
      data-column-id={columnId}
      role="group"
      aria-labelledby={headingId}
    >
      <h2 id={headingId}>{column.name}</h2>
      <div className={styles.tickets}>
        {tickets.map((ticket) => (
          <Ticket
            key={ticket.id}
            boardId={boardId}
            columns={columns}
            ticket={ticket}
            isActive={cursor?.kind === "ticket" && cursor.id === ticket.id}
            detailOpen={openTicketId === ticket.id}
            onDetailOpenChange={(open) => onOpenTicketChange(open ? ticket.id : null)}
            onFocusCard={() => onCursorFocus({ kind: "ticket", id: ticket.id })}
            onMoveTicket={onMoveTicket}
            notice={notice?.ticketId === ticket.id ? notice : null}
            describedBy={describedBy}
          />
        ))}

        {canEdit && (
          <button
            type="button"
            className={styles.add}
            data-roving=""
            data-add-column={columnId}
            tabIndex={addActive ? 0 : -1}
            aria-label={`New ticket in ${column.name}`}
            onFocus={() => onCursorFocus({ kind: "add", columnId })}
            onClick={() => navigate(paths.newTicket(boardId, columnId))}
          >
            <Plus aria-hidden="true" />
            New ticket
          </button>
        )}
      </div>
    </div>
  );
}
