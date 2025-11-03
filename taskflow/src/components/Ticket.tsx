// Board.jsx
import React from "react";
import styles from "./Ticket.module.css";
// import "@atlaskit/css-reset";

interface TicketProps {
  title: string;
}

export default function Ticket({ title }: TicketProps) {
  return (
    <div className={styles.ticket}>
      <header>
        <h1>{title}</h1>

        {/* TODO: change this to display drop down with ticket names */}
        <button>move</button>
      </header>
      <p>
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Culpa
        praesentium eaque eius, iste reiciendis veritatis laboriosam voluptates
        maiores, ut autem magnam facilis odit nam aliquam explicabo! Repudiandae
        explicabo adipisci sapiente?
      </p>
    </div>
  );
}
