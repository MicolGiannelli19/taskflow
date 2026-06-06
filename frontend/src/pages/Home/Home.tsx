import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../../api/axios";
import { useBoards } from "../../hooks/useBoards";
import BoardElement from "./components/BoardElemnet";
import type { BoardSummary } from "../../types";

export default function Home() {
  const queryClient = useQueryClient();

  const { data: boards = [], isLoading, isError } = useBoards();

  const deleteBoard = useMutation({
    mutationFn: (id: string) => instance.delete(`/boards/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["boards"] });
      const previous = queryClient.getQueryData<BoardSummary[]>(["boards"]);
      queryClient.setQueryData<BoardSummary[]>(["boards"], (old) =>
        old?.filter((b) => b.id !== id) ?? []
      );
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["boards"], context.previous);
      }
      console.error("failed to delete board, rolled back:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
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
