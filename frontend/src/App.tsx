import Board from "./components/Board"; // capitalize to match file name
import NewTicketForm from "./components/NewTicketForm";
import LogInForm from ""
import "./App.css";
import { Routes, Route, useNavigate} from "react-router-dom";
import { useState, useEffect } from "react";
import type { ColumnType, TicketTypeSmall, TicketFormData } from "./types";
import instance from "./api/axios";

// interface BoardData {
//   columns: ColumnType[];
//   tickets: TicketType[];
// }

// TODO: this logic should be moved to board rather then app 
function App() {
  // const [boardData, setBoardData] = useState<BoardType | null>(null);
  const navigate = useNavigate();
  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [tickets, setTickets] = useState<TicketTypeSmall[]>([]);

  useEffect(() => {
    const fetchBoard = async () => {
      try {

        // TODO: this should be changed so board ID is a constant of this board or somethin
        const { data } = await instance.get(
          "/boards/b0000000-0000-0000-0000-000000000001"
        );

        setColumns(data.columns);
        setTickets(data.tickets);
      } catch (error) {
        console.error("Error fetching board:", error);
      }
    };

    fetchBoard();
  }, []);

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
  // HANDLE NEW TICKET SHOULD NOW HAPPEN ON BOARD SUBMISSION
  const handleNewTicket = async (newTicketData: TicketFormData) => {
    
    // pass in value of form here
    // should this be the saame function to edit a ticket?
    // For now this is a basic function with no optimisitc updates
    console.log("newTicketData", newTicketData);
    
    const response = await instance.post("/tickets", newTicketData);
    console.log("Response from creating ticket:", response.data);

    // // Set new Global State for tickets
    // setTickets((prevTickets) => {
    //   return [
    //     ...prevTickets,
    //     {
    //       // TODO: chack this is good practice
    //       id: crypto.randomUUID(), // temporary id until we get from backend
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
        <Route
          path="/login"
          element={
            <
          }
        />
      </Routes>
    </div>
  );
}

export default App;
