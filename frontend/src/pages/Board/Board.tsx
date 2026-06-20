import BoardGrid from "./componets/BoardGrid";
import { Outlet, useNavigate, useParams, useOutlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ColumnType, TicketTypeSmall, TicketFormData } from "../../types";
import instance from "../../api/axios";
import { useCreateTicket } from "../../hooks/useCreateTicket";

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
      { onSuccess: () => navigate(`/board/${boardId}`) }
    );
  };

  const outlet = useOutlet();

  return (
    <>
      {!outlet && (
        <>
          {isLoading && <p>Loading…</p>}
          {isError && <p>Failed to load board.</p>}
          {!isLoading && !isError && (
            <BoardGrid boardId={boardId!} columns={columns} tickets={tickets} />
          )}
        </>
      )}
      <Outlet context={{ handleNewTicket }} />
    </>
  );
}
