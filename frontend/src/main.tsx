import { ClerkProvider } from "@clerk/react";
import { shadcn } from "@clerk/ui/themes";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import ClerkTokenBridge from "./components/ClerkTokenBridge";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  // Clerk's own error for this is opaque, and a missing key is the expected
  // state until someone runs `clerk auth login` + `clerk env pull`.
  throw new Error(
    "Missing VITE_CLERK_PUBLISHABLE_KEY. Run `npx clerk@latest auth login` " +
      "then `npx clerk@latest env pull` in frontend/, and restart the dev server."
  );
}

// Clerk's shadcn theme reads `var(--primary)` etc. as complete colors, but our
// tokens in index.css are bare HSL channels ("11 82% 41%") meant to be wrapped
// in hsl(). Unwrapped they are invalid, so every Clerk surface, border and
// button rendered transparent. These override the theme's color variables.
const clerkColors = {
  colorBackground: "hsl(var(--card))",
  colorDanger: "hsl(var(--destructive))",
  colorForeground: "hsl(var(--card-foreground))",
  // Clerk fills inputs with colorInput; shadcn's --input is a border color.
  colorInput: "hsl(var(--card))",
  colorInputForeground: "hsl(var(--card-foreground))",
  colorMuted: "hsl(var(--muted))",
  colorMutedForeground: "hsl(var(--muted-foreground))",
  colorNeutral: "hsl(var(--foreground))",
  colorPrimary: "hsl(var(--primary))",
  colorPrimaryForeground: "hsl(var(--primary-foreground))",
  colorRing: "hsl(var(--ring) / 0.5)",
  colorModalBackdrop: "hsl(0 0% 0% / 0.5)",
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Clerk owns the session, so it wraps everything: the query client below
        it fetches with a Clerk token, and the router's guards read Clerk state. */}
    <ClerkProvider
      publishableKey={publishableKey}
      afterSignOutUrl="/login"
      appearance={{ theme: shadcn, variables: clerkColors }}
    >
      <QueryClientProvider client={queryClient}>
        {/* Hands Clerk's getToken to the axios interceptor, which has no hooks. */}
        <ClerkTokenBridge />
        <RouterProvider router={router} />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ClerkProvider>
  </StrictMode>
);
