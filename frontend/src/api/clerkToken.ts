/**
 * Bridges Clerk's session token out to the axios instance.
 *
 * The request interceptor lives outside React, so it can't call Clerk's
 * `useAuth()` hook itself. `ClerkTokenBridge` renders inside `ClerkProvider`
 * and parks the hook's `getToken` here for the interceptor to await.
 *
 * Clerk mints short-lived tokens and refreshes them on demand, so this is
 * called per request rather than cached — that is the intended usage, and it
 * resolves from memory when the current token is still valid.
 */
type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

export function setTokenGetter(fn: TokenGetter | null) {
  tokenGetter = fn;
}

/** Resolves null before Clerk has loaded, or when nobody is signed in. */
export async function getAuthToken(): Promise<string | null> {
  if (!tokenGetter) return null;
  try {
    return await tokenGetter();
  } catch {
    // A failed refresh is an unauthenticated request, not a crash — the 401
    // interceptor turns it into a redirect.
    return null;
  }
}
