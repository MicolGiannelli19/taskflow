import { useQuery } from "@tanstack/react-query";
import instance from "../api/axios";
import type { BoardSummary } from "../types";

export function useBoards() {
  return useQuery({
    queryKey: ["boards"],
    queryFn: () => instance.get<BoardSummary[]>("/boards").then((r) => r.data),
  });
}
