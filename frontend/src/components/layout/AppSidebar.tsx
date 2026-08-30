import { Link, useParams } from "react-router-dom";
import { History, Home, Plus, Settings } from "lucide-react";
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
import { paths } from "@/routes";
import BoardSwitcher from "./BoardSwitcher";

export default function AppSidebar() {
  const { boardId } = useParams();
  const { user } = useAuth();

  return (
    <Sidebar collapsible="icon">

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Board</SidebarGroupLabel>
          <SidebarGroupContent className="px-2 group-data-[collapsible=icon]:hidden">
            <BoardSwitcher />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Board actions only make sense once a board is in the URL. */}
        {boardId && (
          <SidebarGroup>
            <SidebarGroupLabel>Actions</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Add New Ticket">
                    <Link to={paths.newTicket(boardId)}>
                      <Plus />
                      <span>Add New Ticket</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Board Settings">
                    <Link to={paths.boardSettings(boardId)}>
                      <Settings />
                      <span>Board Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Board History">
                    <Link to={paths.boardHistory(boardId)}>
                      <History />
                      <span>Board History</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
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
