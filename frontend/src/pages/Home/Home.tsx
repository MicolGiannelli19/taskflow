import { Link } from "react-router-dom";
import { useBoards } from "../../hooks/useBoards";
import { useDeleteBoard } from "../../hooks/useDeleteBoard";
import BoardElement from "./components/BoardElemnet";
import type { BoardSummary } from "../../types";
import { Button } from "@/components/ui/button";
import { paths } from "../../routes";
import styles from "./Home.module.css";

export default function Home() {
  const { data: boards = [], isLoading, isError } = useBoards();
  const deleteBoard = useDeleteBoard();

  const handleEdit = (board: BoardSummary) => {
    // TODO: open edit modal
    console.log("edit", board);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Your Boards</h1>
        <Button asChild><Link to={paths.newBoard}>New Board</Link></Button>
      </div>
      {isLoading && <p className={styles.muted}>Loading…</p>}
      {isError && <p className={styles.muted}>Failed to load boards.</p>}
      <ul className={styles.list}>
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
