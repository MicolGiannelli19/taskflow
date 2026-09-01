import { forwardRef } from "react";
import { Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopyLink } from "@/hooks/useCopyLink";
import styles from "./CopyableTitle.module.css";

interface CopyableTitleProps extends React.ComponentPropsWithoutRef<"button"> {
  /** Ticket title text. */
  title: string;
  /** App-relative path to the ticket's full page, e.g. /board/1/ticket/2. */
  path: string;
  /** Sizing context — the modal header runs smaller than the full page. */
  variant?: "modal" | "page";
}

/**
 * The ticket title, doubling as a "copy permalink" button: clicking it puts the
 * ticket's full-page URL on the clipboard and plays a confirmation animation
 * (icon swap + ring, a shine across the title, and a pill naming what was
 * copied). Forwards its ref so it can back a Radix `DialogTitle asChild`.
 */
const CopyableTitle = forwardRef<HTMLButtonElement, CopyableTitleProps>(
  ({ title, path, variant = "modal", className, onClick, ...props }, ref) => {
    const { status, burst, copy } = useCopyLink();
    const url = `${window.location.origin}${path}`;

    return (
      <button
        ref={ref}
        type="button"
        className={cn(styles.root, styles[variant], styles[status], className)}
        aria-label={`${title} — copy link to this ticket`}
        onClick={(e) => {
          onClick?.(e);
          void copy(url);
        }}
        {...props}
      >
        <span className={styles.sweepClip} aria-hidden="true">
          {status === "copied" && <span key={burst} className={styles.sweep} />}
        </span>

        <span className={styles.inner}>
          <span className={styles.text}>{title}</span>
          <span className={styles.iconSlot} aria-hidden="true">
            <Link2 className={styles.linkIcon} />
            <Check className={styles.checkIcon} />
            {status === "copied" && <span key={burst} className={styles.pulse} />}
          </span>
        </span>

        <span className={styles.underline} aria-hidden="true" />

        {status !== "idle" && (
          <span
            key={burst}
            className={cn(styles.toast, status === "error" && styles.toastError)}
            aria-hidden="true"
          >
            {status === "copied" ? (
              <>
                <Check className={styles.toastIcon} />
                Link copied
                <span className={styles.toastPath}>{path}</span>
              </>
            ) : (
              <>
                <Link2 className={styles.toastIcon} />
                Couldn't copy — press ⌘C
              </>
            )}
          </span>
        )}

        <span className="sr-only" role="status" aria-live="polite">
          {status === "copied" ? `Link to ${title} copied to clipboard` : ""}
        </span>
      </button>
    );
  }
);
CopyableTitle.displayName = "CopyableTitle";

export default CopyableTitle;
