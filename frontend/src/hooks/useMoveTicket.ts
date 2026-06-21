import { useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axios";
import type { ColumnType, TicketTypeSmall } from "../types";

interface BoardCache {
  columns: ColumnType[];
  tickets: TicketTypeSmall[];
}

export function useMoveTicket(boardId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["board", boardId];

  return useMutation({
    mutationFn: ({ ticketId, columnId }: { ticketId: string; columnId: string }) =>
      instance.patch(`/boards/${boardId}/tickets/${ticketId}`, {
        column_id: columnId,
      }),

    onMutate: async ({ ticketId, columnId }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<BoardCache>(queryKey);

      queryClient.setQueryData<BoardCache>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          tickets: old.tickets.map((t) =>
            t.id === ticketId ? { ...t, column_id: columnId } : t
          ),
        };
      });

      return { previous };
    },

    onError: (err, _vars, ctx) => {
      console.error("failed to move ticket:", err);
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
