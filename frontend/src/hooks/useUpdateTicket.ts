import { useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axios";
import type { TicketDetailed } from "../types";

// Only the fields this UI is allowed to edit. `column_id` / `position` stay with
// the drag-and-drop flow, so they are deliberately absent here.
export interface TicketEditPatch {
  title?: string;
  description?: string | null;
  priority?: "low" | "medium" | "high";
  assignee_id?: string | null;
  due_date?: string | null;
}

export function useUpdateTicket(boardId: string, ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: TicketEditPatch) =>
      instance
        .patch<TicketDetailed>(
          `/boards/${boardId}/tickets/${ticketId}`,
          patch
        )
        .then((r) => r.data),

    onSuccess: () => {
      // Refresh the modal…
      queryClient.invalidateQueries({ queryKey: ["ticket", boardId, ticketId] });
      // …and the card on the board (title / priority / assignee are shown there).
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },

    onError: (err) => console.error("failed to update ticket:", err),
  });
}
