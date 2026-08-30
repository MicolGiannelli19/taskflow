import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./Ticket.module.css";
import { Button } from "@/components/ui/button";
import type { ColumnType, TicketTypeSmall } from "../../../types";
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import TicketDetail from "../TicketDetail";
import UserAvatar from "@/components/UserAvatar";
import { useBoardMembers } from "@/hooks/useBoardMembers";

interface TicketProps {
  boardId: string;
  columns: ColumnType[];
  ticket: TicketTypeSmall;
  moveTicket: (vars: { ticketId: string; columnId: string }) => void;
}

export default function Ticket({ boardId, columns, ticket, moveTicket }: TicketProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<boolean>(false);

  // Cached per board, so every card on the board shares one request.
  const { data: members } = useBoardMembers(boardId);
  const assignee = members?.find((m) => m.user_id === ticket.assignee_id);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return draggable({
      element: el,
      getInitialData: () => ({ ticketId: ticket.id, fromColumnId: ticket.column_id }),
      onDragStart: () => setDragging(true),
      onDrop: () => setDragging(false),
    });
  }, [ticket.id, ticket.column_id]);

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.right });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <>
      <div
        className={`${styles.ticket} ${dragging ? styles.dragging : ""}`}
        ref={ref}
        onClick={() => setDetailOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          // Only the card itself activates. A keypress on the nested "move"
          // button (or on a column button in the portaled dropdown, which still
          // bubbles through the React tree) lands here too, and preventDefault
          // would swallow that button's own Enter/Space activation.
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setDetailOpen(true);
          }
        }}
      >
        <header>
          <h1>{ticket.title}</h1>

          <div className={styles.side}>
            <UserAvatar
              size="sm"
              name={assignee?.name}
              email={assignee?.email}
              avatar={assignee?.avatar}
            />

            <div className={styles.moveWrapper}>
              <Button
                ref={btnRef}
                variant="ghost"
                size="sm"
                className={isOpen ? styles.active : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen((o) => !o);
                }}
              >
                move →
              </Button>

              {isOpen &&
                createPortal(
                  <div
                    ref={dropdownRef}
                    className={styles.dropdown}
                    style={{ top: pos.top, right: window.innerWidth - pos.left }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {columns.filter((col) => col.id !== ticket.column_id).map((col) => (
                      <Button
                        key={col.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveTicket({ ticketId: ticket.id, columnId: col.id });
                          setIsOpen(false);
                        }}
                      >
                        {col.name}
                      </Button>
                    ))}
                  </div>,
                  document.body
                )}
            </div>
          </div>

        </header>
      </div>

      <TicketDetail
        boardId={boardId}
        ticketId={ticket.id}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
