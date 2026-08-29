import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MarkdownEditor from "./componets/MarkdownEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTicketDetail } from "@/hooks/useTicketDetail";
import { useBoardMembers } from "@/hooks/useBoardMembers";
import { useUpdateTicket, type TicketEditPatch } from "@/hooks/useUpdateTicket";
import { useAuth } from "@/hooks/useAuth";
import type { TicketDetailed } from "@/types";
import styles from "./TicketDetail.module.css";

interface TicketDetailProps {
  boardId: string;
  ticketId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Priority = "low" | "medium" | "high";
const PRIORITIES: Priority[] = ["low", "medium", "high"];
const NO_ASSIGNEE = "__none__"; // Radix Select forbids an empty-string value.
const EDIT_ROLES = ["owner", "admin", "member"];

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ISO string → the yyyy-mm-dd that <input type="date"> expects.
function toDateInput(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

interface FormState {
  title: string;
  description: string;
  priority: Priority;
  assigneeId: string; // "" = unassigned
  dueDate: string; // yyyy-mm-dd, "" = none
}

function seedForm(t: TicketDetailed): FormState {
  return {
    title: t.title,
    description: t.description ?? "",
    priority: t.priority,
    assigneeId: t.assignee_id ?? "",
    dueDate: toDateInput(t.due_date),
  };
}

// Only include fields that actually changed, so we never overwrite a field with
// a stale value we happened to be holding.
function buildPatch(t: TicketDetailed, f: FormState): TicketEditPatch {
  const patch: TicketEditPatch = {};

  const title = f.title.trim();
  if (title !== t.title) patch.title = title;

  const description = f.description;
  if (description !== (t.description ?? "")) {
    patch.description = description === "" ? null : description;
  }

  if (f.priority !== t.priority) patch.priority = f.priority;

  if (f.assigneeId !== (t.assignee_id ?? "")) {
    patch.assignee_id = f.assigneeId === "" ? null : f.assigneeId;
  }

  if (f.dueDate !== toDateInput(t.due_date)) {
    patch.due_date = f.dueDate === "" ? null : new Date(f.dueDate).toISOString();
  }

  return patch;
}

export default function TicketDetail({
  boardId,
  ticketId,
  open,
  onOpenChange,
}: TicketDetailProps) {
  const { user } = useAuth();
  const { data: ticket, isLoading, isError } = useTicketDetail(
    boardId,
    ticketId,
    open
  );
  const { data: members } = useBoardMembers(boardId, open);
  const updateTicket = useUpdateTicket(boardId, ticketId);

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [form, setForm] = useState<FormState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Always reopen in view mode; drop any half-finished edit when the modal closes.
  useEffect(() => {
    if (!open) {
      setMode("view");
      setForm(null);
      setSaveError(null);
    }
  }, [open]);

  const myRole = members?.find((m) => m.user_id === user?.id)?.role;
  const canEdit = !!myRole && EDIT_ROLES.includes(myRole);

  function startEdit() {
    if (!ticket) return;
    setForm(seedForm(ticket));
    setSaveError(null);
    setMode("edit");
  }

  function cancelEdit() {
    setForm(null);
    setSaveError(null);
    setMode("view");
  }

  function save() {
    if (!ticket || !form) return;
    const patch = buildPatch(ticket, form);
    if (Object.keys(patch).length === 0) {
      cancelEdit();
      return;
    }
    updateTicket.mutate(patch, {
      onSuccess: () => {
        setForm(null);
        setMode("view");
      },
      onError: () =>
        setSaveError("Couldn't save your changes. Please try again."),
    });
  }

  const titleValid = (form?.title.trim().length ?? 0) > 0;
  const isSaving = updateTicket.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Don't let the dialog close mid-save.
        if (isSaving) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className={styles.content} showClose={false}>
        {isLoading && <p className={styles.muted}>Loading ticket…</p>}
        {isError && <p className={styles.muted}>Could not load this ticket.</p>}

        {ticket && (
          <>
            <DialogHeader>
              <div className={styles.titleRow}>
                {mode === "edit" ? (
                  <div className={styles.field} style={{ flex: 1 }}>
                    <Label htmlFor="ticket-title">Title</Label>
                    <Input
                      id="ticket-title"
                      value={form?.title ?? ""}
                      onChange={(e) =>
                        setForm((f) => f && { ...f, title: e.target.value })
                      }
                      placeholder="Ticket title"
                    />
                  </div>
                ) : (
                  <DialogTitle>{ticket.title}</DialogTitle>
                )}

                <div className={styles.headerActions}>
                  {mode === "view" && canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className={styles.editBtn}
                      onClick={startEdit}
                    >
                      ✏️ Edit
                    </Button>
                  )}

                  <DialogClose asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={styles.closeBtn}
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </DialogClose>
                </div>
              </div>
            </DialogHeader>

            {/* Scrollable body: header (above) and edit footer (below) stay pinned. */}
            <div className={styles.body}>
            {/* ─── Description: always shown, markdown, editable ───────────── */}
            <section className={styles.section}>
              <h3 className={styles.sectionHeading}>Description</h3>
              {mode === "edit" ? (
                <MarkdownEditor
                  value={form?.description ?? ""}
                  onChange={(v) =>
                    setForm((f) => f && { ...f, description: v })
                  }
                  placeholder="Write a description… Markdown supported."
                />
              ) : ticket.description ? (
                <div className={styles.markdown}>
                  <ReactMarkdown>{ticket.description}</ReactMarkdown>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.emptyDescription}
                  onClick={canEdit ? startEdit : undefined}
                  disabled={!canEdit}
                >
                  {canEdit
                    ? "No description yet — click to add one."
                    : "No description provided."}
                </button>
              )}
            </section>

            {/* ─── Meta ────────────────────────────────────────────────────── */}
            <div className={styles.meta}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Priority</span>
                {mode === "edit" ? (
                  <Select
                    value={form?.priority}
                    onValueChange={(v) =>
                      setForm((f) => f && { ...f, priority: v as Priority })
                    }
                  >
                    <SelectTrigger className={styles.metaControl}>
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
                ) : (
                  <Badge
                    className={styles[`priority_${ticket.priority}`]}
                    variant="secondary"
                  >
                    {ticket.priority}
                  </Badge>
                )}
              </div>

              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Assignee</span>
                {mode === "edit" ? (
                  <Select
                    value={form?.assigneeId ? form.assigneeId : NO_ASSIGNEE}
                    onValueChange={(v) =>
                      setForm(
                        (f) =>
                          f && {
                            ...f,
                            assigneeId: v === NO_ASSIGNEE ? "" : v,
                          }
                      )
                    }
                  >
                    <SelectTrigger className={styles.metaControl}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_ASSIGNEE}>Unassigned</SelectItem>
                      {members?.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.name ?? m.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span>{ticket.assignee?.name ?? "Unassigned"}</span>
                )}
              </div>

              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Reporter</span>
                <span>{ticket.creator?.name ?? "Unknown"}</span>
              </div>

              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Due</span>
                {mode === "edit" ? (
                  <Input
                    type="date"
                    className={styles.metaControl}
                    value={form?.dueDate ?? ""}
                    onChange={(e) =>
                      setForm((f) => f && { ...f, dueDate: e.target.value })
                    }
                  />
                ) : (
                  <span>{formatDate(ticket.due_date) ?? "—"}</span>
                )}
              </div>
            </div>

            {/* ─── Comments (view only) ────────────────────────────────────── */}
            {mode === "view" && (
              <div className={styles.comments}>
                <h3 className={styles.sectionHeading}>
                  Comments ({ticket.comments.length})
                </h3>
                {ticket.comments.length === 0 && (
                  <p className={styles.muted}>No comments yet.</p>
                )}
                {ticket.comments.map((c) => (
                  <div key={c.id} className={styles.comment}>
                    <div className={styles.commentHead}>
                      <span className={styles.commentAuthor}>{c.user_name}</span>
                      <span className={styles.commentDate}>
                        {formatDate(c.created_at)}
                      </span>
                    </div>
                    <p className={styles.commentBody}>{c.content}</p>
                  </div>
                ))}
              </div>
            )}
            </div>
            {/* end scrollable body */}

            {/* ─── Edit footer ─────────────────────────────────────────────── */}
            {mode === "edit" && (
              <div className={styles.editFooter}>
                {saveError && <span className={styles.error}>{saveError}</span>}
                <div className={styles.editActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={save}
                    disabled={!titleValid || isSaving}
                  >
                    {isSaving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
