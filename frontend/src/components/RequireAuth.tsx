import { useAuth as useClerkAuth } from "@clerk/react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { paths } from "@/routes";

/**
 * Layout route guarding every authenticated page — one auth check instead of
 * one per route. Remembers where the user was headed so sign-in can send them
 * back there.
 *
 * This gates on Clerk's session alone. The local profile is fetched separately
 * by `useAuth()`, so pages render as soon as the session is known rather than
 * waiting on a round trip to our API.
 */
export default function RequireAuth() {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const location = useLocation();

  if (!isLoaded) return <div>Loading...</div>;

  if (!isSignedIn) {
    return <Navigate to={paths.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
