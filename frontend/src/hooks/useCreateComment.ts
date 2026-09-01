import { useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axios";
import type { CommentType } from "../types";

export function useCreateComment(boardId: string, ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      instance
        .post<CommentType>(`/boards/${boardId}/tickets/${ticketId}/comments`, {
          content,
        })
        .then((r) => r.data),

    // The comment list lives inside the ticket payload, so that's what refetches.
    // The board cards don't show comments, so ["board", boardId] is left alone.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", boardId, ticketId] });
    },

    onError: (err) => console.error("failed to post comment:", err),
  });
}
