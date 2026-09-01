import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatLocalDate, parseDateInput } from "@/lib/date";

interface DueDatePickerProps {
  /** yyyy-mm-dd, "" when there is no due date. */
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Popover calendar with year/month dropdowns, used for a ticket's due date.
 *
 * A due date is a single day, so this runs react-day-picker in "single" mode.
 * Values cross the component boundary as the same yyyy-mm-dd string the form
 * state and the API speak — the Date object never escapes, so there is no UTC
 * round-trip to shift the day.
 */
export default function DueDatePicker({
  value,
  onChange,
  className,
}: DueDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseDateInput(value);
  const today = new Date();

  // Which month the grid shows. Seeded from the selection, then driven by the
  // dropdowns below and by the calendar's own prev/next arrows.
  const [month, setMonth] = React.useState<Date>(() => selected ?? today);

  // Reopening should land on the month that matters now, not wherever the user
  // last browsed before closing.
  React.useEffect(() => {
    if (open) setMonth(parseDateInput(value) ?? new Date());
  }, [open, value]);

  // Always wide enough to reach an already-set date, however far out it is.
  const selectedYear = selected?.getFullYear();
  const minYear = Math.min(today.getFullYear() - 5, selectedYear ?? Infinity);
  const maxYear = Math.max(today.getFullYear() + 10, selectedYear ?? -Infinity);
  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => minYear + i
  );

  function pick(date: Date | undefined) {
    onChange(date ? formatLocalDate(date) : "");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate overflow-hidden">
            {selected ? format(selected, "PPP") : "Pick a due date"}
          </span>
        </Button>
      </PopoverTrigger>

      {/* The Due row sits low in the ticket modal, so Radix's collision
          handling would flip the panel above the trigger. Keep it below and
          rely on the compact sizing below to fit. */}
      <PopoverContent
        className="w-auto overflow-y-auto p-2"
        side="bottom"
        sideOffset={4}
        align="start"
        avoidCollisions={false}
        // Pinned below, so on a long ticket the panel can run past the fold —
        // and the app shell does not scroll. Cap it to the room Radix says is
        // actually there and let the panel scroll instead of going unreachable.
        style={{ maxHeight: "var(--radix-popover-content-available-height)" }}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Select
              value={month.getFullYear().toString()}
              onValueChange={(v) =>
                setMonth(new Date(Number(v), month.getMonth(), 1))
              }
            >
              <SelectTrigger className="h-8 w-[92px] text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={month.getMonth().toString()}
              onValueChange={(v) =>
                setMonth(new Date(month.getFullYear(), Number(v), 1))
              }
            >
              <SelectTrigger className="h-8 w-[116px] text-xs">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {format(new Date(2000, i, 1), "MMMM")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto flex gap-0.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => pick(undefined)}
                disabled={!selected}
              >
                Clear
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => pick(today)}
              >
                Today
              </Button>
            </div>
          </div>

          <Calendar
            mode="single"
            selected={selected}
            onSelect={pick}
            month={month}
            onMonthChange={setMonth}
            className="rounded-md border p-2"
            // calendar.tsx sets [--cell-size] in its own class list, so an
            // arbitrary-property class here would be a specificity coin flip.
            // Inline style wins deterministically.
            style={{ "--cell-size": "1.85rem" } as React.CSSProperties}
            // The stock slots are spaced for a full-page calendar: gap-4
            // between caption and grid, mt-2 on every week row. That is what
            // made the panel ~500px tall. classNames is spread last in
            // calendar.tsx, so these win.
            classNames={{
              month: "flex w-full flex-col gap-2",
              week: "mt-0.5 flex w-full",
              // The caption ("August 2026") and its ‹ › arrows duplicate the
              // dropdowns above, and cost the vertical room that pushed the
              // footer past the fold. The dropdowns are the navigation.
              month_caption: "hidden",
              nav: "hidden",
            }}
          />

        </div>
      </PopoverContent>
    </Popover>
  );
}
