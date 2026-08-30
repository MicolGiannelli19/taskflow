import { useEffect, useState } from "react";
import { useTicketDetail } from "./useTicketDetail";
import { useBoardMembers } from "./useBoardMembers";
import { useUpdateTicket, type TicketEditPatch } from "./useUpdateTicket";
import { useCreateComment } from "./useCreateComment";
import { useUpdateComment } from "./useUpdateComment";
import { useDeleteComment } from "./useDeleteComment";
import { useAuth } from "./useAuth";
import type { TicketDetailed } from "../types";

export type Priority = "low" | "medium" | "high";
export const PRIORITIES: Priority[] = ["low", "medium", "high"];

const EDIT_ROLES = ["owner", "admin", "member"];
// Deleting someone else's comment is moderation, not authorship.
const MODERATE_ROLES = ["owner", "admin"];

export interface FormState {
  title: string;
  description: string;
  priority: Priority;
  assigneeId: string; // "" = unassigned
  dueDate: string; // yyyy-mm-dd, "" = none
}

// ISO string → the yyyy-mm-dd that <input type="date"> expects.
export function toDateInput(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
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

/**
 * Loads a ticket and owns its view/edit state. Shared by the ticket modal and
 * the full-page ticket route so both behave identically.
 *
 * `active` gates the queries: the modal passes its `open` flag (and resets the
 * edit state when it closes), the full page passes `true`.
 */
export function useTicketEditor(
  boardId: string,
  ticketId: string,
  active: boolean
) {
  const { user } = useAuth();
  const { data: ticket, isLoading, isError } = useTicketDetail(
    boardId,
    ticketId,
    active
  );
  const { data: members } = useBoardMembers(boardId, active);
  const updateTicket = useUpdateTicket(boardId, ticketId);
  const createComment = useCreateComment(boardId, ticketId);
  const editComment = useUpdateComment(boardId, ticketId);
  const removeComment = useDeleteComment(boardId, ticketId);

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [form, setForm] = useState<FormState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ─── Comment composer / editor state ──────────────────────────────────────
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentEditDraft, setCommentEditDraft] = useState("");
  // Held rather than deleted immediately — a comment is not recoverable.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Always reopen in view mode; drop any half-finished edit when we go inactive.
  useEffect(() => {
    if (!active) {
      setMode("view");
      setForm(null);
      setSaveError(null);
      setCommentDraft("");
      setCommentError(null);
      setEditingCommentId(null);
      setCommentEditDraft("");
      setPendingDeleteId(null);
    }
  }, [active]);

  const myRole = members?.find((m) => m.user_id === user?.id)?.role;
  const canEdit = !!myRole && EDIT_ROLES.includes(myRole);
  const canModerate = !!myRole && MODERATE_ROLES.includes(myRole);

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

  // ─── Comments ─────────────────────────────────────────────────────────────

  function postComment() {
    const content = commentDraft.trim();
    if (!content) return;
    setCommentError(null);
    createComment.mutate(content, {
      onSuccess: () => setCommentDraft(""),
      onError: () =>
        setCommentError("Couldn't post your comment. Please try again."),
    });
  }

  function startEditComment(commentId: string, content: string) {
    setCommentError(null);
    setEditingCommentId(commentId);
    setCommentEditDraft(content);
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setCommentEditDraft("");
  }

  function saveComment() {
    const content = commentEditDraft.trim();
    if (!editingCommentId || !content) return;
    setCommentError(null);
    editComment.mutate(
      { commentId: editingCommentId, content },
      {
        onSuccess: () => cancelEditComment(),
        onError: () =>
          setCommentError("Couldn't save your edit. Please try again."),
      }
    );
  }

  function confirmDeleteComment() {
    if (!pendingDeleteId) return;
    setCommentError(null);
    removeComment.mutate(pendingDeleteId, {
      onSuccess: () => setPendingDeleteId(null),
      onError: () => {
        setPendingDeleteId(null);
        setCommentError("Couldn't delete that comment. Please try again.");
      },
    });
  }

  /** True when the signed-in user may delete this comment. */
  function canDeleteComment(authorId: string) {
    return authorId === user?.id || canModerate;
  }

  return {
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
    isSaving: updateTicket.isPending,
    titleValid: (form?.title.trim().length ?? 0) > 0,

    // Comments
    currentUserId: user?.id,
    canModerate,
    canDeleteComment,
    commentDraft,
    setCommentDraft,
    commentError,
    postComment,
    isPostingComment: createComment.isPending,
    editingCommentId,
    commentEditDraft,
    setCommentEditDraft,
    startEditComment,
    cancelEditComment,
    saveComment,
    isSavingComment: editComment.isPending,
    pendingDeleteId,
    setPendingDeleteId,
    confirmDeleteComment,
    isDeletingComment: removeComment.isPending,
  };
}

export type TicketEditor = ReturnType<typeof useTicketEditor>;
