import Column from "./Column";
import styles from "./BoardGrid.module.css";
import type { ColumnType, TicketTypeSmall } from "../../../types";

interface BoardGridProps {
  boardId: string;
  columns: ColumnType[];
  tickets: TicketTypeSmall[];
}

/** The columns themselves — sidebar and top bar come from AppLayout. */
export default function BoardGrid({ boardId, columns, tickets }: BoardGridProps) {
  return (
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
  );
}
