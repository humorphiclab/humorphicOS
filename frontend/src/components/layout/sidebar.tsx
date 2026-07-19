"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { ThemeToggle } from "@/components/theme-toggle";


const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, resource: "dashboard" },
      { href: "/my-space", label: "My Space", icon: ClipboardList, resource: "dashboard" },
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
      { href: "/directory", label: "Directory", icon: UsersRound, resource: "dashboard" },
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
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

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
    if (user?.is_superuser) return true;
    if (item.resource === "dashboard" || item.resource === "notifications") return true;
    return canAccessNav(permData?.permissions, item.resource, permData?.is_leadership);
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 border-r border-card-border bg-card flex flex-col z-20">
      <div className="p-4 border-b border-card-border">
        <div className="flex items-center gap-2.5">
          <img src="/site_logo.png" alt="HumorphicOS Logo" className="h-9 w-9 object-contain rounded-lg" />
          <div>
            <h1 className="font-bold text-sm">HumorphicOS</h1>
            <p className="text-xs text-muted">Robotics Club Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto space-y-4">
        {navSections.map((section) => {
          const items = mounted ? section.items.filter(visible) : [];
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
        {mounted && user && (
          <Link
            href={`/members/${user.id}`}
            className="block mb-2 px-2 py-1 rounded hover:bg-card-border/30 transition-colors"
          >
            <p className="text-sm font-medium truncate hover:text-primary transition-colors">{user.first_name} {user.last_name}</p>
            <p className="text-xs text-muted truncate">{user.role?.name || (user.is_superuser ? "Superuser" : "Member")}</p>
          </Link>
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

function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (pathname === "/search") {
      setQuery(searchParams.get("q") || "");
    } else {
      setQuery("");
    }
  }, [pathname, searchParams]);

  const handleChange = (val: string) => {
    setQuery(val);
    if (pathname !== "/search") {
      router.push(`/search?q=${encodeURIComponent(val)}`);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      if (val) {
        params.set("q", val);
      } else {
        params.delete("q");
      }
      router.replace(`/search?${params.toString()}`);
    }
  };

  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search members, tasks, projects..."
        className="w-full rounded-lg border border-card-border bg-card pl-10 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted hover:border-primary/50 focus:border-primary focus:outline-none transition-colors"
      />
    </div>
  );
}

export function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-card-border bg-background/80 backdrop-blur-sm px-6 py-3">
      <h2 className="text-lg font-semibold shrink-0">{title}</h2>
      <Suspense fallback={<div className="relative flex-1 max-w-md h-9 bg-card rounded-lg" />}>
        <SearchBar />
      </Suspense>
      <Link href="/notifications" className="relative rounded-lg p-2 hover:bg-card-border/30 transition-colors">
        <Bell className="h-5 w-5 text-muted" />
      </Link>
      <ThemeToggle />
    </header>
  );
}
