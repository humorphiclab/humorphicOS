"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, CheckSquare, FolderKanban, Calendar, Users, FileText,
  LogOut, Bot, ClipboardList, Building2, UsersRound, Megaphone, Bell,
  BarChart3, Package, BookOpen, Award, PartyPopper, MessageSquare,
  Trophy, Brain, Search, Settings, QrCode, Globe, ScrollText,
} from "lucide-react";
import { cn, slugify } from "@/lib/utils";
import { authApi, getStoredUser, setStoredTokens, setStoredUser } from "@/lib/api";
import { canAccessNav } from "@/lib/permissions";

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, resource: "dashboard" },
      { href: "/calendar", label: "Calendar", icon: Calendar, resource: "meetings" },
      { href: "/analytics", label: "Analytics", icon: BarChart3, resource: "analytics", leadership: true },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/tasks", label: "Tasks", icon: CheckSquare, resource: "tasks" },
      { href: "/projects", label: "Projects", icon: FolderKanban, resource: "projects" },
      { href: "/daily-updates", label: "Daily Updates", icon: ClipboardList, resource: "daily_updates" },
      { href: "/meetings", label: "Meetings", icon: Calendar, resource: "meetings" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/members", label: "Members", icon: Users, resource: "users" },
      { href: "/departments", label: "Departments", icon: Building2, resource: "departments" },
      { href: "/teams", label: "Teams", icon: UsersRound, resource: "teams" },
      { href: "/attendance", label: "Attendance", icon: QrCode, resource: "attendance" },
    ],
  },
  {
    label: "Resources",
    items: [
      { href: "/inventory", label: "Inventory", icon: Package, resource: "inventory" },
      { href: "/knowledge", label: "Knowledge Base", icon: BookOpen, resource: "knowledge" },
      { href: "/events", label: "Events", icon: PartyPopper, resource: "events" },
      { href: "/certificates", label: "Certificates", icon: Award, resource: "certificates" },
    ],
  },
  {
    label: "Communication",
    items: [
      { href: "/announcements", label: "Announcements", icon: Megaphone, resource: "announcements" },
      { href: "/notifications", label: "Notifications", icon: Bell, resource: "notifications" },
      { href: "/chat", label: "Chat", icon: MessageSquare, resource: "chat" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/ai", label: "AI Assistant", icon: Brain, resource: "settings" },
      { href: "/leaderboard", label: "Leaderboard", icon: Trophy, resource: "settings" },
      { href: "/reports", label: "Reports", icon: FileText, resource: "reports", leadership: true },
      { href: "/organizations", label: "Organizations", icon: Globe, resource: "organizations", leadership: true },
      { href: "/audit-logs", label: "Audit Logs", icon: ScrollText, resource: "audit-logs", leadership: true },
      { href: "/settings", label: "Settings", icon: Settings, resource: "settings" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getStoredUser();
  const { data: permData } = useQuery({
    queryKey: ["permissions"],
    queryFn: authApi.permissions,
  });

  const logout = () => {
    setStoredTokens(null);
    setStoredUser(null);
    router.push("/login");
  };

  const visible = (item: { resource: string; leadership?: boolean }) => {
    if (item.resource === "dashboard" || item.resource === "notifications") return true;
    return canAccessNav(permData?.permissions, item.resource, permData?.is_leadership);
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 border-r border-card-border bg-card flex flex-col z-20">
      <div className="p-4 border-b border-card-border">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-primary p-2">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm">HumorphicOS</h1>
            <p className="text-xs text-muted">Robotics Club Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto space-y-4">
        {navSections.map((section) => {
          const items = section.items.filter(visible);
          if (!items.length) return null;
          return (
            <div key={section.label}>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {items.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      pathname === href
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted hover:bg-card-border/30 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-card-border">
        {user && (
          <div className="mb-2 px-2">
            <p className="text-sm font-medium truncate">{user.first_name} {user.last_name}</p>
            <p className="text-xs text-muted truncate">{user.role?.name || "Member"}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-card-border/30 hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-card-border bg-background/80 backdrop-blur-sm px-6 py-3">
      <h2 className="text-lg font-semibold shrink-0">{title}</h2>
      <Link
        href="/search"
        className="flex flex-1 items-center gap-2 rounded-lg border border-card-border bg-card px-3 py-1.5 text-sm text-muted hover:border-primary/50 transition-colors max-w-md"
      >
        <Search className="h-4 w-4" />
        Search members, tasks, projects...
      </Link>
      <Link href="/notifications" className="relative rounded-lg p-2 hover:bg-card-border/30 transition-colors">
        <Bell className="h-5 w-5 text-muted" />
      </Link>
    </header>
  );
}
