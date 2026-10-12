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

interface TicketDetailProps {
  boardId: string;
  ticketId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where focus goes on close; the board hands it back to the card. */
  onCloseAutoFocus?: (e: Event) => void;
}

export default function TicketDetail({
  boardId,
  ticketId,
  open,
  onOpenChange,
  onCloseAutoFocus,
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
      >
        <TicketDetailContent
          editor={editor}
          boardId={boardId}
          ticketId={ticketId}
          variant="modal"
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
