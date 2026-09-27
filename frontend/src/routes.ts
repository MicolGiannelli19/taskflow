/**
 * Single source of truth for URL structure.
 *
 * `routePatterns` are the `:param` templates handed to <Route path>; `paths`
 * builds concrete URLs for <Link to>/navigate(). Never hand-write a route
 * string elsewhere — add it here so a URL change is a one-file edit.
 *
 * Clerk's <SignIn>, <SignUp> and <UserProfile> run their own sub-routes (2FA,
 * email verification, security settings), so their patterns end in `/*` while
 * `paths` stays the plain URL those components are mounted at.
 */
export const routePatterns = {
  home: "/",
  login: "/login/*",
  signUp: "/sign-up/*",
  newBoard: "/new-board",
  profile: "/profile/*",
  board: "/board/:boardId",
  /** Nested under `board`, so it is declared as a relative segment. */
  newTicket: "new-ticket",
  ticket: "/board/:boardId/ticket/:ticketId",
  boardHistory: "/board/:boardId/history",
  boardSettings: "/board/:boardId/settings",
} as const;

export const paths = {
  home: "/",
  login: "/login",
  signUp: "/sign-up",
  newBoard: "/new-board",
  profile: "/profile",
  board: (boardId: string) => `/board/${boardId}`,
  newTicket: (boardId: string) => `/board/${boardId}/new-ticket`,
  ticket: (boardId: string, ticketId: string) =>
    `/board/${boardId}/ticket/${ticketId}`,
  boardHistory: (boardId: string) => `/board/${boardId}/history`,
  boardSettings: (boardId: string) => `/board/${boardId}/settings`,
} as const;
