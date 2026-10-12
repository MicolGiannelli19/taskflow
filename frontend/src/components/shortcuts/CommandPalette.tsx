import { useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CommandLoading } from "cmdk";
import {
  ArrowRightLeft,
  ArrowUpRight,
  CalendarDays,
  Columns3,
  FileText,
  Flag,
  LayoutGrid,
  Link2,
  PanelLeft,
  Plus,
  Settings,
  Trash2,
  UserRound,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useSidebar } from "@/components/ui/sidebar";
import UserAvatar from "@/components/UserAvatar";
import { useBoard } from "@/hooks/useBoard";
import { useBoardMembers } from "@/hooks/useBoardMembers";
import { useBoardPermissions } from "@/hooks/useBoardPermissions";
import { useBoards } from "@/hooks/useBoards";
import { useBoardCommandsSlot } from "@/hooks/useShortcut";
import { PRIORITIES } from "@/hooks/useTicketEditor";
import type { TicketEditPatch } from "@/hooks/useUpdateTicket";
import { formatLocalDate, fromDateInput, parseDateInput, toDateInput } from "@/lib/date";
import type { ShortcutId } from "@/lib/shortcuts/registry";
import { focusBoardCursor, ticketElement } from "@/pages/Board/boardFocus";
import { paths } from "@/routes";
import { ShortcutKbd } from "./Kbd";
import styles from "./CommandPalette.module.css";

export interface PaletteOrigin {
  element: HTMLElement | null;
  /** The ticket card that had focus, if any: its actions lead the palette. */
  ticketId: string | null;
  columnId: string | null;
}

type Page = "root" | "move" | "priority" | "assignee" | "due";

const PAGE_LABEL: Record<Exclude<Page, "root">, string> = {
  move: "Move to",
  priority: "Priority",
  assignee: "Assignee",
  due: "Due date",
};

/**
 * Match on the words people see (an item's `keywords`), never its internal
 * `value`. Every term must appear; a label that starts with the query ranks first.
 */
function filter(_value: string, search: string, keywords?: string[]): number {
  const haystack = (keywords ?? []).join(" ").toLowerCase();
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.every((t) => haystack.includes(t))) return 0;
  return haystack.startsWith(terms[0] ?? "") ? 1 : 0.5;
}

function restoreFocus(origin: PaletteOrigin | null) {
  if (origin?.element?.isConnected) {
    origin.element.focus();
  } else if (origin?.ticketId) {
    // The card re-rendered (moved, edited) while the palette was open.
    const card = ticketElement(origin.ticketId);
    if (card) card.focus();
    else focusBoardCursor();
  }
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  origin: PaletteOrigin | null;
}

/**
 * ⌘K: one entry point for every action. With a ticket card focused, that
 * ticket's actions come first; then boards, tickets on this board (once you
 * type) and app actions. Each row shows its own shortcut, so the palette is
 * also the shortcut reference.
 */
export default function CommandPalette({ open, onOpenChange, origin }: CommandPaletteProps) {
  const [page, setPage] = useState<Page>("root");
  // Set when an action hands focus somewhere else (a dialog, a new page).
  const skipRestore = useRef(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        className={styles.content}
        onEscapeKeyDown={(e) => {
          // Esc steps back out of a sub-list before it closes the palette.
          if (page !== "root") {
            e.preventDefault();
            setPage("root");
          }
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          setPage("root");
          if (skipRestore.current) skipRestore.current = false;
          else restoreFocus(origin);
        }}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search boards and tickets, or run an action.
        </DialogDescription>
        <PaletteBody
          origin={origin}
          page={page}
          setPage={setPage}
          close={(handOff = false) => {
            skipRestore.current = handOff;
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

interface PaletteBodyProps {
  origin: PaletteOrigin | null;
  page: Page;
  setPage: (page: Page) => void;
  /** `handOff`: the action moves focus itself, so don't restore it. */
  close: (handOff?: boolean) => void;
}

/** Mounted only while the palette is open, so its queries run only then. */
function PaletteBody({ origin, page, setPage, close }: PaletteBodyProps) {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();
  const commands = useBoardCommandsSlot().get();
  const { data: boards, isLoading: boardsLoading } = useBoards();
  const { data: board } = useBoard(boardId, { refetchOnMount: false });
  const { data: members } = useBoardMembers(boardId ?? "", !!boardId);
  const { canEdit } = useBoardPermissions(boardId);
  const [search, setSearch] = useState("");

  const columns = board?.columns ?? [];
  const tickets = board?.tickets ?? [];
  const ticket = origin?.ticketId ? tickets.find((t) => t.id === origin.ticketId) : undefined;
  const columnIndex = ticket ? columns.findIndex((c) => c.id === ticket.column_id) : -1;
  // Ticket actions need the grid that owns focus and confirmation.
  const ticketActions = ticket && commands && commands.boardId === boardId ? { ticket, commands } : null;

  function go(to: string) {
    close(true);
    navigate(to);
  }

  function openPage(next: Page) {
    setPage(next);
    setSearch("");
  }

  function update(patch: TicketEditPatch, done: string) {
    if (!ticketActions) return;
    close();
    ticketActions.commands.updateTicket(ticketActions.ticket.id, patch, done);
  }

  function handleKeyDown(e: KeyboardEvent) {
    // Backspace on an empty query steps back out of a sub-list.
    if (e.key === "Backspace" && search === "" && page !== "root") {
      e.preventDefault();
      setPage("root");
    }
  }

  const inSubPage = page !== "root";

  return (
    <Command filter={filter} loop onKeyDown={handleKeyDown}>
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder={inSubPage ? "Filter…" : "Search boards, tickets and actions…"}
        leading={inSubPage && <span className={styles.crumb}>{PAGE_LABEL[page]}</span>}
      />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>

        {page === "root" && (
          <>
            {ticketActions && (
              <CommandGroup heading={ticketActions.ticket.title} className={styles.ticketGroup}>
                <Item
                  value="ticket:open"
                  label="Open ticket"
                  icon={<ArrowUpRight />}
                  onSelect={() => {
                    close(true);
                    ticketActions.commands.openTicket(ticketActions.ticket.id);
                  }}
                />
                {canEdit && (
                  <>
                    <Item value="ticket:move" label="Move to…" keywords={["column", "status"]} icon={<ArrowRightLeft />} onSelect={() => openPage("move")} />
                    <Item value="ticket:priority" label="Set priority…" icon={<Flag />} onSelect={() => openPage("priority")} />
                    <Item value="ticket:assignee" label="Assign…" keywords={["assignee", "owner"]} icon={<UserRound />} onSelect={() => openPage("assignee")} />
                    <Item value="ticket:due" label="Set due date…" keywords={["deadline"]} icon={<CalendarDays />} onSelect={() => openPage("due")} />
                  </>
                )}
                <Item
                  value="ticket:copy"
                  label="Copy link"
                  keywords={["permalink", "url"]}
                  icon={<Link2 />}
                  shortcut="ticket.copyLink"
                  onSelect={() => {
                    close();
                    ticketActions.commands.copyLink(ticketActions.ticket.id);
                  }}
                />
                {canEdit && (
                  <Item
                    value="ticket:delete"
                    label="Delete ticket…"
                    keywords={["remove"]}
                    icon={<Trash2 />}
                    shortcut="ticket.delete"
                    onSelect={() => {
                      close(true);
                      ticketActions.commands.requestDelete(ticketActions.ticket.id);
                    }}
                  />
                )}
              </CommandGroup>
            )}

            {/* Only once you type: a full ticket list on open would be noise. */}
            {search && boardId && tickets.length > 0 && (
              <CommandGroup heading="Tickets on this board">
                {tickets.map((t) => (
                  <Item
                    key={t.id}
                    value={`search-ticket:${t.id}`}
                    label={t.title}
                    icon={<FileText />}
                    detail={columns.find((c) => c.id === t.column_id)?.name}
                    onSelect={() => {
                      if (commands?.boardId === boardId) {
                        close(true);
                        commands.openTicket(t.id);
                      } else {
                        go(paths.ticket(boardId, t.id));
                      }
                    }}
                  />
                ))}
              </CommandGroup>
            )}

            <CommandGroup heading="Boards">
              {boardsLoading && !boards && <CommandLoading>Loading boards…</CommandLoading>}
              {boards?.map((b) => (
                <Item
                  key={b.id}
                  value={`board:${b.id}`}
                  label={b.name}
                  icon={<Columns3 />}
                  detail={String(b.id) === String(boardId) ? "Current" : undefined}
                  onSelect={() => go(paths.board(String(b.id)))}
                />
              ))}
            </CommandGroup>

            <CommandGroup heading="Actions">
              {boardId && canEdit && (
                <Item
                  value="action:new-ticket"
                  label="New ticket"
                  keywords={["create", "add"]}
                  icon={<Plus />}
                  shortcut="ticket.create"
                  onSelect={() => go(paths.newTicket(boardId, origin?.columnId ?? undefined))}
                />
              )}
              <Item value="action:new-board" label="New board" keywords={["create"]} icon={<Plus />} onSelect={() => go(paths.newBoard)} />
              {boardId && (
                <Item
                  value="action:settings"
                  label="Board settings"
                  keywords={["members", "columns"]}
                  icon={<Settings />}
                  onSelect={() => go(paths.boardSettings(boardId))}
                />
              )}
              <Item
                value="action:sidebar"
                label="Toggle sidebar"
                icon={<PanelLeft />}
                shortcut="sidebar.toggle"
                onSelect={() => {
                  close();
                  toggleSidebar();
                }}
              />
              <Item value="action:home" label="All boards" keywords={["home"]} icon={<LayoutGrid />} onSelect={() => go(paths.home)} />
            </CommandGroup>
          </>
        )}

        {page === "move" && ticketActions && (
          <CommandGroup heading={`Move “${ticketActions.ticket.title}” to`} className={styles.ticketGroup}>
            {columns.map((c, i) =>
              c.id === ticketActions.ticket.column_id ? null : (
                <Item
                  key={c.id}
                  value={`move:${c.id}`}
                  label={c.name}
                  shortcut={
                    i === columnIndex - 1 ? "ticket.moveLeft" : i === columnIndex + 1 ? "ticket.moveRight" : undefined
                  }
                  onSelect={() => {
                    close();
                    ticketActions.commands.moveTicket(ticketActions.ticket.id, c.id);
                  }}
                />
              )
            )}
          </CommandGroup>
        )}

        {page === "priority" && ticketActions && (
          <CommandGroup heading="Priority">
            {PRIORITIES.map((p) => (
              <Item
                key={p}
                value={`priority:${p}`}
                label={p[0].toUpperCase() + p.slice(1)}
                icon={<span className={styles.dot} data-priority={p} aria-hidden="true" />}
                detail={ticketActions.ticket.priority === p ? "Current" : undefined}
                onSelect={() => update({ priority: p }, `Priority set to ${p}`)}
              />
            ))}
          </CommandGroup>
        )}

        {page === "assignee" && ticketActions && (
          <CommandGroup heading="Assignee">
            <Item
              value="assignee:none"
              label="Unassigned"
              keywords={["nobody", "none"]}
              icon={<UserRound />}
              detail={!ticketActions.ticket.assignee_id ? "Current" : undefined}
              onSelect={() => update({ assignee_id: null }, "Unassigned")}
            />
            {members?.map((m) => (
              <Item
                key={m.user_id}
                value={`assignee:${m.user_id}`}
                label={m.name ?? m.email}
                keywords={[m.email]}
                icon={<UserAvatar size="xs" name={m.name} email={m.email} avatar={m.avatar} />}
                detail={ticketActions.ticket.assignee_id === m.user_id ? "Current" : undefined}
                onSelect={() => update({ assignee_id: m.user_id }, `Assigned to ${m.name ?? m.email}`)}
              />
            ))}
          </CommandGroup>
        )}

        {page === "due" && ticketActions && (
          <CommandGroup
            heading={
              ticketActions.ticket.due_date
                ? `Due date · currently ${shortDate(dateOnly(ticketActions.ticket.due_date))}`
                : "Due date"
            }
          >
            {dueOptions().map((o) => (
              <Item
                key={o.label}
                value={`due:${o.label}`}
                label={o.label}
                icon={<CalendarDays />}
                detail={o.detail}
                onSelect={() =>
                  update(
                    { due_date: o.date ? fromDateInput(formatLocalDate(o.date)) : null },
                    o.date ? `Due ${o.detail}` : "Due date cleared"
                  )
                }
              />
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}

/** API timestamp → local midnight of that calendar day (see lib/date.ts). */
function dateOnly(value: string): Date {
  return parseDateInput(toDateInput(value)) ?? new Date(value);
}

function shortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function dueOptions(): { label: string; date: Date | null; detail?: string }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const plus = (days: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
  return [
    { label: "Today", date: today, detail: shortDate(today) },
    { label: "Tomorrow", date: plus(1), detail: shortDate(plus(1)) },
    { label: "In a week", date: plus(7), detail: shortDate(plus(7)) },
    { label: "No due date", date: null },
  ];
}

interface ItemProps extends Omit<ComponentProps<typeof CommandItem>, "children" | "keywords"> {
  value: string;
  label: string;
  keywords?: string[];
  icon?: ReactNode;
  /** Muted text after the label: a column name, "Current", a date. */
  detail?: string;
  shortcut?: ShortcutId;
}

/** A palette row. Filtering reads `label` + `keywords`; `value` only keys it. */
function Item({ label, keywords = [], icon, detail, shortcut, ...props }: ItemProps) {
  return (
    <CommandItem keywords={[label, ...keywords]} {...props}>
      {icon}
      <span className="truncate">{label}</span>
      {detail && <span className={styles.detail}>{detail}</span>}
      {shortcut && (
        <CommandShortcut>
          <ShortcutKbd id={shortcut} />
        </CommandShortcut>
      )}
    </CommandItem>
  );
}
