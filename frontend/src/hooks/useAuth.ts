import { useAuth as useClerkAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import instance from "@/api/axios";
import type { UserType } from "@/types";

/**
 * The signed-in user as TaskFlow knows them.
 *
 * Clerk owns the session; the backend owns identity. `user.id` here is the
 * local `users.id` UUID, not the Clerk ID — board membership, ticket
 * assignees and comment authors are all stored against it, so every call site
 * comparing `user?.id` keeps working unchanged.
 *
 * The backend resolves the Clerk token to this record (creating it on first
 * sight), so a signed-in user always has one.
 */
export function useAuth() {
  const { isLoaded, isSignedIn } = useClerkAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => instance.get<UserType>("/auth/me").then((r) => r.data),
    // Nothing to fetch until Clerk can attach a token to the request.
    enabled: isLoaded && Boolean(isSignedIn),
    staleTime: 5 * 60 * 1000,
  });

  return {
    user: data ?? null,
    // Signed out is a settled state, not a loading one — otherwise RequireAuth
    // would spin forever instead of redirecting.
    isLoading: !isLoaded || (Boolean(isSignedIn) && isLoading),
  };
}
