import { useQuery } from "@tanstack/react-query";
import instance from "../api/axios";
import type { UserType } from "../types";

/**
 * The signed-in user's own profile, straight from the API.
 *
 * `useAuth().user` is the copy written to localStorage at login and never
 * refreshed, so it drifts as soon as the account changes anywhere else. The
 * profile page shows the stored record instead.
 */
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => instance.get<UserType>("/auth/me").then((r) => r.data),
  });
}
