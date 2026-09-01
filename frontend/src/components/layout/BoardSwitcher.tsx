import { useNavigate, useParams } from "react-router-dom";
import { useBoards } from "@/hooks/useBoards";
import { paths } from "@/routes";

export default function BoardSwitcher() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { data: boards = [], isLoading } = useBoards();

  if (isLoading) return null;

  return (
    <select
      value={boardId ?? ""}
      onChange={(e) => navigate(paths.board(e.target.value))}
    >
      {/* Off a board route there is nothing selected yet. */}
      {!boardId && <option value="" disabled>Select a board…</option>}
      {boards.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}
