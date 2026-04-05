// Board.jsx
import styles from "./Ticket.module.css";
import type { TicketTypeSmall } from "../types";

interface TicketProps {
  ticket: TicketTypeSmall;
}

export default function Ticket({ ticket }: TicketProps) {
  return (
    <div className={styles.ticket}>
      <header>
        <h1>{ticket.title}</h1>
        <button>move</button>
      </header>
      {/* <p>{description || "Lorem ipsum..."}</p> */}
    </div>
  );
}
