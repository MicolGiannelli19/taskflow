import { useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useBoardMembers, type BoardRole } from "@/hooks/useBoardMembers";
import { useRemoveMember } from "@/hooks/useRemoveMember";
import { apiErrorMessage } from "@/lib/apiError";
import AddMemberForm from "./AddMemberForm";
import styles from "./BoardSettings.module.css";

/** Owner reads as the strongest badge; everyone else stays quiet. */
const ROLE_BADGE: Record<BoardRole, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
  viewer: "outline",
};

/** "2026-09-01T14:28:24" → "1 Sep 2026". */
function formatJoined(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BoardSettings() {
  const { boardId } = useParams();
  const { user } = useAuth();
  const { data: members = [], isLoading, isError } = useBoardMembers(boardId!);
  const removeMember = useRemoveMember(boardId!);

  // Nothing returns the caller's own role, so it comes from finding yourself in
  // the roster. Undefined while the list loads — treated as read-only until then.
  const myRole = members.find((m) => m.user_id === user?.id)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Board settings</h1>
      </header>

      <section className={styles.card} aria-labelledby="members-heading">
        <div className={styles.cardHeader}>
          <h2 id="members-heading">Members</h2>
          {!isLoading && !isError && (
            <span className={styles.count}>
              {members.length} {members.length === 1 ? "person" : "people"}
            </span>
          )}
        </div>

        {canManage && <AddMemberForm boardId={boardId!} />}

        {isLoading && <p className={styles.muted}>Loading members…</p>}
        {isError && <p className={styles.muted}>Failed to load members.</p>}

        {removeMember.isError && (
          <p role="alert" className={styles.error}>
            {apiErrorMessage(removeMember.error, "Could not remove that member.")}
          </p>
        )}

        {!isLoading && !isError && (
          <ul className={styles.list}>
            {members.map((member) => {
              const isSelf = member.user_id === user?.id;
              const joined = formatJoined(member.joined_at);
              // The owner can't be removed (the API keeps every board owned),
              // and removing yourself from your own settings page is a trap.
              const removable = canManage && member.role !== "owner" && !isSelf;

              return (
                <li key={member.user_id} className={styles.row}>
                  <UserAvatar
                    name={member.name}
                    email={member.email}
                    avatar={member.avatar}
                    size="md"
                  />

                  <div className={styles.identity}>
                    <span className={styles.name}>
                      {member.name?.trim() || member.email}
                      {isSelf && <span className={styles.you}> (you)</span>}
                    </span>
                    <span className={styles.email}>{member.email}</span>
                  </div>

                  {joined && <span className={styles.joined}>Joined {joined}</span>}

                  <Badge variant={ROLE_BADGE[member.role]} className={styles.role}>
                    {member.role}
                  </Badge>

                  {removable && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMember.mutate(member.user_id)}
                      disabled={removeMember.isPending}
                      aria-label={`Remove ${member.name?.trim() || member.email}`}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!isLoading && !isError && !canManage && (
          <p className={styles.muted}>
            Only board admins and owners can add or remove members.
          </p>
        )}
      </section>
    </div>
  );
}
