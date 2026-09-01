import { useState, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddMember, type AddMemberInput } from "@/hooks/useAddMember";
import { apiErrorMessage } from "@/lib/apiError";
import styles from "./BoardSettings.module.css";

/** Roles that can be handed out. `owner` is missing on purpose — the API
 *  rejects it, since ownership transfer isn't supported. */
const ASSIGNABLE: { value: AddMemberInput["role"]; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
  { value: "admin", label: "Admin" },
];

export default function AddMemberForm({ boardId }: { boardId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AddMemberInput["role"]>("member");
  const addMember = useAddMember(boardId);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    addMember.mutate(
      { email: trimmed, role },
      // Only clear the field on success, so a typo'd address stays editable
      // next to the "No user with email …" message.
      { onSuccess: () => setEmail("") }
    );
  };

  return (
    <form className={styles.addForm} onSubmit={handleSubmit}>
      <div className={styles.addField}>
        <Label htmlFor="member-email">Email address</Label>
        <Input
          id="member-email"
          type="email"
          value={email}
          placeholder="teammate@example.com"
          autoComplete="off"
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={addMember.isError ? "add-member-error" : undefined}
        />
      </div>

      <div className={styles.addField}>
        <Label htmlFor="member-role">Role</Label>
        <Select
          value={role}
          onValueChange={(v) => setRole(v as AddMemberInput["role"])}
        >
          <SelectTrigger id="member-role" className={styles.roleTrigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSIGNABLE.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={!email.trim() || addMember.isPending}>
        <UserPlus size={14} aria-hidden />
        {addMember.isPending ? "Adding…" : "Add member"}
      </Button>

      {addMember.isError && (
        <p id="add-member-error" role="alert" className={styles.error}>
          {apiErrorMessage(addMember.error, "Could not add that member.")}
        </p>
      )}
    </form>
  );
}
