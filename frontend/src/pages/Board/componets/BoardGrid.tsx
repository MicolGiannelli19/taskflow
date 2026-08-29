// Board.jsx
// import React from "react";
// import { useEffect, useState } from "react";
import Column from "./Column";
import BoardSwitcher from "./BoardSwitcher";
import styles from "./BoardGrid.module.css";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { ColumnType, TicketTypeSmall } from "../../../types";

// import { title } from "process";
// fetch board API Call
// Create ticket api call

// export async function fetchUsers() {
//   const res = await fetch(`${API_BASE}/users`);
//   return res.json();
// }
interface BoardGridProps {
  boardId: string;
  columns: ColumnType[];
  tickets: TicketTypeSmall[];
}

export default function BoardGrid({ boardId, columns, tickets }: BoardGridProps) {
  return (
    <div className={styles.boardgrid}>
      <div className={styles.header}>
        <div>Task Flow</div>

        <BoardSwitcher />
        <Button asChild>
          <Link to="new-ticket">Add New Ticket</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/login">Log in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">Home</Link>
        </Button>
      </div>

      {/* TODO: change this so that it displays the correct thing */}
      <div className={styles.mainBoard}>
        {columns.map((col) => (
          // TODO: ticket proably shouldn't be a child of board ticket should just be displayed in the board it is assigned in ?
          <Column
            key={col.id}
            boardId={boardId}
            columnId={col.id}
            title={col.name}
            columns={columns}
            tickets={tickets.filter((t) => t.column_id === col.id)}
          />

        ))}
      </div>
    </div>
  );
}

// I need to investigate the relationship between doing things in the frontend and in the backend in things such as column renaming