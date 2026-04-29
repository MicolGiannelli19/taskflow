import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import instance from "../../api/axios";
import BoardElement from "./components/BoardElemnet";
import type { BoardSummary } from "../../types";

export default function Home() {
  const [boards, setBoards] = useState<BoardSummary[]>([]);

  useEffect(() => {
    instance.get("/boards")
      .then((res) => setBoards(res.data))
      .catch((err) => console.error("failed to fetch boards:", err));
  }, []);

  const handleEdit = (board: BoardSummary) => {
    // TODO: open edit modal
    console.log("edit", board);
  };

  const handleDelete = (id: string) => {
    // TODO: add optimistic ui update and error handling
    instance.delete(`/boards/${id}`)
      .then(() => setBoards(boards.filter((b) => b.id !== id)))
      .catch((err) => console.error("failed to delete board:", err));
  };

  return (
    <div>
      <h1>Your Boards</h1>
      <Link to="/new-board"><button>New Board</button></Link>
      <ul>
        {boards.map((board) => (
          <BoardElement
            key={board.id}
            board={board}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </ul>
    </div>
  );
}
