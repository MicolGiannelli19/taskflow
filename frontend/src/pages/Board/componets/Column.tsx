import { useEffect, useRef, useState } from "react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import Ticket from "./Ticket";
import styles from "./Column.module.css";
import { useMoveTicket } from "@/hooks/useMoveTicket";
import type { ColumnType, TicketTypeSmall } from "../../../types";

interface ColumnProps {
  boardId: string;
  columnId: string;
  title: string;
  columns: ColumnType[];
  tickets: TicketTypeSmall[];
}

export default function Column({ boardId, columnId, title, columns, tickets }: ColumnProps) {
  const moveTicket = useMoveTicket(boardId);
  const ref = useRef<HTMLDivElement>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false)

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
        if (fromColumnId === toColumnId) return;
        moveTicket.mutate({ ticketId, columnId: toColumnId });
        setIsDraggedOver(false)
      },
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
    });
  }, [columnId]); // (Micol) why is this use effect on change of column id

  return (
    <div className={`${styles.column} ${isDraggedOver ? styles.over : ""}`} ref={ref}>
      <h2>{title}</h2>
      {tickets.map((ticket) => (
        <Ticket
          key={ticket.id}
          boardId={boardId}
          columns={columns}
          ticket={ticket}
          moveTicket={moveTicket.mutate}
        />
      ))}
    </div>
  );
}
