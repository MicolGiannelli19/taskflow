import { useAuth } from "./useAuth";
import { useBoardMembers, type BoardRole } from "./useBoardMembers";

// Mirrors the backend's `require_board_role`: viewers read, members and up write.
const EDIT_ROLES: BoardRole[] = ["owner", "admin", "member"];
// Deleting someone else's comment is moderation, not authorship.
const MODERATE_ROLES: BoardRole[] = ["owner", "admin"];

/** The signed-in user's role on a board, and what it lets them do. */
export function useBoardPermissions(boardId: string | undefined, enabled = true) {
  const { user } = useAuth();
  const { data: members } = useBoardMembers(boardId ?? "", enabled && !!boardId);

  const role = members?.find((m) => m.user_id === user?.id)?.role;
  return {
    role,
    canEdit: !!role && EDIT_ROLES.includes(role),
    canModerate: !!role && MODERATE_ROLES.includes(role),
  };
}
