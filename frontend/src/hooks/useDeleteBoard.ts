import { useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axios";
import type { BoardSummary } from "../types";

export function useDeleteBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => instance.delete(`/boards/${id}`),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["boards"] });
      const previous = queryClient.getQueryData<BoardSummary[]>(["boards"]);
      queryClient.setQueryData<BoardSummary[]>(["boards"], (old) =>
        old?.filter((b) => b.id !== id) ?? []
      );
      return { previous };
    },

    onError: (err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["boards"], context.previous);
      }
      console.error("failed to delete board, rolled back:", err);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });
}
