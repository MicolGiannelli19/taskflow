import Ticket from "./Ticket";
import styles from "./Column.module.css";
import { useMoveTicket } from "@/hooks/useMoveTicket";
import type { ColumnType, TicketTypeSmall } from "../../../types";

interface ColumnProps {
  boardId: string;
  title: string;
  columns: ColumnType[];
  tickets: TicketTypeSmall[];
}

export default function Column({ boardId, title, columns, tickets }: ColumnProps) {
  const moveTicket = useMoveTicket(boardId);

  return (
    <div className={styles.column}>
      <h2>{title}</h2>
      {tickets.map((ticket) => (
        <Ticket
          key={ticket.id}
          columns={columns}
          ticket={ticket}
          moveTicket={moveTicket.mutate}
        />
      ))}
    </div>
  );
}
