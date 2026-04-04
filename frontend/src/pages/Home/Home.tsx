import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import instance from "../../api/axios";

interface Board {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
}

export default function Home() {
  const [boards, setBoards] = useState<Board[]>([]);

  useEffect(() => {
    instance.get("/boards").then((res) => setBoards(res.data));
  }, []);

  return (
    <div>
      <h1>Your Boards</h1>
      <ul>
        {boards.map((board) => (
          <li key={board.id}>
            <Link to={`/board/${board.id}`}>{board.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}