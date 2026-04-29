import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./Ticket.module.css";
import type { TicketTypeSmall } from "../../../types";

interface TicketProps {
  ticket: TicketTypeSmall;
}

export default function Ticket({ ticket }: TicketProps) {
  const [isOpen, setIsOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  function onMove(columnId: string) {
    // This shouldn't re-fetch the whole board just update the ticket's column id in the frontend and then make the API call to update the backend if it fails we can re fetch the board data to ensure consistency
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
    { id: "mock-1", name: "Backlog" },
    { id: "mock-2", name: "In Progress" },
    { id: "mock-3", name: "Done" },
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
