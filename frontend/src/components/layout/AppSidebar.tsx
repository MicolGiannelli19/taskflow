import { Link, useMatch, useParams } from "react-router-dom";
import { History, Home, Plus, Settings, SquareKanban } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { paths, routePatterns } from "@/routes";
import { ShortcutKbd } from "@/components/shortcuts/Kbd";

export default function AppSidebar() {
  const { boardId } = useParams();
  const { user } = useAuth();
  const onSettings = useMatch(routePatterns.boardSettings) !== null;
  const onHistory = useMatch(routePatterns.boardHistory) !== null;
  // Tickets and the new-ticket dialog belong to the board view.
  const onBoard = !onSettings && !onHistory;

  return (
    <Sidebar collapsible="icon">

      <SidebarContent>
        {/* Switching boards lives in the header's search (⌘K), not here.
            Views and actions only make sense once a board is in the URL. */}
        {boardId && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Views</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={onBoard} tooltip="Board">
                      <Link to={paths.board(boardId)}>
                        <SquareKanban />
                        <span>Board</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={onSettings}
                      tooltip="Board Settings"
                    >
                      <Link to={paths.boardSettings(boardId)}>
                        <Settings />
                        <span>Board Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={onHistory}
                      tooltip="Board History"
                    >
                      <Link to={paths.boardHistory(boardId)}>
                        <History />
                        <span>Board History</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Actions</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Add New Ticket">
                      <Link to={paths.newTicket(boardId)}>
                        <Plus />
                        <span>Add New Ticket</span>
                        <ShortcutKbd
                          id="ticket.create"
                          className="ml-auto group-data-[collapsible=icon]:hidden"
                        />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Home">
              <Link to={paths.home}>
                <Home />
                <span>Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={user?.name ?? "Profile"}>
              <Link to={paths.profile}>
                <UserAvatar
                  size="xs"
                  name={user?.name}
                  email={user?.email}
                  avatar={user?.avatar}
                />
                <span>{user?.name ?? "Profile"}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
