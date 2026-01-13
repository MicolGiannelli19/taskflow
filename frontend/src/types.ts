// These describe the data we get from the api call
export interface BoardType {
  id: string;
  title: string;
  columns: ColumnType[];
  tickets: TicketType[];
}

export interface ColumnType {
  id: string;
  name: string;
  position?: number;
}

export interface TicketType {
  id: string;                // UUID
  board_id: string;
  column_id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  assignee_id?: string | null;
  creator_id: string;
  due_date?: string | null;   // ISO string
  created_at: string;         // ISO string
  updated_at: string;         // ISO string

  // Optional nested relationships
  // comments?: Comment[];
  // attachments?: Attachment[];
  assignee_name?: string;
  assignee_avatar?: string;
}
export interface TicketTypeSmall {
  id: string;
  column_id: string;
  title: string;
  priority: "low" | "medium" | "high";
  asssignee_id?: string | null; // Question is it common to keep ids for frontend only types ?
  due_date?: string | null;
}


export type TicketFormData = Pick<
  TicketType,
  "title" | "description" | "priority" | "due_date"
>;



