import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../../api/axios";
import BoardElement from "./components/BoardElemnet";
import type { BoardSummary } from "../../types";

export default function Home() {
  const queryClient = useQueryClient();

  const { data: boards = [], isLoading, isError } = useQuery({
    queryKey: ["boards"],
    queryFn: () => instance.get<BoardSummary[]>("/boards").then((r) => r.data),
  });

  const deleteBoard = useMutation({
    mutationFn: (id: string) => instance.delete(`/boards/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["boards"] }),
    onError: (err) => console.error("failed to delete board:", err),
  });

  const handleEdit = (board: BoardSummary) => {
    // TODO: open edit modal
    console.log("edit", board);
  };

  return (
    <div>
      <h1>Your Boards</h1>
      <Link to="/new-board"><button>New Board</button></Link>
      {isLoading && <p>Loading…</p>}
      {isError && <p>Failed to load boards.</p>}
      <ul>
        {boards.map((board) => (
          <BoardElement
            key={board.id}
            board={board}
            onEdit={handleEdit}
            onDelete={(id) => deleteBoard.mutate(id)}
          />
        ))}
      </ul>
    </div>
  );
}
