import { useNavigate, useParams } from "react-router-dom";
import { useBoards } from "../../../hooks/useBoards";

export default function BoardSwitcher() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { data: boards = [], isLoading } = useBoards();

  if (isLoading) return null;

  return (
    <select
      value={boardId ?? ""}
      onChange={(e) => navigate(`/board/${e.target.value}`)}
    >
      {boards.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}
