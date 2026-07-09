"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { notificationsApi } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { Bell, ListTodo, Calendar, MessageSquare, AlertCircle, Info, Check } from "lucide-react";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data: items, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
  });

  const readAll = useMutation({
    mutationFn: notificationsApi.readAll,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task":
        return <ListTodo className="h-5 w-5 text-blue-500" />;
      case "meeting":
        return <Calendar className="h-5 w-5 text-emerald-500" />;
      case "message":
        return <MessageSquare className="h-5 w-5 text-purple-500" />;
      case "announcement":
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "top":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wider animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Top Priority
          </span>
        );
      case "urgent":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20 uppercase tracking-wider animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            Urgent
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
            Medium
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <TopBar title="Notifications" />
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between border-b pb-4 border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Alert Hub</h2>
            <p className="text-sm text-muted">Keep track of your projects, tasks, and team updates.</p>
          </div>
          {!!items?.some((n) => !n.is_read) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold"
              onClick={() => readAll.mutate()}
              disabled={readAll.isPending}
            >
              <Check className="h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>

        {/* List of Notifications */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 animate-pulse bg-muted/40 h-20" />
            ))}
          </div>
        ) : !items?.length ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <Bell className="h-10 w-10 text-muted mb-3" />
            <h3 className="font-semibold text-base">Inbox fully cleared</h3>
            <p className="text-xs text-muted mt-1 max-w-xs">
              You are all caught up! When new events trigger, they will display here.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <Card
                key={n.id}
                className={cn(
                  "p-4 border transition-all hover:bg-muted/10 relative overflow-hidden",
                  !n.is_read ? "border-primary/20 bg-primary/5/5 shadow-sm" : "border-border/60"
                )}
              >
                {/* Left accent border for unread alerts */}
                {!n.is_read && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                )}

                <div className="flex items-start gap-4">
                  {/* Icon Container */}
                  <div className={cn(
                    "p-2 rounded-lg border",
                    !n.is_read ? "bg-background border-primary/25" : "bg-muted/30 border-transparent"
                  )}>
                    {getNotificationIcon(n.notification_type)}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-foreground line-clamp-1">{n.title}</span>
                      {getPriorityBadge(n.priority)}
                    </div>
                    
                    <p className="text-xs text-foreground/80 leading-relaxed break-all">{n.message}</p>
                    
                    <div className="flex items-center gap-3 mt-2.5 text-[10px] text-muted-foreground">
                      <span className="capitalize bg-muted/50 px-2 py-0.5 rounded font-medium border border-border/20">
                        {n.notification_type}
                      </span>
                      <span>{formatDate(n.created_at)}</span>
                    </div>
                  </div>

                  {/* Action or Link Indicator */}
                  {!n.is_read && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2.5 animate-pulse" />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
