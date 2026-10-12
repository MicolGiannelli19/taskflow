import { useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axios";
import type { BoardData } from "./useBoard";
import type { TicketEditPatch } from "./useUpdateTicket";

/**
 * Edit any ticket on a board from the board itself (the command palette's
 * priority / assignee / due date actions). Unlike `useUpdateTicket`, which is
 * bound to the one ticket a modal shows, this takes the ticket per call, and it
 * updates the card optimistically so the change shows at once.
 */
export function useUpdateBoardTicket(boardId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["board", boardId];

  return useMutation({
    mutationFn: ({ ticketId, patch }: { ticketId: string; patch: TicketEditPatch }) =>
      instance.patch(`/boards/${boardId}/tickets/${ticketId}`, patch),

    onMutate: async ({ ticketId, patch }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<BoardData>(queryKey);
      queryClient.setQueryData<BoardData>(queryKey, (old) =>
        old && {
          ...old,
          tickets: old.tickets.map((t) => {
            if (t.id !== ticketId) return t;
            const next = { ...t };
            if (patch.title !== undefined) next.title = patch.title;
            if (patch.priority !== undefined) next.priority = patch.priority;
            if (patch.assignee_id !== undefined) next.assignee_id = patch.assignee_id;
            if (patch.due_date !== undefined) next.due_date = patch.due_date;
            return next;
          }),
        }
      );
      return { previous };
    },

    onError: (err, _vars, ctx) => {
      console.error("failed to update ticket, rolled back:", err);
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
    },

    onSettled: (_res, _err, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["ticket", boardId, ticketId] });
    },
  });
}
