import { useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axios";
import type { TicketFormData } from "../types";

export function useCreateTicket(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TicketFormData) =>
      instance.post<{ id: string }>(`/boards/${boardId}/tickets`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
    onError: (err) => console.error("failed to create ticket:", err),
  });
}
