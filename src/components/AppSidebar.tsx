import {
  LayoutDashboard, Layers, ArrowLeftRight, Target, ShieldAlert, 
  Landmark, TrendingUp, DollarSign, Download, Database, 
  Settings2, MapPin, FileText, ScrollText, Settings, UserCog, LogOut, Brain
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Positions", url: "/positions", icon: Layers },
  { title: "Trades", url: "/trades", icon: ArrowLeftRight },
  { title: "Strategies", url: "/strategies", icon: Target },
  { title: "Risk", url: "/risk", icon: ShieldAlert },
  { title: "Margin", url: "/margin", icon: Landmark },
  { title: "Performance", url: "/performance", icon: TrendingUp },
  { title: "Income", url: "/income", icon: DollarSign },
];

const ingestionNav = [
  { title: "Imports", url: "/imports", icon: Download },
  { title: "Sources", url: "/sources", icon: Database },
  { title: "Parser Config", url: "/parser-config", icon: Settings2 },
  { title: "Mapping Rules", url: "/mapping-rules", icon: MapPin },
];

const adminNav = [
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Audit Log", url: "/audit-log", icon: ScrollText },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Admin", url: "/admin", icon: UserCog },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { logout, user } = useAuth();

  const renderItems = (items: typeof mainNav) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild>
            <NavLink
              to={item.url}
              end={item.url === "/"}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-[13px]"
              activeClassName="bg-sidebar-accent text-primary font-medium"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <Brain className="h-5 w-5 text-primary shrink-0" />
          {!collapsed && (
            <span className="text-base font-semibold text-foreground tracking-tight">
              NeuroQuant
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground px-3">Portfolio</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(mainNav)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground px-3">Ingestion</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(ingestionNav)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground px-3">Operations</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(adminNav)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="text-xs text-muted-foreground mb-2 px-1 truncate">{user.email}</div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout} className="text-muted-foreground hover:text-destructive text-[13px]">
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
