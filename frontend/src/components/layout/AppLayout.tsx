import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";

/**
 * The signed-in app shell: sidebar + top bar around every page. Pages render
 * into the Outlet and own their own padding — the board wants full bleed,
 * document-style pages want a centred sheet.
 */
export default function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      {/* SidebarInset is the page's <main>; pages must not nest another one. */}
      <SidebarInset>
        <AppHeader />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
