"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { notificationsApi, departmentsApi, teamsApi, membersApi, getStoredUser, getImageUrl } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { Bell, ListTodo, Calendar, MessageSquare, AlertCircle, Info, Check, CheckCircle2, AlertTriangle, ArrowRight, X } from "lucide-react";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const user = getStoredUser();
  const isLead = user?.role?.is_leadership || user?.is_superuser;

  const [activeTab, setActiveTab] = useState<"all" | "unread" | "task" | "meeting" | "announcement">("all");
  
  // Broadcast Form State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    message: "",
    target_type: "all" as "all" | "department" | "team" | "user",
    target_id: "" as string | number,
    priority: "normal",
    notification_type: "system",
    link: "",
  });
  const [broadcastError, setBroadcastError] = useState("");
  const [broadcastSuccess, setBroadcastSuccess] = useState("");

  const { data: items, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
  });

  // Query resources for Broadcast modal target options
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: departmentsApi.list,
    enabled: !!isLead,
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: teamsApi.list,
    enabled: !!isLead,
  });

  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: membersApi.list,
    enabled: !!isLead,
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

  const broadcastMutation = useMutation({
    mutationFn: notificationsApi.broadcast,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
      setBroadcastSuccess(data.detail || "Broadcast notification sent successfully!");
      setBroadcastError("");
      setBroadcastForm({
        title: "",
        message: "",
        target_type: "all",
        target_id: "",
        priority: "normal",
        notification_type: "system",
        link: "",
      });
      setTimeout(() => {
        setShowBroadcastModal(false);
        setBroadcastSuccess("");
      }, 2000);
    },
    onError: (err: any) => {
      setBroadcastError(err.message || "Failed to send broadcast notification.");
      setBroadcastSuccess("");
    },
  });

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.message) {
      setBroadcastError("Please fill in the title and message fields.");
      return;
    }
    if (broadcastForm.target_type !== "all" && !broadcastForm.target_id) {
      setBroadcastError(`Please select a target ${broadcastForm.target_type}.`);
      return;
    }
    broadcastMutation.mutate({
      ...broadcastForm,
      target_id: broadcastForm.target_id ? Number(broadcastForm.target_id) : null,
    });
  };

  const handleView = async (id: number, link: string, isRead: boolean) => {
    if (!isRead) {
      await markRead.mutateAsync(id);
    }
    window.location.href = link;
  };

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
      case "reminder":
        return <AlertTriangle className="h-5 w-5 text-rose-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getPriorityBorderClass = (priority: string) => {
    switch (priority) {
      case "top":
        return "border-l-red-500 border-l-[3px]";
      case "urgent":
      case "high":
        return "border-l-orange-500 border-l-[3px]";
      case "medium":
      case "normal":
        return "border-l-blue-500 border-l-[3px]";
      case "low":
        return "border-l-muted-foreground/30 border-l-[3px]";
      default:
        return "border-l-transparent";
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20 uppercase tracking-wider">
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

  // Helper selectors
  const countAll = items?.length ?? 0;
  const countUnread = items?.filter((n) => !n.is_read).length ?? 0;
  const countTasks = items?.filter((n) => n.notification_type === "task" || n.notification_type === "task_assigned").length ?? 0;
  const countMeetings = items?.filter((n) => n.notification_type === "meeting").length ?? 0;
  const countAnnouncements = items?.filter((n) => n.notification_type === "announcement").length ?? 0;

  const tabs = [
    { id: "all", label: "All", count: countAll },
    { id: "unread", label: "Unread", count: countUnread },
    { id: "task", label: "Tasks", count: countTasks },
    { id: "meeting", label: "Meetings", count: countMeetings },
    { id: "announcement", label: "Announcements", count: countAnnouncements },
  ] as const;

  const filteredItems = items ? items.filter((n) => {
    if (activeTab === "unread") return !n.is_read;
    if (activeTab === "task") return n.notification_type === "task" || n.notification_type === "task_assigned";
    if (activeTab === "meeting") return n.notification_type === "meeting";
    if (activeTab === "announcement") return n.notification_type === "announcement";
    return true;
  }) : [];

  return (
    <>
      <TopBar title="Notifications" />
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b pb-4 border-border/60 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Alert Hub</h2>
            <p className="text-sm text-muted">Keep track of your projects, tasks, and team updates.</p>
          </div>
          {isLead && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowBroadcastModal(true)}
              className="text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-sm shrink-0"
            >
              <AlertCircle className="h-4 w-4" /> Broadcast Alert
            </Button>
          )}
        </div>

        {/* Overview Banner Card */}
        {countUnread > 0 ? (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <Bell className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">You have {countUnread} unread notifications</h4>
                <p className="text-xs text-muted-foreground">Catch up on direct assignments, reminders, and updates.</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold shrink-0 bg-background border-primary/30 hover:bg-primary/5 hover:text-primary transition-all duration-300"
              onClick={() => readAll.mutate()}
              disabled={readAll.isPending}
            >
              <Check className="h-4 w-4 mr-1.5" /> Mark all read
            </Button>
          </div>
        ) : (
          <div className="bg-muted/10 border border-border/30 rounded-xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground">All caught up!</h4>
              <p className="text-xs text-muted-foreground">You have reviewed all your projects, tasks, and system alerts.</p>
            </div>
          </div>
        )}

        {/* Tabs Filter Bar */}
        <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-1.5",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm scale-102"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  "px-1.5 py-0.2 text-[10px] rounded-full font-bold",
                  activeTab === tab.id 
                    ? "bg-primary-foreground text-primary" 
                    : "bg-muted-foreground/20 text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Main List */}
          <div className="md:col-span-2 space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4 animate-pulse bg-muted/40 h-24 rounded-xl" />
                ))}
              </div>
            ) : !filteredItems.length ? (
              <Card className="flex flex-col items-center justify-center p-12 text-center border-border/40 rounded-xl">
                <Bell className="h-10 w-10 text-muted mb-3" />
                <h3 className="font-semibold text-base">No notifications found</h3>
                <p className="text-xs text-muted mt-1 max-w-xs">
                  {activeTab === "all" 
                    ? "Your inbox is empty." 
                    : `No notifications match the "${activeTab}" filter.`}
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((n) => (
                  <Card
                    key={n.id}
                    className={cn(
                      "p-4 border transition-all duration-300 hover:shadow-md hover:translate-x-0.5 relative overflow-hidden flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between rounded-xl",
                      !n.is_read ? "bg-gradient-to-r from-primary/5 via-primary/[0.01] to-background border-primary/20 shadow-xs" : "border-border/60 bg-card/45",
                      getPriorityBorderClass(n.priority)
                    )}
                  >
                    {/* Animated Unread Blue Dot */}
                    {!n.is_read && (
                      <span className="absolute top-3 right-3 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                    )}

                    <div className="flex items-start gap-4 flex-1">
                      {/* Icon Container with Micro-Rotation */}
                      <div className={cn(
                        "p-2.5 rounded-xl border transition-all duration-300 shrink-0",
                        !n.is_read 
                          ? "bg-background border-primary/25 shadow-xs rotate-[-3deg]" 
                          : "bg-muted/30 border-transparent hover:rotate-[3deg]"
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
                    <div className="flex items-center gap-2 ml-14 sm:ml-0 shrink-0">
                      {n.link && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="text-xs h-7 px-3 gap-1 hover:bg-primary/10 hover:text-primary transition-all"
                          onClick={() => handleView(n.id, n.link, n.is_read)}
                          disabled={markRead.isPending}
                        >
                          View <ArrowRight className="h-3 w-3" />
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
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Mark read
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sidebars */}
          <div className="md:col-span-1 space-y-4">
            {/* Priority Legend Card */}
            <Card className="p-4 border border-border/60 bg-card rounded-xl">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                <Info className="h-4 w-4 text-primary" />
                Priority Legend
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Notifications are tiered to help you focus on what matters most.
              </p>
              <div className="space-y-3.5">
                
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                  <div>
                    <span className="block text-xs font-bold text-red-500">TOP PRIORITY</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5 leading-relaxed">Critical system alerts and direct assignments from Leadership/Faculty.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0 h-2.5 w-2.5 rounded-full bg-orange-500" />
                  <div>
                    <span className="block text-xs font-bold text-orange-500">URGENT / HIGH</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5 leading-relaxed">Upcoming meetings starting soon or urgent task re-assignments.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0 h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <div>
                    <span className="block text-xs font-bold text-blue-500">NORMAL</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5 leading-relaxed">Standard tasks, friend requests, announcements, and meetings.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0 h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
                  <div>
                    <span className="block text-xs font-bold text-muted-foreground">LOW</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5 leading-relaxed">General system notifications and optional activities.</span>
                  </div>
                </div>

              </div>
            </Card>

            {/* Notification Types Legend Card */}
            <Card className="p-4 border border-border/60 bg-card rounded-xl">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Notification Types</h3>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <ListTodo className="h-4.5 w-4.5 text-blue-500 shrink-0" /> Tasks & Assignments
                </div>
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <Calendar className="h-4.5 w-4.5 text-emerald-500 shrink-0" /> Meetings & Events
                </div>
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <MessageSquare className="h-4.5 w-4.5 text-purple-500 shrink-0" /> Messages & Social
                </div>
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <AlertCircle className="h-4.5 w-4.5 text-amber-500 shrink-0" /> Announcements
                </div>
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0" /> Reminders & System
                </div>
              </div>
            </Card>
          </div>

        </div>
      </div>

      {/* Broadcast Notification Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5 text-primary" /> Broadcast Notification
              </h3>
              <button 
                onClick={() => setShowBroadcastModal(false)}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleBroadcastSubmit} className="p-4 space-y-3.5 text-left">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Title</label>
                <input
                  type="text"
                  placeholder="Enter notification title"
                  className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Message</label>
                <textarea
                  placeholder="Enter notification message"
                  className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none min-h-[70px]"
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Target Type</label>
                  <select
                    className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    value={broadcastForm.target_type}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, target_type: e.target.value as any, target_id: "" })}
                  >
                    <option value="all">All Members</option>
                    <option value="department">By Department</option>
                    <option value="team">By Team</option>
                    <option value="user">Specific Member</option>
                  </select>
                </div>

                {broadcastForm.target_type !== "all" && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Select {broadcastForm.target_type === "user" ? "Member" : broadcastForm.target_type.charAt(0).toUpperCase() + broadcastForm.target_type.slice(1)}
                    </label>
                    <select
                      className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                      value={broadcastForm.target_id}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, target_id: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Option --</option>
                      {broadcastForm.target_type === "department" && departments?.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                      {broadcastForm.target_type === "team" && teams?.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                      {broadcastForm.target_type === "user" && members?.map((m) => (
                        <option key={m.id} value={m.id}>{m.full_name || m.username}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Priority</label>
                  <select
                    className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    value={broadcastForm.priority}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="top">Top Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Notification Type</label>
                  <select
                    className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    value={broadcastForm.notification_type}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, notification_type: e.target.value })}
                  >
                    <option value="system">System Notification</option>
                    <option value="announcement">Announcement</option>
                    <option value="reminder">Reminder</option>
                    <option value="task">Task Alert</option>
                    <option value="meeting">Meeting Alert</option>
                    <option value="message">Message Alert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Action Link (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. /tasks or /meetings"
                  className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  value={broadcastForm.link}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, link: e.target.value })}
                />
              </div>

              {broadcastError && <p className="text-xs text-red-500 font-semibold">{broadcastError}</p>}
              {broadcastSuccess && <p className="text-xs text-emerald-500 font-semibold">{broadcastSuccess}</p>}

              {/* Actions */}
              <div className="pt-2.5 flex items-center justify-end gap-2 border-t border-border">
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowBroadcastModal(false)}
                  className="text-xs h-8 px-3"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  variant="default" 
                  size="sm" 
                  disabled={broadcastMutation.isPending}
                  className="text-xs h-8 px-4 font-semibold"
                >
                  {broadcastMutation.isPending ? "Sending..." : "Send Broadcast"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
