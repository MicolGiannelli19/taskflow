import Column from "./Column";
import AppSidebar from "./AppSidebar";
import styles from "./BoardGrid.module.css";
import { Button } from "@/components/ui/button";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "../../../hooks/useAuth";
import { useBoards } from "../../../hooks/useBoards";
import type { ColumnType, TicketTypeSmall } from "../../../types";

interface BoardGridProps {
  boardId: string;
  columns: ColumnType[];
  tickets: TicketTypeSmall[];
}

export default function BoardGrid({ boardId, columns, tickets }: BoardGridProps) {
  const { logout } = useAuth();
  const { data: boards } = useBoards();
  const boardName = boards?.find((b) => String(b.id) === String(boardId))?.name;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className={styles.header}>
          <SidebarTrigger />
          <div>Task Flow</div>
          {boardName && (
            <>
              <span className={styles.separator} aria-hidden="true">/</span>
              <span className={styles.boardName}>{boardName}</span>
            </>
          )}
          <Button
            variant="destructive"
            className={styles.loginBtn}
            onClick={logout}
          >
            Log out
          </Button>
        </header>

        <div className={styles.mainBoard}>
          {columns.map((col) => (
            <Column
              key={col.id}
              boardId={boardId}
              columnId={col.id}
              title={col.name}
              columns={columns}
              tickets={tickets.filter((t) => t.column_id === col.id)}
            />
          ))}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
