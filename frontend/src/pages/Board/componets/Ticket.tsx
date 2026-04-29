import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./Ticket.module.css";
import type { TicketTypeSmall } from "../../../types";
import instance from "@/api/axios";

interface TicketProps {
  ticket: TicketTypeSmall;
}

export default function Ticket({ ticket }: TicketProps) {
  const [isOpen, setIsOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // TODO: mock currently not working
  function onMove(columnId: string) {
    //hardcoded board id for now, should be passed as prop or derived from context
    instance.patch(`/tickets/94439b8f-36d8-44d5-b813-51c64bddef21/tickets/${ticket.id}`, { column_id: columnId })
    console.log("move", ticket.id, columnId);
  }

  // Position dropdown below the button when opened
  useEffect(() => {
    if (isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.right });
    }
  }, [isOpen]);

  // Close on outside click
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

  // TODO: replace with real columns passed as prop
  const MOCK_COLUMNS = [
    { id: "dc8d11e1-3099-48fd-937f-ab3da975d23a", name: "Backlog" },
    { id: "3fd27f14-2b19-447a-860e-b46d5d95d6cd", name: "In Progress" },
    { id: "585ab7e8-58f3-4415-8b8d-e912b36875b1", name: "Done" },
  ];

  return (
    <div className={styles.ticket}>
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
                {MOCK_COLUMNS.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => {
                      onMove(col.id);
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
