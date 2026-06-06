import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import AuthProvider from "./context/AuthProvider.tsx";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query"

const client = new QueryClient()
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
    <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
    </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);

// This is where we want to manage our react query porvideder 