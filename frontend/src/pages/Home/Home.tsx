import { Link } from "react-router-dom";
import { useBoards } from "../../hooks/useBoards";
import { useDeleteBoard } from "../../hooks/useDeleteBoard";
import BoardElement from "./components/BoardElemnet";
import type { BoardSummary } from "../../types";

export default function Home() {
  const { data: boards = [], isLoading, isError } = useBoards();
  const deleteBoard = useDeleteBoard();

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
