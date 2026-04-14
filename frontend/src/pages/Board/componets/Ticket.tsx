// Board.jsx
import styles from "./Ticket.module.css";
import type { TicketTypeSmall } from "../../../types";

interface TicketProps {
  ticket: TicketTypeSmall;
  onMove?: () => void;
}

export default function Ticket({ ticket, onMove }: TicketProps) {
  return (
    <div className={styles.ticket}>
      <header>
        <h1>{ticket.title}</h1>
        <button onClick={onMove} disabled={!onMove}>move →</button>
      </header>
      {/* <p>{description || "Lorem ipsum..."}</p> */}
    </div>
  );
}
