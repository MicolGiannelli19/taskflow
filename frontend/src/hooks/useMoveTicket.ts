import { useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axios";

export function useMoveTicket(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, columnId }: { ticketId: string; columnId: string }) =>
      instance.patch(`/boards/${boardId}/tickets/${ticketId}`, {
        column_id: columnId,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
    onError: (err) => console.error("failed to move ticket:", err),
  });
}
