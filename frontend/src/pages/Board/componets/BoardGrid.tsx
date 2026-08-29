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
import type { ColumnType, TicketTypeSmall } from "../../../types";

interface BoardGridProps {
  boardId: string;
  columns: ColumnType[];
  tickets: TicketTypeSmall[];
}

export default function BoardGrid({ boardId, columns, tickets }: BoardGridProps) {
  const { logout } = useAuth();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className={styles.header}>
          <SidebarTrigger />
          <div>Task Flow</div>
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
