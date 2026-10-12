import { cn } from "@/lib/utils";
import { comboText } from "@/lib/shortcuts/format";
import { PLATFORM } from "@/lib/shortcuts/keyboard";
import { SHORTCUT_BY_ID, type ShortcutId } from "@/lib/shortcuts/registry";
import styles from "./Kbd.module.css";

interface KbdProps {
  /** A combo in registry syntax, e.g. `"Mod+Shift+ArrowLeft"`. */
  keys: string;
  /** `"inverse"` sits on a dark surface such as a tooltip. */
  tone?: "default" | "inverse";
  className?: string;
}

/**
 * A key hint: `⌘⇧←` on a Mac, `Ctrl+Shift+←` elsewhere. Purely visual
 * (`aria-hidden`): the control it sits beside carries `aria-keyshortcuts`.
 * Hidden on touch screens, where there is no keyboard to press it on.
 */
export function Kbd({ keys, tone = "default", className }: KbdProps) {
  return (
    <kbd aria-hidden="true" className={cn(styles.kbd, tone === "inverse" && styles.inverse, className)}>
      {comboText(keys, PLATFORM)}
    </kbd>
  );
}

/** The hint for a registry shortcut, using its first combo. */
export function ShortcutKbd({ id, ...rest }: Omit<KbdProps, "keys"> & { id: ShortcutId }) {
  return <Kbd keys={SHORTCUT_BY_ID[id].keys[0]} {...rest} />;
}
