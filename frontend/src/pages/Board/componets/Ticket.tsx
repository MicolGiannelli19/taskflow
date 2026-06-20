import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./Ticket.module.css";
import type { ColumnType, TicketTypeSmall } from "../../../types";
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

interface TicketProps {
  columns: ColumnType[];
  ticket: TicketTypeSmall;
  moveTicket: (vars: { ticketId: string; columnId: string }) => void;
}

export default function Ticket({ columns, ticket, moveTicket }: TicketProps) {
  const [isOpen, setIsOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const ref = useRef<HTMLDivElement>(null);

  // TODO implement changed style when dragging is being used
  const [dragging, setDragging] = useState<boolean>(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return draggable({
      element: el,
      onDragStart: () => console.log("dragging of ticket", ticket.title),
    });
  }, []);

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
    <div className={styles.ticket} ref={ref}>
      <header>
        <h1>{ticket.title}</h1>

        <div className={styles.moveWrapper}>
          <button ref={btnRef} className={isOpen ? styles.active : ""} onClick={() => setIsOpen((o) => !o)}>
            move →
          </button>

          {isOpen &&
            createPortal(
              <div
                ref={dropdownRef}
                className={styles.dropdown}
                style={{ top: pos.top, right: window.innerWidth - pos.left }}
              >
                {columns.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => {
                      moveTicket({ ticketId: ticket.id, columnId: col.id });
                      setIsOpen(false);
                    }}
                  >
                    {col.name}
                  </button>
                ))}
              </div>,
              document.body
            )}
        </div>

      </header>
    </div>
  );
}
