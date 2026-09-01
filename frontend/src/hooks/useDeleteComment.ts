import { useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axios";

export function useDeleteComment(boardId: string, ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) =>
      instance.delete(
        `/boards/${boardId}/tickets/${ticketId}/comments/${commentId}`
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", boardId, ticketId] });
    },

    onError: (err) => console.error("failed to delete comment:", err),
  });
}
