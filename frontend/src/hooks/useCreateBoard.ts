import { useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axios";

export function useCreateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      instance.post("/boards", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["boards"] }),
    onError: (err) => console.error("failed to create board:", err),
  });
}
