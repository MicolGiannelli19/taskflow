import { useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axios";
import type { BoardMember, BoardRole } from "./useBoardMembers";

export interface AddMemberInput {
  email: string;
  /** `owner` is not offered: the API refuses it, ownership can't be handed over. */
  role: Exclude<BoardRole, "owner">;
}

export function useAddMember(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddMemberInput) =>
      instance
        .post<BoardMember>(`/boards/${boardId}/members`, input)
        .then((r) => r.data),

    // No optimistic insert: the row the API returns carries the invited user's
    // name and avatar, which an email address alone can't predict.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-members", boardId] });
    },

    onError: (err) => console.error("failed to add member:", err),
  });
}
