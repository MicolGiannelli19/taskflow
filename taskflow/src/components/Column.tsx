import Ticket from "./Ticket";
import styles from "./Column.module.css";

interface TicketType {
  title: string;
  description?: string;
}
interface ColumnProps {
  title: string;
  tickets: TicketType[];
}

// TODO: review unpacking of props
export default function Column({ title, tickets }: ColumnProps) {
  // note prps are unpacked here
  return (
    <div className={styles.column}>
      <h2>{title}</h2>
      {tickets.map((ticket) => (
        // note tickets should probably have an id
        <Ticket title={ticket.title} />
      ))}
    </div>
  );
}
