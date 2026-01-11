import Board from "./components/Board"; // capitalize to match file name
import NewTicketForm from "./components/NewTicketForm";
import "./App.css";
import { Routes, Route, useNavigate} from "react-router-dom";
import { useState, useEffect } from "react";
import type { ColumnType, TicketType, TicketFormData } from "./types";
import axios, { AxiosError } from "axios";

interface BoardData {
  columns: ColumnType[];
  tickets: TicketType[];
}

function App() {
  // const [boardData, setBoardData] = useState<BoardType | null>(null);
  const navigate = useNavigate();
  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);

  useEffect(() => {
    // id: "12345",
    // title: "Micol Board",
    const mockTickets: TicketType[] = [
      { id: "h234567", title: "Design Data Model", columnID: "234567" },
      { id: "h209765", title: "Build React App", columnID: "234567" },
      { id: "h23ertyui7", title: "Build Backend", columnID: "234567" },
      { id: "90734567", title: "Project Set Up", columnID: "2dlkjgas7" },
      { id: "90709765", title: "Architecure plan", columnID: "2dlkjgas7" },
    ];

    // Unsure about the getting the coloumns
    const mockColumns: ColumnType[] = [
      { id: "234567", title: "TO-DO" },
      { id: "2dlkjgas7", title: "IN PROGRESS" },
      { id: "ABCD", title: "DONE" },
    ];

    // TODO: set baseURL in axios config file
    // Set board id as constant for now
    axios.get("http://localhost:8000/boards/550e8400-e29b-41d4-a716-446655440001").then((response) => {
      const boardData = response.data;
      setColumns(boardData.columns);
      setTickets(boardData.tickets);
    }).catch((error) => {
      console.error("Error fetching board data:", error);
      // Fallback to mock data in case of error
      setColumns(mockColumns); // todo this should be changed
      setTickets(mockTickets);
    });

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
  const handleNewTicket = async (newTicketData: TicketFormData) => {
    // pass in value of form here
    // should this be the saame function to edit a ticket?
    // For now this is a basic function with no optimisitc updates
    console.log("newTicketData", newTicketData);
    
    // const response = await fetch(`{}tickets`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify(newTicketData),
    // });

    // // Set new Global State for tickets
    // setTickets((prevTickets) => {
    //   return [
    //     ...prevTickets,
    //     {
    //       id: crypto.randomUUID(),
    //       title: newTicketData.title,
    //       columnID: "234567", // default to TO-DO column
    //     },
    //   ];
    // });

    // Navigate back to board view
    navigate("/");
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
