// These describe the data we get from the api call
export interface BoardType {
  id: string;
  title: string;
  columns: ColumnType[];
  tickets: TicketType[];
}

export interface ColumnType {
  id: string;
  title: string;
}

export interface TicketType {
  id: string;
  title: string;
  columnID: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  date?: string;
}

export type TicketFormData = Pick<
  TicketType,
  "title" | "description" | "priority" | "date"
>;


