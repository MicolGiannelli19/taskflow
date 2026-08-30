import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MarkdownEditor from "./componets/MarkdownEditor";
import CopyableTitle from "./componets/CopyableTitle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITIES, type Priority, type TicketEditor } from "@/hooks/useTicketEditor";
import styles from "./TicketDetail.module.css";
import { paths } from "@/routes";

interface TicketDetailContentProps {
  editor: TicketEditor;
  boardId: string;
  ticketId: string;
  /** "modal" renders the header inside Radix's DialogHeader/DialogTitle. */
  variant: "modal" | "page";
  /** Shell-owned header controls (open-full-page, close…), right of Edit. */
  headerActions?: ReactNode;
}

const NO_ASSIGNEE = "__none__"; // Radix Select forbids an empty-string value.

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

/**
 * Ticket detail body — header, description, meta, comments, edit footer.
 * Rendered by both the board modal (`TicketDetail`) and the full-page route
 * (`TicketPage`); all state lives in the `useTicketEditor` passed in.
 */
export default function TicketDetailContent({
  editor,
  boardId,
  ticketId,
  variant,
  headerActions,
}: TicketDetailContentProps) {
  const {
    ticket,
    isLoading,
    isError,
    members,
    canEdit,
    mode,
    form,
    setForm,
    startEdit,
    cancelEdit,
    save,
    saveError,
    isSaving,
    titleValid,
  } = editor;

  const isModal = variant === "modal";

  if (isLoading || isError || !ticket) {
    return (
      <>
        {/* Radix requires a title on every dialog, including while loading. */}
        {isModal && <DialogTitle className="sr-only">Ticket</DialogTitle>}
        {isLoading && <p className={styles.muted}>Loading ticket…</p>}
        {isError && <p className={styles.muted}>Could not load this ticket.</p>}
      </>
    );
  }

  const titleNode =
    mode === "edit" ? (
      <div className={styles.field} style={{ flex: 1 }}>
        <Label htmlFor="ticket-title">Title</Label>
        <Input
          id="ticket-title"
          value={form?.title ?? ""}
          onChange={(e) => setForm((f) => f && { ...f, title: e.target.value })}
          placeholder="Ticket title"
        />
      </div>
    ) : (
      <CopyableTitle
        title={ticket.title}
        path={paths.ticket(boardId, ticketId)}
        variant={variant}
      />
    );

  const header = (
    <div className={styles.titleRow}>
      {isModal && mode === "view" ? (
        <DialogTitle asChild>{titleNode}</DialogTitle>
      ) : (
        titleNode
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
        {headerActions}
      </div>
    </div>
  );

  return (
    <>
      {isModal ? (
        <DialogHeader>
          {/* In edit mode the title is an <Input>, so give Radix a title anyway. */}
          {mode === "edit" && (
            <DialogTitle className="sr-only">Editing {ticket.title}</DialogTitle>
          )}
          {header}
        </DialogHeader>
      ) : (
        header
      )}

      {/* Scrollable body: header (above) and edit footer (below) stay pinned. */}
      <div className={cn(styles.body, !isModal && styles.bodyPage)}>
        {/* ─── Description: always shown, markdown, editable ───────────── */}
        <section className={styles.section}>
          <h3 className={styles.sectionHeading}>Description</h3>
          {mode === "edit" ? (
            <MarkdownEditor
              value={form?.description ?? ""}
              onChange={(v) => setForm((f) => f && { ...f, description: v })}
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
            <Button size="sm" onClick={save} disabled={!titleValid || isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
