import { useAuth } from "@clerk/react";
import { useEffect } from "react";
import { setTokenGetter } from "@/api/clerkToken";

/**
 * Renders nothing. Its only job is to hand Clerk's `getToken` to the axios
 * layer, which can't use hooks. Must render inside `ClerkProvider`.
 */
export default function ClerkTokenBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setTokenGetter(() => getToken());
    return () => setTokenGetter(null);
  }, [getToken]);

  return null;
}
