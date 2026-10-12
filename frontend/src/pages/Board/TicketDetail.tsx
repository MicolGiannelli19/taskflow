import { Link } from "react-router-dom";
import { Maximize2, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TicketDetailContent from "./TicketDetailContent";
import { useTicketEditor } from "@/hooks/useTicketEditor";
import styles from "./TicketDetail.module.css";
import { paths } from "@/routes";
import { moveStep } from "@/lib/shortcuts/keyboard";

interface TicketDetailProps {
  boardId: string;
  ticketId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where focus goes on close; the board hands it back to the card. */
  onCloseAutoFocus?: (e: Event) => void;
  /** The ticket's column, shown as its status. */
  status?: string;
  /** ⇧⌘← / ⇧⌘→ while the ticket is open: move it a column. */
  onMoveStep?: (step: -1 | 1) => void;
}

export default function TicketDetail({
  boardId,
  ticketId,
  open,
  onOpenChange,
  onCloseAutoFocus,
  status,
  onMoveStep,
}: TicketDetailProps) {
  const editor = useTicketEditor(boardId, ticketId, open);
  const { isSaving } = editor;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Don't let the dialog close mid-save.
        if (isSaving) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={styles.content}
        showClose={false}
        onCloseAutoFocus={onCloseAutoFocus}
        onKeyDown={(e) => {
          const step = onMoveStep ? moveStep(e) : 0;
          if (step) {
            e.preventDefault();
            onMoveStep?.(step);
          }
        }}
      >
        <TicketDetailContent
          editor={editor}
          boardId={boardId}
          ticketId={ticketId}
          variant="modal"
          status={status}
          showMoveHint={!!onMoveStep}
          headerActions={
            <>
              <Button
                variant="ghost"
                size="icon"
                className={styles.closeBtn}
                asChild
              >
                <Link
                  to={paths.ticket(boardId, ticketId)}
                  aria-label="Open ticket on its own page"
                  title="Open on full page"
                >
                  <Maximize2 className="h-4 w-4" />
                </Link>
              </Button>

              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={styles.closeBtn}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </>
          }
        />
      </DialogContent>
    </Dialog>
  );
}
