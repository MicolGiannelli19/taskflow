// Board.jsx
// import React from "react";
// import { useEffect, useState } from "react";
import BoardGrid from "./componets/BoardGrid";
import { Outlet, useNavigate, useParams, useOutlet } from "react-router-dom";
import type { ColumnType, TicketTypeSmall, TicketFormData } from "../../types";
import { useState, useEffect } from "react";
import instance from "../../api/axios";

export default function Board() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [tickets, setTickets] = useState<TicketTypeSmall[]>([]);
  // TODO: replace with React Query — this refetchKey pattern is a temporary solution
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    const fetchBoard = async () => {
      console.log("fetching data for board id: ", boardId)
      try {
        const { data } = await instance.get(`/boards/${boardId}`);
        console.log(data)
        setColumns(data.columns);
        setTickets(data.tickets);
      } catch (error) {
        console.error("Error fetching board:", error);
      }
    };

    fetchBoard();
  }, [refetchKey]);

  const handleNewTicket = async (newTicketData: TicketFormData) => {
    
    // pass in value of form here
    // should this be the same function to edit a ticket?
    // For now this is a basic function with no optimisitc updates
    console.log("submitting ticket", newTicketData, `to /boards/${boardId}/tickets`);
    const backlogColumn = columns.find((col) => col.name === "Backlog") ?? columns[0];
    try {
      const response = await instance.post(`/boards/${boardId}/tickets`, {
        ...newTicketData,
        column_id: backlogColumn.id,
      });
      console.log("ticket created:", response.data);
      setRefetchKey((k) => k + 1);
      navigate(`/board/${boardId}`);
    } catch (error) {
      console.error("failed to create ticket:", error);
    }
  };

  //  I think we are putting move ticket ehre for optmistic rendering review this pattern
  // const moveTicket = (ticetId, columnId) => {
  //   // make post request ???
  //   setBoardData( (prevBoardData) => {

  //   }
  // }

  // TODO: Fix syntax
  // TODO: add logic to re introduce ticket in backend and look up how this should be done
  // HANDLE NEW TICKET SHOULD NOW HAPPEN ON BOARD SUBMISSION

  // if (isLoading) {
  //   return <div>Loading...</div>;
  // }

  // const handleNewTicket = async (newTicketData: TicketFormData) => {
  //   await instance.post("/tickets", newTicketData);
  //   navigate(`/board/${boardId}`);
  // };

  const outlet = useOutlet();

  return (
    <>
      {!outlet && <BoardGrid columns={columns} tickets={tickets} />}
      <Outlet context={{ handleNewTicket }} />
    </>
  );
}

// I need to investigate the relationship between doing things in the frontend and in the backend in things such as column renaming
