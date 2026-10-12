import { useRef, useState } from "react";
import styles from "./NewTicketForm.module.css";
import { useOutletContext, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DueDatePicker from "@/components/DueDatePicker";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useBoardMembers } from "@/hooks/useBoardMembers";
import { PRIORITIES, type Priority } from "@/hooks/useTicketEditor";
import { fromDateInput } from "@/lib/date";
import { paths } from "../../routes";
import type { BoardOutletContext } from "./Board";
import { focusBoardCursor } from "./boardFocus";

const NO_ASSIGNEE = "__none__"; // Radix Select forbids an empty-string value.

// Only the title is required, so the exceptions get the marker, not the rule.
const optional = <span className={styles.optional}>(optional)</span>;

export default function NewTicketForm() {
  const { handleNewTicket: handleSubmit, columnName } = useOutletContext<BoardOutletContext>();
  const navigate = useNavigate();
  const { boardId } = useParams();
  const { user } = useAuth();
  const { data: members } = useBoardMembers(boardId!);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  // null until the user picks someone: the ticket then goes to its creator.
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState(""); // yyyy-mm-dd, "" = none

  // Errors appear only after a submit attempt, then clear as the field is fixed.
  const [attempted, setAttempted] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const titleError = attempted && !title.trim() ? "Title is required." : null;

  const close = () => navigate(paths.board(boardId!));

  const submit = () => {
    setAttempted(true);
    if (!title.trim()) {
      titleRef.current?.focus();
      return;
    }
    // Empty optional fields are left out rather than sent as "".
    handleSubmit({
      title: title.trim(),
      priority,
      ...(description.trim() && { description }),
      ...(dueDate && { due_date: fromDateInput(dueDate) }),
      ...(assigneeId !== null && {
        assignee_id: assigneeId === NO_ASSIGNEE ? null : assigneeId,
      }),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent
        // Back to the board's cursor; a created ticket then takes it over.
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          focusBoardCursor();
        }}
      >
        <DialogHeader>
          <DialogTitle>New Ticket</DialogTitle>
          {columnName && <DialogDescription>Adds to {columnName}.</DialogDescription>}
        </DialogHeader>

        <form
          className={styles.form}
          // Our own message instead of the browser's "Please fill out this field".
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className={styles.field}>
            <Label htmlFor="new-ticket-title">Title</Label>
            <Input
              ref={titleRef}
              id="new-ticket-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              aria-invalid={!!titleError}
              aria-describedby={titleError ? "new-ticket-title-error" : undefined}
              className={titleError ? styles.invalid : undefined}
            />
            {titleError && (
              <p id="new-ticket-title-error" role="alert" className={styles.error}>
                {titleError}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <Label htmlFor="new-ticket-description">Description {optional}</Label>
            <Textarea
              id="new-ticket-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <Label htmlFor="new-ticket-priority">Priority {optional}</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger id="new-ticket-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={styles.field}>
              <Label htmlFor="new-ticket-assignee">Assignee {optional}</Label>
              <Select
                value={assigneeId ?? user?.id ?? NO_ASSIGNEE}
                onValueChange={setAssigneeId}
              >
                <SelectTrigger id="new-ticket-assignee">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ASSIGNEE}>Unassigned</SelectItem>
                  {members?.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      <span className={styles.person}>
                        <UserAvatar size="xs" name={m.name} email={m.email} avatar={m.avatar} />
                        {m.name ?? m.email}
                        {m.user_id === user?.id && " (you)"}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={styles.field}>
            <Label id="new-ticket-due-label" htmlFor="new-ticket-due">
              Due date {optional}
            </Label>
            <DueDatePicker
              id="new-ticket-due"
              labelId="new-ticket-due-label"
              value={dueDate}
              onChange={setDueDate}
            />
          </div>

          <Button type="submit">
            Create ticket
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
