// Board.jsx
// import React from "react";
import { useEffect, useState } from "react";
import Column from "./Column";
import styles from "./Board.module.css";
import type { BoardType } from "../types";

// import { title } from "process";
// fetch board API Call
// Create ticket api call

// where should this be stored ?
// export const API_BASE = "http://localhost:8000";

// export async function fetchUsers() {
//   const res = await fetch(`${API_BASE}/users`);
//   return res.json();
// }

export default function Board() {
  // TODO set a default
  const [boardData, setBoardData] = useState<BoardType | null>(null);

  useEffect(() => {
    const mockBoard: BoardType = {
      id: "12345",
      title: "Micol Board",
      columns: [
        {
          id: "234567",
          title: "TO-DO",
        },
        {
          id: "2dlkjgas7",
          title: "In Progress",
        },
        {
          id: "234567oiu7654",
          title: "Done",
        },
      ],
      tickets: [
        { id: "h234567", title: "Design Data Model", columnID: "234567" },
        { id: "h209765", title: "Build React App", columnID: "234567" },
        { id: "h23ertyui7", title: "Build Backend", columnID: "234567" },
        { id: "90734567", title: "Project Set Up", columnID: "2dlkjgas7" },
        { id: "90709765", title: "Architecure plan", columnID: "2dlkjgas7" },
      ],
    };

    setBoardData(mockBoard);
  }, []);

  if (!boardData) {
    return <div>Loading...</div>;
  }

  // TODO: Fix syntax
  // TODO: add logic to re introduce ticket in backend and look up how this should be done
  const handleNewTicket = () => {
    console.log("New Ticket Creation button was clicked");

    setBoardData((prevBoardData) => {
      if (!prevBoardData) return prevBoardData;

      return {
        ...prevBoardData,
        tickets: [
          ...prevBoardData.tickets,
          {
            id: crypto.randomUUID(),
            title: "Test ticket added with button",
            columnID: "234567",
          },
        ],
      };
    });
  };

  return (
    <div className={styles.board}>
      <div className={styles.header}>
        <div>{boardData.title}</div>

        {/* TODO: add on click action that get the correct col */}
        <button onClick={handleNewTicket}>Create Ticket</button>
      </div>

      {/* TODO: change this so that it displays the correct thing */}
      <div className={styles.mainBoard}>
        {boardData.columns.map((col) => (
          <Column
            key={col.id}
            title={col.title} // QUESTION: should the json be unpacked defining the props here or wihtin column
            tickets={boardData.tickets.filter((t) => t.columnID === col.id)}
          />
        ))}
      </div>
    </div>
  );
}

// I need to investigate the relationship between doing things in the frontend and in the backend in things such as column renaming
