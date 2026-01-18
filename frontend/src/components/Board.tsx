// Board.jsx
// import React from "react";
// import { useEffect, useState } from "react";
import Column from "./Column";
import styles from "./Board.module.css";
import { Link } from "react-router-dom";
import type { ColumnType, TicketTypeSmall } from "../types";

// import { title } from "process";
// fetch board API Call
// Create ticket api call

// export async function fetchUsers() {
//   const res = await fetch(`${API_BASE}/users`);
//   return res.json();
// }
interface BoardProps {
  columns: ColumnType[];
  tickets: TicketTypeSmall[];
}

export default function Board({ columns, tickets }: BoardProps) {
  return (
    <div className={styles.board}>
      <div className={styles.header}>
        <div>~Task Flow</div>

        <Link to="/new-ticket">
          <button>Add New Ticket</button>
        </Link>
      </div>

      {/* TODO: change this so that it displays the correct thing */}
      <div className={styles.mainBoard}>
        {columns.map((col) => (
          // TODO: ticket proably shouldn't be a child of board ticket should just be displayed in the board it is assigned in ?
          <Column
            key={col.id}
            title={col.name} // QUESTION: should the json be unpacked defining the props here or wihtin column
            tickets={tickets.filter((t) => t.column_id === col.id)}
          />

        ))}
      </div>
    </div>
  );
}

// I need to investigate the relationship between doing things in the frontend and in the backend in things such as column renaming
