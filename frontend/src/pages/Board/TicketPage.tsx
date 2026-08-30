import { useParams } from "react-router-dom";
import TicketDetailContent from "./TicketDetailContent";
import { useTicketEditor } from "@/hooks/useTicketEditor";
import styles from "./TicketPage.module.css";

/** Full-page view of a single ticket — the target of the copyable permalink. */
export default function TicketPage() {
  const { boardId, ticketId } = useParams();
  const editor = useTicketEditor(boardId!, ticketId!, true);

  return (
    <div className={styles.main}>
      <article className={styles.sheet}>
        <TicketDetailContent
          editor={editor}
          boardId={boardId!}
          ticketId={ticketId!}
          variant="page"
        />
      </article>
    </div>
  );
}
