import type { CSSProperties } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import styles from "./UserAvatar.module.css";

export interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

/** "Alice Johnson" → "AJ"; single words and emails fall back to two letters. */
function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable hue per person, so two fallbacks are never the same colour by luck. */
function hue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) % 360;
  }
  return h;
}

/**
 * A person, rendered. Shows their profile image, falls back to tinted
 * initials, and falls back again to a neutral placeholder when there is no
 * user at all (an unassigned ticket).
 *
 * Shared on purpose: ticket cards, the ticket detail, comments and the
 * sidebar all show the same person the same way.
 */
export default function UserAvatar({
  name,
  email,
  avatar,
  size = "sm",
  className,
}: UserAvatarProps) {
  const label = name?.trim() || email?.trim() || "";
  const known = label.length > 0;

  return (
    <Avatar
      role="img"
      aria-label={known ? label : "Unassigned"}
      title={known ? label : "Unassigned"}
      className={cn(styles.root, styles[size], className)}
    >
      {/* alt="" — the root already carries the accessible name. */}
      {avatar && <AvatarImage src={avatar} alt="" />}
      <AvatarFallback
        className={cn(styles.fallback, !known && styles.empty)}
        style={
          known
            ? ({ "--avatar-hue": String(hue(label)) } as CSSProperties)
            : undefined
        }
      >
        {known ? initials(label) : "?"}
      </AvatarFallback>
    </Avatar>
  );
}
