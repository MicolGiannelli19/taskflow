import BoardGrid from "./componets/BoardGrid";
import { Outlet, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { TicketFormData } from "../../types";
import { useBoard } from "../../hooks/useBoard";
import { useBoardPermissions } from "../../hooks/useBoardPermissions";
import { useCreateTicket } from "../../hooks/useCreateTicket";
import { useAnnounce, useShortcut } from "../../hooks/useShortcut";
import { paths } from "../../routes";

export interface BoardOutletContext {
  handleNewTicket: (formData: Omit<TicketFormData, "column_id">) => void;
  /** The column the new ticket goes into, shown in the dialog. */
  columnName?: string;
}

export default function Board() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const announce = useAnnounce();
  const { role, canEdit } = useBoardPermissions(boardId);

  const { data, isLoading, isError } = useBoard(boardId);

  const columns = data?.columns ?? [];
  const tickets = data?.tickets ?? [];

  // `?column=` from the shortcut or a column's "New ticket" button, else Backlog.
  const targetColumn =
    columns.find((col) => col.id === searchParams.get("column")) ??
    columns.find((col) => col.name === "Backlog") ??
    columns[0];

  const createTicket = useCreateTicket(boardId!);

  // ⌘Enter: new ticket in the column the keyboard cursor is in.
  useShortcut(
    "ticket.create",
    () => {
      if (!canEdit) {
        if (role) announce("This board is view-only.");
        return;
      }
      const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const columnId = focused?.closest<HTMLElement>("[data-column-id]")?.dataset.columnId;
      navigate(paths.newTicket(boardId!, columnId));
    },
    !!boardId && !isLoading && !isError
  );

  const handleNewTicket = (newTicketData: Omit<TicketFormData, "column_id">) => {
    if (!targetColumn) return;
    createTicket.mutate(
      { ...newTicketData, column_id: targetColumn.id },
      {
        // The grid moves its cursor onto the new card once it arrives.
        onSuccess: (res) =>
          navigate(paths.board(boardId!), { state: { focusTicketId: res.data.id } }),
      }
    );
  };

  return (
    <>
      {isLoading && <p>Loading…</p>}
      {isError && <p>Failed to load board.</p>}
      {!isLoading && !isError && (
        // Keyed by board, so the keyboard cursor starts fresh on each board.
        <BoardGrid key={boardId} boardId={boardId!} columns={columns} tickets={tickets} />
      )}
      {/* Nested "new-ticket" route renders as a Dialog overlaying the board. */}
      <Outlet
        context={{ handleNewTicket, columnName: targetColumn?.name } satisfies BoardOutletContext}
      />
    </>
  );
}
