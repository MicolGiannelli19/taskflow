import { useMutation, useQueryClient } from "@tanstack/react-query";
import instance from "../api/axios";
import type { UserType } from "../types";
import { useAuth } from "./useAuth";

/**
 * Fields the API accepts on PATCH /auth/me. Both are optional — an omitted
 * field is left alone, and an empty string clears the stored value.
 *
 * Email is absent on purpose: it identifies the account for sign-in, and the
 * endpoint has no way to change it.
 */
export interface ProfileUpdateInput {
  name?: string;
  avatar?: string;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();

  return useMutation({
    mutationFn: (input: ProfileUpdateInput) =>
      instance.patch<UserType>("/auth/me", input).then((r) => r.data),

    // The response is the saved record, so it can seed the cache directly
    // instead of costing a refetch.
    onSuccess: (user) => {
      queryClient.setQueryData(["profile"], user);
      updateUser(user);
    },

    onError: (err) => console.error("failed to update profile:", err),
  });
}
