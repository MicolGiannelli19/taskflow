import Board from "./components/board"; // capitalize to match file name
import NewTicketForm from "./components/NewTicketForm";
import "./App.css";
import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import type { ColumnType, TicketType } from "./types";

function App() {
  // const [boardData, setBoardData] = useState<BoardType | null>(null);

  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);

  useEffect(() => {
    //     id: "12345",
    // title: "Micol Board",
    const mockTickets: TicketType[] = [
      { id: "h234567", title: "Design Data Model", columnID: "234567" },
      { id: "h209765", title: "Build React App", columnID: "234567" },
      { id: "h23ertyui7", title: "Build Backend", columnID: "234567" },
      { id: "90734567", title: "Project Set Up", columnID: "2dlkjgas7" },
      { id: "90709765", title: "Architecure plan", columnID: "2dlkjgas7" },
    ];

    const mockColumns: ColumnType[] = [
      { id: "234567", title: "TO-DO" },
      { id: "2dlkjgas7", title: "IN PROGRESS" },
      { id: "ABCD", title: "DONE" },
    ];

    setColumns(mockColumns);
    setTickets(mockTickets);
  }, []); // empty list here means effect happens only on mount

  if (!columns) {
    return <div>Loading...</div>;
  }

  // const moveTicket = (ticetId, columnId) => {
  //   // make post request ???
  //   setBoardData( (prevBoardData) => {

  //   }
  // }

  // TODO: Fix syntax
  // TODO: add logic to re introduce ticket in backend and look up how this should be done
  //   HANDLE NEW TICKET SHOULD NOW HAPPEN ON BOARD SUBMISSION
  const handleNewTicket = () => {
    // pass in value of form here

    setTickets((prevTickets) => {
      return [
        ...prevTickets,
        {
          id: crypto.randomUUID(),
          title: "Test ticket added with button",
          columnID: "234567",
        },
      ];
    });
  };

  return (
    <div className="App">
      <Routes>
        <Route
          path="/"
          element={<Board columns={columns} tickets={tickets}></Board>}
        />
        <Route
          path="/new-ticket"
          element={
            <NewTicketForm handleSubmit={handleNewTicket}></NewTicketForm>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
