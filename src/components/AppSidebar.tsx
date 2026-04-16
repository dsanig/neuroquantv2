import {
  LayoutDashboard, Layers, ArrowLeftRight, Target, ShieldAlert, 
  Landmark, TrendingUp, DollarSign, Download, Database, 
  Settings2, MapPin, FileText, ScrollText, Settings, UserCog, LogOut, Brain,
  Crosshair, FlaskConical, ShieldCheck, BookOpen, Globe,
  GitCompare, Zap, BarChart3, Wallet, Scale, Search, LineChart, RefreshCw
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Wheel Tracker", url: "/wheel-tracker", icon: Target },
  { title: "Campaign Tracker", url: "/campaigns", icon: Crosshair },
  { title: "Iron Condor", url: "/condor-tracker", icon: Layers },
  { title: "Capital Tracker", url: "/capital", icon: Wallet },
  { title: "Liquidity & Sectors", url: "/liquidity", icon: Scale },
  { title: "Stress Testing", url: "/stress", icon: Zap },
  { title: "Comparison Lab", url: "/comparison", icon: GitCompare },
  { title: "Performance", url: "/performance", icon: TrendingUp },
  { title: "Payoff Charts", url: "/payoff", icon: LineChart },
];

const dataNav = [
  { title: "Data & Integrations", url: "/providers", icon: Globe },
  { title: "Instrument Master", url: "/instruments", icon: Search },
  { title: "Imports", url: "/imports", icon: Download },
  { title: "Data Connections", url: "/sources", icon: Database },
  { title: "Parser Config", url: "/parser-config", icon: Settings2 },
  { title: "Mapping Rules", url: "/mapping-rules", icon: MapPin },
];

const adminNav = [
  { title: "Data Quality", url: "/data-quality", icon: ShieldCheck },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Recompute", url: "/recompute", icon: RefreshCw },
  { title: "Audit Log", url: "/audit-log", icon: ScrollText },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
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
            <span className="text-base font-semibold text-foreground tracking-tight">NeuroQuant</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground px-3">Portfolio</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(mainNav)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground px-3">Data Operations</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(dataNav)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground px-3">Admin</SidebarGroupLabel>
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
