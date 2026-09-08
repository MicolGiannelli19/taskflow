import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useBoardMembers, type BoardRole } from "@/hooks/useBoardMembers";
import { useRemoveMember } from "@/hooks/useRemoveMember";
import type { AddMemberInput } from "@/hooks/useAddMember";
import { apiErrorMessage } from "@/lib/apiError";
import MemberSection from "./MemberSection";
import styles from "./BoardSettings.module.css";

interface SectionSpec {
  title: string;
  /** Stored roles that belong in this group. */
  roles: BoardRole[];
  /** Role given to someone added here. */
  addAs: AddMemberInput["role"];
  roleLabel: string;
  emptyText: string;
}

/**
 * The three groups, most privileged first.
 *
 * "Editors" is this page's name for the stored `member` role — the API's four
 * roles are owner/admin/member/viewer, and "member" is ambiguous on a screen
 * where everyone listed is a member of the board. The owner is grouped with
 * the admins (their badge still says Owner); there is nowhere else they fit,
 * and the API has no ownership transfer.
 */
const SECTIONS: SectionSpec[] = [
  {
    title: "Admins",
    roles: ["owner", "admin"],
    addAs: "admin",
    roleLabel: "an admin",
    emptyText: "No admins yet.",
  },
  {
    title: "Editors",
    roles: ["member"],
    addAs: "member",
    roleLabel: "an editor",
    emptyText: "No editors yet.",
  },
  {
    title: "Viewers",
    roles: ["viewer"],
    addAs: "viewer",
    roleLabel: "a viewer",
    emptyText: "No viewers yet.",
  },
];

export default function BoardSettings() {
  const { boardId } = useParams();
  const { user } = useAuth();
  const { data: members = [], isLoading, isError } = useBoardMembers(boardId!);
  const removeMember = useRemoveMember(boardId!);

  // Nothing returns the caller's own role, so it comes from finding yourself in
  // the roster. Undefined while the list loads — treated as read-only until then.
  const myRole = members.find((m) => m.user_id === user?.id)?.role;
  const canAdd = myRole === "owner";
  const canRemove = myRole === "owner" || myRole === "admin";

  // The roster reads as a roster by default. Changing it — adding someone, or
  // removing them, which is irreversible from here — is deliberate, so both the
  // Add buttons and the bins stay hidden until you ask for them.
  const [editing, setEditing] = useState(false);
  const canEdit = canAdd || canRemove;

  const memberIds = new Set(members.map((m) => m.user_id));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Board settings</h1>
      </header>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Members</h2>
          <div className={styles.cardActions}>
            {!isLoading && !isError && (
              <span className={styles.count}>
                {members.length} {members.length === 1 ? "person" : "people"}
              </span>
            )}
            {!isLoading && !isError && canEdit && (
              <Button
                variant={editing ? "secondary" : "outline"}
                size="sm"
                aria-pressed={editing}
                onClick={() => setEditing((e) => !e)}
              >
                {editing ? "Done" : "Edit members"}
              </Button>
            )}
          </div>
        </div>

        {editing && (
          <p className={styles.hint}>
            Adding someone gives them access straight away, and removing them
            takes it away just as fast. Choose Done when you've finished.
          </p>
        )}

        {isLoading && <p className={styles.muted}>Loading members…</p>}
        {isError && <p className={styles.muted}>Failed to load members.</p>}

        {removeMember.isError && (
          <p role="alert" className={styles.error}>
            {apiErrorMessage(removeMember.error, "Could not remove that member.")}
          </p>
        )}

        {!isLoading &&
          !isError &&
          SECTIONS.map((section) => (
            <MemberSection
              key={section.title}
              boardId={boardId!}
              title={section.title}
              role={section.addAs}
              roleLabel={section.roleLabel}
              members={members.filter((m) => section.roles.includes(m.role))}
              existingMemberIds={memberIds}
              emptyText={section.emptyText}
              currentUserId={user?.id}
              canAdd={canAdd && editing}
              canRemove={canRemove && editing}
              onRemove={(userId) => removeMember.mutate(userId)}
              removing={removeMember.isPending}
            />
          ))}

        {!isLoading && !isError && !canRemove && (
          <p className={styles.muted}>
            Only the board owner can add members, and only owners and admins can
            remove them.
          </p>
        )}
      </div>
    </div>
  );
}
