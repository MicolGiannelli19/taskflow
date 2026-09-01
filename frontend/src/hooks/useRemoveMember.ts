import { useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axios";
import type { BoardMember } from "./useBoardMembers";

export function useRemoveMember(boardId: string) {
  const queryClient = useQueryClient();
  const key = ["board-members", boardId];

  return useMutation({
    mutationFn: (userId: string) =>
      instance.delete(`/boards/${boardId}/members/${userId}`),

    // Optimistic, like useDeleteBoard: the row disappears on click and comes
    // back if the API refuses (e.g. removing the last owner).
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardMember[]>(key);
      queryClient.setQueryData<BoardMember[]>(key, (old) =>
        old?.filter((m) => m.user_id !== userId) ?? []
      );
      return { previous };
    },

    onError: (err, _userId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
      console.error("failed to remove member, rolled back:", err);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
