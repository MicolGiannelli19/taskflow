import Board from "./components/board"; // capitalize to match file name
import NewTicketForm from "./components/NewTicketForm";
import "./App.css";
import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import type { BoardType } from "./types";

function App() {
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
  //   HANDLE NEW TICKET SHOULD NOW HAPPEN ON BOARD SUBMISSION
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
    <div className="App">
      <Routes>
        <Route path="/" element={<Board boardData={boardData}></Board>} />
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
