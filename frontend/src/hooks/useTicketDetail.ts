import { useQuery } from "@tanstack/react-query";
import instance from "../api/axios";
import type { TicketDetailed } from "../types";

export function useTicketDetail(
  boardId: string,
  ticketId: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: ["ticket", boardId, ticketId],
    queryFn: () =>
      instance
        .get<TicketDetailed>(`/boards/${boardId}/tickets/${ticketId}`)
        .then((r) => r.data),
    enabled: enabled && !!ticketId,
  });
}
