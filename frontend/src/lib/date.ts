// The API stores due dates in a naive TIMESTAMP column and returns them without
// an offset ("2026-09-15T00:00:00"), which JS parses as local time. Every
// conversion here therefore stays on the local calendar: projecting through
// toISOString() would shift the day for anyone not on UTC.

const pad = (n: number) => String(n).padStart(2, "0");

/** Date → the yyyy-mm-dd string the form state and <input type="date"> use. */
export function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** yyyy-mm-dd → a local Date, or undefined when empty or malformed. */
export function parseDateInput(value: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** API timestamp → yyyy-mm-dd. */
export function toDateInput(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return formatLocalDate(d);
}

/** yyyy-mm-dd → the naive timestamp the API stores. Matches NewTicketForm. */
export function fromDateInput(value: string): string {
  return `${value}T00:00:00`;
}
