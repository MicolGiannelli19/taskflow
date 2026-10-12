import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ShortcutId } from "@/lib/shortcuts/registry";
import { ShortcutKbd } from "./Kbd";

interface ShortcutTooltipProps {
  id: ShortcutId;
  label: string;
  /** A single focusable element; it becomes the tooltip's trigger. */
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * "Toggle sidebar ⌘B" on hover or focus. The delay keeps it out of the way for
 * people moving the pointer across the header without meaning to ask.
 */
export default function ShortcutTooltip({ id, label, children, side = "bottom" }: ShortcutTooltipProps) {
  return (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="flex items-center gap-2">
        {label}
        <ShortcutKbd id={id} tone="inverse" />
      </TooltipContent>
    </Tooltip>
  );
}
