import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import styles from "./BoardElement.module.css";
import { Button } from "@/components/ui/button";
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(board)}
          aria-label="Edit board"
        >
          <Pencil size={14} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(board.id)}
          aria-label="Delete board"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </li>
  );
}
