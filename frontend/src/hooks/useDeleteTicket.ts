import { useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axios";
import type { ColumnType, TicketTypeSmall } from "../types";

interface BoardCache {
  columns: ColumnType[];
  tickets: TicketTypeSmall[];
}

export function useDeleteTicket(boardId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["board", boardId];

  return useMutation({
    mutationFn: (ticketId: string) =>
      instance.delete(`/boards/${boardId}/tickets/${ticketId}`),

    // Gone from the board at once; put back if the server refuses.
    onMutate: async (ticketId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<BoardCache>(queryKey);
      queryClient.setQueryData<BoardCache>(queryKey, (old) =>
        old && { ...old, tickets: old.tickets.filter((t) => t.id !== ticketId) }
      );
      return { previous };
    },

    onError: (err, _ticketId, ctx) => {
      console.error("failed to delete ticket, rolled back:", err);
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
    },

    onSuccess: (_res, ticketId) => {
      queryClient.removeQueries({ queryKey: ["ticket", boardId, ticketId] });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
