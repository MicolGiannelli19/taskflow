import { UserButton } from "@clerk/react";
import { Link, useParams } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useBoards } from "@/hooks/useBoards";
import { useTicketDetail } from "@/hooks/useTicketDetail";
import { paths } from "@/routes";
import styles from "./AppHeader.module.css";

/**
 * Top bar for every signed-in page. The breadcrumb is derived from the route
 * params, so pages don't have to feed it anything: board name on any /board
 * route, ticket title on top of that when a ticket is open.
 */
export default function AppHeader() {
  const { boardId, ticketId } = useParams();
  const { data: boards } = useBoards();

  const boardName = boards?.find((b) => String(b.id) === String(boardId))?.name;

  // Same query key as the ticket page, so this reads the cache rather than
  // firing a second request.
  const { data: ticket } = useTicketDetail(
    boardId ?? "",
    ticketId ?? "",
    !!boardId && !!ticketId
  );

  return (
    <header className={styles.header}>
      <SidebarTrigger />
      <Link className={styles.brand} to={paths.home}>
        Task Flow
      </Link>

      {boardId && boardName && (
        <>
          <span className={styles.separator} aria-hidden="true">/</span>
          <Link className={styles.boardName} to={paths.board(boardId)}>
            {boardName}
          </Link>
        </>
      )}

      {ticket && (
        <>
          <span className={styles.separator} aria-hidden="true">/</span>
          <span className={styles.crumb}>{ticket.title}</span>
        </>
      )}

      <div className={styles.actions}>
        {/* Replaces the old Log out button: account menu, profile link and
            sign-out, all owned by Clerk. */}
        <UserButton userProfileUrl={paths.profile} />
      </div>
    </header>
  );
}
