import BoardGrid from "./componets/BoardGrid";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ColumnType, TicketTypeSmall, TicketFormData } from "../../types";
import instance from "../../api/axios";
import { useCreateTicket } from "../../hooks/useCreateTicket";
import { paths } from "../../routes";

interface BoardData {
  columns: ColumnType[];
  tickets: TicketTypeSmall[];
}

export default function Board() {
  const { boardId } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () =>
      instance.get<BoardData>(`/boards/${boardId}`).then((r) => r.data),
    enabled: !!boardId,
  });

  const columns = data?.columns ?? [];
  const tickets = data?.tickets ?? [];

  const createTicket = useCreateTicket(boardId!);

  const handleNewTicket = (newTicketData: TicketFormData) => {
    const backlogColumn =
      columns.find((col) => col.name === "Backlog") ?? columns[0];
    createTicket.mutate(
      { ...newTicketData, column_id: backlogColumn.id },
      { onSuccess: () => navigate(paths.board(boardId!)) }
    );
  };

  return (
    <>
      {isLoading && <p>Loading…</p>}
      {isError && <p>Failed to load board.</p>}
      {!isLoading && !isError && (
        <BoardGrid boardId={boardId!} columns={columns} tickets={tickets} />
      )}
      {/* Nested "new-ticket" route renders as a Dialog overlaying the board. */}
      <Outlet context={{ handleNewTicket }} />
    </>
  );
}
