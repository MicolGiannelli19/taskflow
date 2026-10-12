import { useQuery } from "@tanstack/react-query";
import instance from "../api/axios";
import type { ColumnType, TicketTypeSmall } from "../types";

export interface BoardData {
  columns: ColumnType[];
  tickets: TicketTypeSmall[];
}

/**
 * A board's columns and tickets. The command palette passes
 * `refetchOnMount: false` so opening it reads the board page's cache instead of
 * firing another request.
 */
export function useBoard(boardId: string | undefined, { refetchOnMount = true } = {}) {
  return useQuery({
    queryKey: ["board", boardId],
    queryFn: () =>
      instance.get<BoardData>(`/boards/${boardId}`).then((r) => r.data),
    enabled: !!boardId,
    refetchOnMount,
  });
}
