import Ticket from "./Ticket";
import styles from "./Column.module.css";
import type { TicketTypeSmall } from "../types";

interface ColumnProps {
  title: string;
  tickets: TicketTypeSmall[];
}

// TODO: review unpacking of props
export default function Column({ title, tickets }: ColumnProps) {
  // note prps are unpacked here
  return (
    <div className={styles.column}>
      <h2>{title}</h2>
      {tickets.map((ticket) => (
        // note tickets should probably have an id
        <Ticket key={ticket.id} title={ticket.title} />
      ))}
    </div>
  );
}
