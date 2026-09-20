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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Clerk owns the session, so it wraps everything: the query client below
        it fetches with a Clerk token, and the router's guards read Clerk state. */}
    <ClerkProvider
      publishableKey={publishableKey}
      afterSignOutUrl="/login"
      appearance={{ theme: shadcn }}
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
