import { Trash2 } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BoardMember, BoardRole } from "@/hooks/useBoardMembers";
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

interface Props {
  member: BoardMember;
  isSelf: boolean;
  removable: boolean;
  onRemove: (userId: string) => void;
  removing: boolean;
}

export default function MemberRow({
  member,
  isSelf,
  removable,
  onRemove,
  removing,
}: Props) {
  const label = member.name?.trim() || member.email;
  const joined = formatJoined(member.joined_at);

  return (
    <li className={styles.row}>
      <UserAvatar
        name={member.name}
        email={member.email}
        avatar={member.avatar}
        size="md"
      />

      <div className={styles.identity}>
        <span className={styles.name}>
          {label}
          {isSelf && <span className={styles.you}> (you)</span>}
        </span>
        <span className={styles.email}>{member.email}</span>
      </div>

      {joined && <span className={styles.joined}>Joined {joined}</span>}

      {/* The owner sits in the Admins section, so the badge is what tells the
          two apart once they're grouped together. */}
      <Badge variant={ROLE_BADGE[member.role]} className={styles.role}>
        {member.role}
      </Badge>

      {removable && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(member.user_id)}
          disabled={removing}
          aria-label={`Remove ${label}`}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 size={14} />
        </Button>
      )}
    </li>
  );
}
