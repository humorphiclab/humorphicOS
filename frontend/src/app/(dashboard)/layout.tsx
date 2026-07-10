"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStoredTokens, notificationsApi } from "@/lib/api";
import { Sidebar, TopBar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Bell, ListTodo, Calendar, MessageSquare, AlertCircle, AlertTriangle, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showPopup, setShowPopup] = useState(false);
  const [unreadList, setUnreadList] = useState<any[]>([]);

  useEffect(() => {
    if (!getStoredTokens()) {
      router.replace("/login");
    }
  }, [router]);

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
    enabled: typeof window !== "undefined" && !!getStoredTokens(),
  });

  const readAll = useMutation({
    mutationFn: notificationsApi.readAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
      setShowPopup(false);
    },
  });

  useEffect(() => {
    if (notifications) {
      const unreads = notifications.filter((n) => !n.is_read);
      const hasShown = sessionStorage.getItem("has_shown_notification_popup");
      if (unreads.length > 0 && !hasShown) {
        setUnreadList(unreads);
        setShowPopup(true);
        sessionStorage.setItem("has_shown_notification_popup", "true");
      }
    }
  }, [notifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task":
      case "task_assigned":
        return <ListTodo className="h-4 w-4 text-blue-500" />;
      case "meeting":
        return <Calendar className="h-4 w-4 text-emerald-500" />;
      case "message":
      case "friend_request":
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case "announcement":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "reminder":
        return <AlertTriangle className="h-4 w-4 text-rose-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "top":
        return "border-red-500/30 bg-red-500/5 text-red-500";
      case "urgent":
      case "high":
        return "border-orange-500/30 bg-orange-500/5 text-orange-500";
      case "medium":
      case "normal":
        return "border-blue-500/30 bg-blue-500/5 text-blue-500";
      default:
        return "border-border bg-muted/20 text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 min-h-screen">{children}</main>

      {/* Notifications Login Alert Popup Modal */}
      {showPopup && unreadList.length > 0 && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs z-[9999] p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bell className="h-5 w-5 text-primary animate-bounce" />
                  <span className="absolute -top-1.5 -right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                </div>
                <h3 className="font-bold text-sm text-foreground">New Alerts & Updates</h3>
              </div>
              <button 
                onClick={() => setShowPopup(false)}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* List */}
            <div className="p-4 max-h-[250px] overflow-y-auto space-y-3 divide-y divide-border/30">
              {unreadList.map((n, idx) => (
                <div key={n.id} className={cn("pt-3 flex gap-3 items-start", idx === 0 && "pt-0")}>
                  <div className="p-1.5 rounded-lg border border-border bg-muted/40 shrink-0 mt-0.5">
                    {getNotificationIcon(n.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-xs text-foreground line-clamp-1">{n.title}</p>
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider border",
                        getPriorityColor(n.priority)
                      )}>
                        {n.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border bg-muted/10 flex items-center justify-end gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowPopup(false)}
                className="text-xs h-8 px-3"
              >
                Later
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => readAll.mutate()}
                disabled={readAll.isPending}
                className="text-xs h-8 px-3 gap-1 font-semibold"
              >
                <Check className="h-3.5 w-3.5" /> Acknowledge All ({unreadList.length})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { TopBar };
