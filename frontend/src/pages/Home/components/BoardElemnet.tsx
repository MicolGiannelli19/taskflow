import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import styles from "./BoardElement.module.css";
import type { BoardSummary } from "../../../types";

interface Props {
  board: BoardSummary;
  onEdit: (board: BoardSummary) => void;
  onDelete: (id: string) => void;
}

export default function BoardElement({ board, onEdit, onDelete }: Props) {
  return (
    <li className={styles.item}>
      <Link to={`/board/${board.id}`} className={styles.name}>
        {board.name}
      </Link>
      <div className={styles.actions}>
        <button
          onClick={() => onEdit(board)}
          aria-label="Edit board"
          className={styles.iconButton}
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(board.id)}
          aria-label="Delete board"
          className={`${styles.iconButton} ${styles.danger}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}
