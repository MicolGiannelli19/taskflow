import { useEffect, useState } from "react";
import { useTicketDetail } from "./useTicketDetail";
import { useBoardMembers } from "./useBoardMembers";
import { useUpdateTicket, type TicketEditPatch } from "./useUpdateTicket";
import { useAuth } from "./useAuth";
import type { TicketDetailed } from "../types";

export type Priority = "low" | "medium" | "high";
export const PRIORITIES: Priority[] = ["low", "medium", "high"];

const EDIT_ROLES = ["owner", "admin", "member"];

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

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [form, setForm] = useState<FormState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Always reopen in view mode; drop any half-finished edit when we go inactive.
  useEffect(() => {
    if (!active) {
      setMode("view");
      setForm(null);
      setSaveError(null);
    }
  }, [active]);

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
  };
}

export type TicketEditor = ReturnType<typeof useTicketEditor>;
