import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useAddMember, type AddMemberInput } from "@/hooks/useAddMember";
import { apiErrorMessage } from "@/lib/apiError";
import UserCombobox from "./UserCombobox";
import styles from "./BoardSettings.module.css";

interface Props {
  boardId: string;
  /** Fixed by the section this form sits in — Viewers adds viewers, and so on. */
  role: AddMemberInput["role"];
  /** Human name of that role, for the field label. */
  roleLabel: string;
  /** Ids already on the board, so the typeahead doesn't offer them. */
  existingMemberIds: Set<string>;
  onCancel: () => void;
}

/**
 * Invite one person into one section. The role is not a choice here: the
 * section already decided it, so the form is just an address and a button.
 */
export default function AddMemberForm({
  boardId,
  role,
  roleLabel,
  existingMemberIds,
  onCancel,
}: Props) {
  const [email, setEmail] = useState("");
  const addMember = useAddMember(boardId);
  const fieldId = `add-${role}-email`;
  const errorId = `add-${role}-error`;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    // Stays open on success, cleared and ready — adding three viewers in a row
    // shouldn't mean reopening the form three times. A typo'd address is kept
    // instead, next to the "No user with email …" message.
    addMember.mutate({ email: trimmed, role }, { onSuccess: () => setEmail("") });
  };

  return (
    <form className={styles.addForm} onSubmit={handleSubmit}>
      <UserCombobox
        inputId={fieldId}
        label={`Add ${roleLabel} by name or email`}
        value={email}
        onChange={setEmail}
        excludeIds={existingMemberIds}
        describedBy={addMember.isError ? errorId : undefined}
      />

      <Button type="submit" disabled={!email.trim() || addMember.isPending}>
        {addMember.isPending ? "Adding…" : "Add"}
      </Button>
      <Button type="button" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>

      {addMember.isError && (
        <p id={errorId} role="alert" className={styles.error}>
          {apiErrorMessage(addMember.error, "Could not add that member.")}
        </p>
      )}
    </form>
  );
}
