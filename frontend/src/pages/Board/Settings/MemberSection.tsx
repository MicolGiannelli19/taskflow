import { useId, useState } from "react";
import { ChevronRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BoardMember } from "@/hooks/useBoardMembers";
import type { AddMemberInput } from "@/hooks/useAddMember";
import AddMemberForm from "./AddMemberForm";
import MemberRow from "./MemberRow";
import styles from "./BoardSettings.module.css";

interface Props {
  boardId: string;
  title: string;
  /** Role handed to anyone added from this section. */
  role: AddMemberInput["role"];
  roleLabel: string;
  members: BoardMember[];
  /** Every member of the board, not just this section's — the typeahead
   *  shouldn't offer someone who is already an editor from the Viewers form. */
  existingMemberIds: Set<string>;
  emptyText: string;
  currentUserId?: string;
  /** Owners only, and only in edit mode — adding is an ownership decision. */
  canAdd: boolean;
  /** Admins and owners, and only in edit mode. */
  canRemove: boolean;
  onRemove: (userId: string) => void;
  removing: boolean;
}

/**
 * One collapsible group of members — Admins, Editors or Viewers.
 *
 * The disclosure is a plain button plus `aria-expanded`/`aria-controls` rather
 * than a Radix collapsible: no such package is installed, and a group of rows
 * doesn't need animation to be understood.
 */
export default function MemberSection({
  boardId,
  title,
  role,
  roleLabel,
  members,
  existingMemberIds,
  emptyText,
  currentUserId,
  canAdd,
  canRemove,
  onRemove,
  removing,
}: Props) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const panelId = useId();

  // Leaving edit mode closes an open form instead of stranding it, and doesn't
  // reopen it with stale input the next time edit mode starts.
  const [couldAdd, setCouldAdd] = useState(canAdd);
  if (couldAdd !== canAdd) {
    setCouldAdd(canAdd);
    if (!canAdd) setAdding(false);
  }

  const startAdding = () => {
    setOpen(true); // Never hide the form behind a collapsed section.
    setAdding(true);
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <button
          type="button"
          className={styles.disclosure}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronRight
            size={14}
            aria-hidden
            className={open ? styles.chevronOpen : styles.chevron}
          />
          <span className={styles.sectionTitle}>{title}</span>
          <span className={styles.count}>{members.length}</span>
        </button>

        {canAdd && !adding && (
          <Button variant="outline" size="sm" onClick={startAdding}>
            <UserPlus size={14} aria-hidden />
            Add
          </Button>
        )}
      </div>

      <div id={panelId} hidden={!open}>
        {canAdd && adding && (
          <AddMemberForm
            boardId={boardId}
            role={role}
            roleLabel={roleLabel}
            existingMemberIds={existingMemberIds}
            onCancel={() => setAdding(false)}
          />
        )}

        {members.length === 0 ? (
          <p className={styles.muted}>{emptyText}</p>
        ) : (
          <ul className={styles.list}>
            {members.map((member) => (
              <MemberRow
                key={member.user_id}
                member={member}
                isSelf={member.user_id === currentUserId}
                // The owner can't be removed (the API keeps every board owned),
                // and removing yourself from your own settings page is a trap.
                removable={
                  canRemove &&
                  member.role !== "owner" &&
                  member.user_id !== currentUserId
                }
                onRemove={onRemove}
                removing={removing}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
