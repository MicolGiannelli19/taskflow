import { useQuery } from "@tanstack/react-query";
import instance from "../api/axios";

export interface BoardMember {
  user_id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: "owner" | "admin" | "member" | "viewer";
}

export function useBoardMembers(boardId: string, enabled = true) {
  return useQuery({
    queryKey: ["board-members", boardId],
    queryFn: () =>
      instance
        .get<BoardMember[]>(`/boards/${boardId}/members`)
        .then((r) => r.data),
    enabled: enabled && !!boardId,
  });
}
