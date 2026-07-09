"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { notificationsApi } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { Bell, ListTodo, Calendar, MessageSquare, AlertCircle, Info, Check, CheckCircle2 } from "lucide-react";

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

  const markRead = useMutation({
    mutationFn: notificationsApi.read,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task":
      case "task_assigned":
        return <ListTodo className="h-5 w-5 text-blue-500" />;
      case "meeting":
        return <Calendar className="h-5 w-5 text-emerald-500" />;
      case "message":
      case "friend_request":
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
      case "high":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20 uppercase tracking-wider animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            {priority === "high" ? "High" : "Urgent"}
          </span>
        );
      case "medium":
      case "normal":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Normal
          </span>
        );
      case "low":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            Low
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <TopBar title="Notifications" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Main List */}
          <div className="md:col-span-2 space-y-4">
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
                      "p-4 border transition-all hover:bg-muted/10 relative overflow-hidden flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between",
                      !n.is_read ? "border-primary/20 bg-primary/5 shadow-sm" : "border-border/60"
                    )}
                  >
                    {/* Left accent border for unread alerts */}
                    {!n.is_read && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    )}

                    <div className="flex items-start gap-4 flex-1">
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
                            {n.notification_type.replace("_", " ")}
                          </span>
                          <span>{formatDate(n.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-10 sm:ml-0 shrink-0">
                      {n.link && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="text-xs h-7 px-3"
                          onClick={() => window.location.href = n.link}
                        >
                          View
                        </Button>
                      )}
                      {!n.is_read && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                          onClick={() => markRead.mutate(n.id)}
                          disabled={markRead.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Mark read
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Priority Legend Sidebar */}
          <div className="md:col-span-1 space-y-4">
            <Card className="p-4 border border-border bg-card">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                <Info className="h-4 w-4 text-primary" />
                Priority Legend
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Notifications are tiered to help you focus on what matters most.
              </p>
              <div className="space-y-3">
                
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <div>
                    <span className="block text-xs font-bold text-red-500">TOP PRIORITY</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">Critical system alerts and direct assignments from the President, VP, or Faculty.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0 h-2 w-2 rounded-full bg-orange-500" />
                  <div>
                    <span className="block text-xs font-bold text-orange-500">URGENT / HIGH</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">Meetings starting in less than 5 minutes or assignments from Team Leads & Mentors.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0 h-2 w-2 rounded-full bg-blue-500" />
                  <div>
                    <span className="block text-xs font-bold text-blue-500">NORMAL</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">Standard tasks, friend requests, announcements, and meetings &gt; 15 minutes away.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0 h-2 w-2 rounded-full bg-muted-foreground" />
                  <div>
                    <span className="block text-xs font-bold text-muted-foreground">LOW</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">General system updates and optional events.</span>
                  </div>
                </div>

              </div>
            </Card>

            <Card className="p-4 border border-border bg-card">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Types</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ListTodo className="h-4 w-4 text-blue-500" /> Tasks & Assignments
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-4 w-4 text-emerald-500" /> Meetings & Events
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageSquare className="h-4 w-4 text-purple-500" /> Messages & Social
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="h-4 w-4 text-amber-500" /> Announcements
                </div>
              </div>
            </Card>
          </div>

        </div>
      </div>
    </>
  );
}
