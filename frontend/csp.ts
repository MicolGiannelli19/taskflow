/**
 * Content-Security-Policy for the TaskFlow app page.
 *
 * Why here and not in the API: a CSP is delivered with the *document*, and the
 * document is served by Vite in development and by a static host in
 * production — never by FastAPI. The policy in `backend/app/security_headers.py`
 * governs API responses only. This is the one that stands behind
 * `react-markdown` when it renders another member's ticket description.
 *
 * ### Status: not yet verified against a live Clerk instance
 *
 * Clerk's hosts below come from Clerk's CSP documentation, not from watching a
 * real sign-in. Until someone runs the report-only pass described in
 * `backend/docs/auth.md`, treat the list as a hypothesis: run the app with
 * `VITE_CSP_MODE=report`, exercise sign-in / sign-up / profile / a board, and
 * read the violations out of the browser console. Add the hosts they name.
 * Never widen a directive to `*` to silence one.
 */

/** Clerk's Frontend API host, read out of the publishable key.
 *
 * A publishable key is `pk_test_<base64 of "host$">` (or `pk_live_…`), so the
 * exact instance host can be derived rather than guessed. That is what keeps
 * `script-src` free of a `https://*.clerk.accounts.dev` wildcard, and it means
 * the policy follows the key when you move to a production instance.
 */
export function frontendApiHost(publishableKey?: string): string | null {
  if (!publishableKey) return null;
  const encoded = publishableKey.replace(/^pk_(test|live)_/, "");
  if (encoded === publishableKey) return null;
  try {
    const decoded = atob(encoded);
    const host = decoded.replace(/\$$/, "").trim();
    return /^[a-z0-9.-]+$/i.test(host) ? `https://${host}` : null;
  } catch {
    return null;
  }
}

export interface CspOptions {
  /** Development adds what the Vite dev server itself needs. */
  dev: boolean;
  publishableKey?: string;
  /** Where axios sends requests, e.g. http://localhost:8000. */
  apiUrl?: string;
}

export function buildPageCsp({ dev, publishableKey, apiUrl }: CspOptions): string {
  const clerk = frontendApiHost(publishableKey);

  // Falling back to the wildcard is a development-only concession: without a
  // key there is no instance host to name, and every dev instance lives under
  // this domain. A production build should always have its key.
  const clerkHosts = clerk ? [clerk] : dev ? ["https://*.clerk.accounts.dev"] : [];

  // Clerk's bot/abuse protection runs on Cloudflare Turnstile and on
  // *.protect.clerk.com, which uses non-443 ports — hence the `:*`.
  const clerkProtect = "https://*.protect.clerk.com";
  const turnstile = "https://challenges.cloudflare.com";

  const api = apiUrl ? [apiUrl] : [];

  const scriptSrc = ["'self'", ...clerkHosts, clerkProtect, turnstile];
  if (dev) {
    // Vite's React plugin injects an inline module preamble into index.html,
    // and its HMR client is inline too. Production builds need neither, which
    // is why this is fenced off rather than added to the shared list.
    scriptSrc.push("'unsafe-inline'");
  }

  const connectSrc = [
    "'self'",
    ...api,
    ...clerkHosts,
    `${clerkProtect}:*`,
    // Vite's HMR socket. Port-agnostic on purpose: `vite --port` and Vite's
    // own "port already in use, trying the next one" both move it, and a
    // hardcoded 5173 turns that into a confusing violation report. Localhost
    // only, and development only.
    ...(dev ? ["ws://localhost:*", "http://localhost:*"] : []),
  ];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "connect-src": connectSrc,
    // 'unsafe-inline' is required: Clerk's components style themselves at
    // runtime (CSS-in-JS), and so does Tailwind's dev injection. Styles cannot
    // exfiltrate a token, so this is a far smaller concession than it looks.
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    // User avatars come from Clerk; `data:` covers inline SVG icons.
    "img-src": ["'self'", "data:", "blob:", "https://img.clerk.com"],
    // Clerk runs its session management in a worker.
    "worker-src": ["'self'", "blob:"],
    // The Turnstile challenge renders in an iframe.
    "frame-src": ["'self'", turnstile, clerkProtect],
    // Nothing may embed TaskFlow — clickjacking protection.
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'", ...clerkHosts],
    // No <object>/<embed>; both are script-execution vectors.
    "object-src": ["'none'"],
  };

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

/**
 * Which header to send.
 *
 * `report` (the default in development) tells the browser to log violations
 * and allow them anyway, so a wrong directive cannot lock you out of sign-in.
 * Switch to `enforce` once the console is clean — see `backend/docs/auth.md`.
 */
export function cspHeaderName(mode: string | undefined): string {
  return mode === "enforce"
    ? "Content-Security-Policy"
    : "Content-Security-Policy-Report-Only";
}
