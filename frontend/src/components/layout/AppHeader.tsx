import { UserButton } from "@clerk/react";
import { Link, useParams } from "react-router-dom";
import { Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ShortcutKbd } from "@/components/shortcuts/Kbd";
import ShortcutTooltip from "@/components/shortcuts/ShortcutTooltip";
import { usePalette } from "@/hooks/useShortcut";
import { ariaKeyShortcuts } from "@/lib/shortcuts/format";
import { PLATFORM } from "@/lib/shortcuts/keyboard";
import { SHORTCUT_BY_ID } from "@/lib/shortcuts/registry";
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
  const palette = usePalette();

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
      <ShortcutTooltip id="sidebar.toggle" label="Toggle sidebar">
        <SidebarTrigger
          aria-keyshortcuts={ariaKeyShortcuts(SHORTCUT_BY_ID["sidebar.toggle"].keys, PLATFORM)}
        />
      </ShortcutTooltip>
      <Link className={styles.brand} to={paths.home}>
        {/* Decorative: the text next to it already names the link. */}
        <img className={styles.logo} src="/logo.png" alt="" />
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
        {/* The palette's visible door: for the mouse, for touch screens, and
            for anyone who hasn't learned ⌘K yet. */}
        <button
          type="button"
          className={styles.search}
          onClick={() => palette.setOpen(true)}
          aria-keyshortcuts={ariaKeyShortcuts(SHORTCUT_BY_ID["palette.open"].keys, PLATFORM)}
        >
          <Search aria-hidden="true" />
          <span className={styles.searchLabel}>Search</span>
          <ShortcutKbd id="palette.open" />
        </button>
        {/* Replaces the old Log out button: account menu, profile link and
            sign-out, all owned by Clerk. */}
        <UserButton userProfileUrl={paths.profile} />
      </div>
    </header>
  );
}
