import { useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axios";
import type { CommentType } from "../types";

export function useUpdateComment(boardId: string, ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      instance
        .patch<CommentType>(
          `/boards/${boardId}/tickets/${ticketId}/comments/${commentId}`,
          { content }
        )
        .then((r) => r.data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", boardId, ticketId] });
    },

    onError: (err) => console.error("failed to edit comment:", err),
  });
}
