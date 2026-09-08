import axios from "axios";

/**
 * The message to show a user for a failed request.
 *
 * The API's error handlers all answer with `{ error, detail }` (see
 * `backend/app/main.py`), and `detail` is already written for humans — "No user
 * with email x@y.com", "User is already a member of this board". Prefer it, and
 * fall back to the caller's wording when the failure came from somewhere else
 * (network down, unexpected shape).
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
  }
  return fallback;
}
