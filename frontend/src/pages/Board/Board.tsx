// Board.jsx
// import React from "react";
// import { useEffect, useState } from "react";
import BoardGrid from "./componets/BoardGrid";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import type { ColumnType, TicketTypeSmall } from "../../types";
import type { TicketFormData } from "../../types";
import { useState, useEffect } from "react";
import instance from "../../api/axios";

export default function Board() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [tickets, setTickets] = useState<TicketTypeSmall[]>([]);
  // const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const { data } = await instance.get(`/boards/${boardId}`);
        setColumns(data.columns);
        setTickets(data.tickets);
      } catch (error) {
        console.error("Error fetching board:", error);
      }
    };

    fetchBoard();
  }, []);

  // const handleNewTicket = async (newTicketData: TicketFormData) => {
    
  //   // pass in value of form here
  //   // should this be the same function to edit a ticket?
  //   // For now this is a basic function with no optimisitc updates
  //   console.log("newTicketData", newTicketData);
    
  //   const response = await instance.post("/tickets", newTicketData);
  //   console.log("Response from creating ticket:", response.data);

  //   // // Set new Global State for tickets
  //   // setTickets((prevTickets) => {
  //   //   return [
  //   //     ...prevTickets,
  //   //     {
  //   //       // TODO: chack this is good practice
  //   //       id: crypto.randomUUID(), // temporary id until we get from backend
  //   //       title: newTicketData.title,
  //   //       columnID: "234567", // default to TO-DO column
  //   //     },
  //   //   ];
  //   // });

  //   // Navigate back to board view
  //   navigate("/");
  // };

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

  const handleNewTicket = async (newTicketData: TicketFormData) => {
    await instance.post("/tickets", newTicketData);
    navigate(`/board/${boardId}`);
  };

  return (
    <>
      <BoardGrid columns={columns} tickets={tickets} />
      <Outlet context={{ handleNewTicket }} />
    </>
  );
}

// I need to investigate the relationship between doing things in the frontend and in the backend in things such as column renaming
