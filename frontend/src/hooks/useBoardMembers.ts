import { useQuery } from "@tanstack/react-query";
import instance from "../api/axios";

export type BoardRole = "owner" | "admin" | "member" | "viewer";

export interface BoardMember {
  user_id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: BoardRole;
  /** When the membership was created — not the user's account. */
  joined_at: string | null;
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
