import { useCallback, useEffect, useRef, useState } from "react";

export type CopyStatus = "idle" | "copied" | "error";

async function writeToClipboard(text: string): Promise<boolean> {
  // The async Clipboard API needs a secure context; it's missing on plain-http
  // origins (e.g. hitting the dev server over the LAN) and can reject when the
  // document isn't focused.
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path
    }
  }

  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "0";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

/**
 * Copy-to-clipboard with a self-clearing status.
 *
 * `burst` increments on every copy; use it as a React `key` on animated nodes
 * so the confirmation animation replays when the same link is copied twice.
 */
export function useCopyLink(resetMs = 1900) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const [burst, setBurst] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string) => {
      const ok = await writeToClipboard(text);
      setStatus(ok ? "copied" : "error");
      setBurst((b) => b + 1);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setStatus("idle"), resetMs);
    },
    [resetMs]
  );

  return { status, burst, copy };
}
