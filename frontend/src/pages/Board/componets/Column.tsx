import Ticket from "./Ticket";
import styles from "./Column.module.css";
import type { ColumnType, TicketTypeSmall } from "../../../types";

interface ColumnProps {
  boardId: string;
  title: string;
  columns: ColumnType[];
  tickets: TicketTypeSmall[];
}

export default function Column({ boardId, title, columns, tickets }: ColumnProps) {
  return (
    <div className={styles.column}>
      <h2>{title}</h2>
      {tickets.map((ticket) => (
        <Ticket
          key={ticket.id}
          boardId={boardId}
          columns={columns}
          ticket={ticket}
        />
      ))}
    </div>
  );
}
