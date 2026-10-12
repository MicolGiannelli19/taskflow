import { useParams } from "react-router-dom";
import TicketDetailContent from "./TicketDetailContent";
import { useBoard } from "@/hooks/useBoard";
import { useBoardPermissions } from "@/hooks/useBoardPermissions";
import { useMoveTicket } from "@/hooks/useMoveTicket";
import { useAnnounce, useShortcut } from "@/hooks/useShortcut";
import { useTicketEditor } from "@/hooks/useTicketEditor";
import styles from "./TicketPage.module.css";

/** Full-page view of a single ticket — the target of the copyable permalink. */
export default function TicketPage() {
  const { boardId, ticketId } = useParams();
  const editor = useTicketEditor(boardId!, ticketId!, true);
  const announce = useAnnounce();
  const { role, canEdit } = useBoardPermissions(boardId);
  const moveTicket = useMoveTicket(boardId!);

  // The board's cache is updated optimistically on a move, so the status
  // follows at once; the ticket detail itself only refreshes later.
  const { data: board } = useBoard(boardId, { refetchOnMount: false });
  const columns = board?.columns ?? [];
  const columnId =
    board?.tickets.find((t) => t.id === ticketId)?.column_id ?? editor.ticket?.column_id;
  const columnIndex = columns.findIndex((c) => c.id === columnId);

  // Window-wide: on this page the ticket is the context, wherever focus is.
  function move(step: -1 | 1) {
    if (!canEdit) {
      if (role) announce("This board is view-only.");
      return;
    }
    const target = columns[columnIndex + step];
    if (!target || !ticketId) return;
    announce(`Moved to ${target.name}.`);
    moveTicket.mutate(
      { ticketId, columnId: target.id },
      { onError: () => announce(`Couldn't move the ticket. It's back in ${columns[columnIndex]?.name}.`) }
    );
  }
  useShortcut("ticket.moveLeft", () => move(-1));
  useShortcut("ticket.moveRight", () => move(1));

  return (
    <div className={styles.main}>
      <article className={styles.sheet}>
        <TicketDetailContent
          editor={editor}
          boardId={boardId!}
          ticketId={ticketId!}
          variant="page"
          status={columns[columnIndex]?.name}
          showMoveHint
        />
      </article>
    </div>
  );
}
