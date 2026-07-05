"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { reportsApi, getStoredUser } from "@/lib/api";
import { FileText, Download, Mail, CheckCircle2, AlertCircle, FileSpreadsheet, FileDown } from "lucide-react";

const reportTypes = [
  { type: "Daily Report", key: "daily", description: "Summary of today's work across all members" },
  { type: "Weekly Report", key: "weekly", description: "Weekly task completion and update compliance" },
  { type: "Attendance Report", key: "attendance", description: "Meeting and session attendance analytics" },
  { type: "Project Report", key: "project", description: "Project health and milestone progress" },
  { type: "Performance Report", key: "performance", description: "Member performance trends and metrics" },
];

export default function ReportsPage() {
  const qc = useQueryClient();
  const user = getStoredUser();
  const isLead = user?.role?.is_leadership;

  const [notificationMsg, setNotificationMsg] = useState("");
  const [notificationErr, setNotificationErr] = useState("");

  const { data: reports } = useQuery({ queryKey: ["reports"], queryFn: reportsApi.list });
  const { data: summary } = useQuery({ queryKey: ["leadership-summary"], queryFn: reportsApi.leadershipSummary });

  // Report Generation Mutations
  const generateDaily = useMutation({
    mutationFn: reportsApi.generateDaily,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
  const generateWeekly = useMutation({
    mutationFn: reportsApi.generateWeekly,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
  const generateAttendance = useMutation({
    mutationFn: reportsApi.generateAttendance,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
  const generateProject = useMutation({
    mutationFn: reportsApi.generateProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
  const generatePerformance = useMutation({
    mutationFn: reportsApi.generatePerformance,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });

  // Reminder Email Triggers
  const triggerDailyReminderMutation = useMutation({
    mutationFn: reportsApi.triggerDailyReminder,
    onSuccess: (data) => {
      setNotificationMsg(data.detail || "Daily update reminder emails sent successfully.");
      setNotificationErr("");
    },
    onError: (err: any) => {
      setNotificationErr(err.message || "Failed to trigger daily reminder.");
      setNotificationMsg("");
    },
  });

  const triggerDeadlineReminderMutation = useMutation({
    mutationFn: reportsApi.triggerDeadlineReminder,
    onSuccess: (data) => {
      setNotificationMsg(data.detail || "Deadline reminder emails sent successfully.");
      setNotificationErr("");
    },
    onError: (err: any) => {
      setNotificationErr(err.message || "Failed to trigger deadline reminder.");
      setNotificationMsg("");
    },
  });

  const getMutationForKey = (key: string) => {
    switch (key) {
      case "daily": return generateDaily;
      case "weekly": return generateWeekly;
      case "attendance": return generateAttendance;
      case "project": return generateProject;
      case "performance": return generatePerformance;
      default: return generateDaily;
    }
  };

  const handleDownload = async (id: number, format: "pdf" | "csv") => {
    try {
      await reportsApi.downloadReport(id, format);
    } catch (err) {
      alert("Failed to download report in this format.");
    }
  };

  return (
    <>
      <TopBar title="Reports & Automation" />
      <div className="p-6 space-y-6 max-w-5xl">
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><p className="text-sm text-muted">Total Tasks</p><p className="text-2xl font-bold">{(summary.tasks as {total?: number})?.total ?? 0}</p></Card>
            <Card><p className="text-sm text-muted">Completed</p><p className="text-2xl font-bold text-success">{(summary.tasks as {completed?: number})?.completed ?? 0}</p></Card>
            <Card><p className="text-sm text-muted">Daily Updates Today</p><p className="text-2xl font-bold">{(summary.daily_updates_today as number) ?? 0}</p></Card>
          </div>
        )}

        {/* Email Automation Section for Leadership */}
        {isLead && (
          <Card className="border-primary/20 bg-primary/5">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-primary">
              <Mail className="h-5 w-5" /> Email Automation & System Alerts (Admin)
            </h3>
            <p className="text-sm text-muted mb-4">
              Send bulk email alerts and in-app reminders to club members manually using scheduled templates.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => triggerDailyReminderMutation.mutate()}
                disabled={triggerDailyReminderMutation.isPending}
                className="gap-2 border-primary/20 hover:bg-primary/10 hover:text-primary"
              >
                <Mail className="h-4 w-4" /> Trigger Daily Update Reminder
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => triggerDeadlineReminderMutation.mutate()}
                disabled={triggerDeadlineReminderMutation.isPending}
                className="gap-2 border-primary/20 hover:bg-primary/10 hover:text-primary"
              >
                <Mail className="h-4 w-4" /> Trigger Task Deadline Reminders
              </Button>
            </div>
            {notificationMsg && (
              <div className="flex items-center gap-2 text-xs text-success mt-3">
                <CheckCircle2 className="h-4 w-4" /> {notificationMsg}
              </div>
            )}
            {notificationErr && (
              <div className="flex items-center gap-2 text-xs text-danger mt-3">
                <AlertCircle className="h-4 w-4" /> {notificationErr}
              </div>
            )}
          </Card>
        )}

        {/* Report Generation Section */}
        <div>
          <h3 className="font-semibold mb-4">Organizational Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportTypes.map(({ type, key, description }) => {
              const mutation = getMutationForKey(key);
              return (
                <Card key={type}>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2"><FileText className="h-5 w-5 text-primary" /></div>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{type}</h3>
                      <p className="text-xs text-muted mt-1">{description}</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-3 gap-1.5"
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending}
                      >
                        <Download className="h-3.5 w-3.5" /> {mutation.isPending ? "Generating..." : "Generate"}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Generated Reports list */}
        {(reports ?? []).length > 0 && (
          <Card>
            <h3 className="font-semibold mb-4">Generated Reports Archive</h3>
            <ul className="space-y-3">
              {reports!.map((r) => (
                <li key={r.id} className="flex flex-col md:flex-row justify-between md:items-center gap-4 text-sm border-b border-card-border pb-3">
                  <div>
                    <span className="font-medium text-foreground">{r.title}</span>
                    <p className="text-xs text-muted mt-1 capitalize">Type: {r.report_type}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs hover:bg-primary/10 text-primary"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `report-${r.id}.json`;
                        a.click();
                      }}
                    >
                      <FileDown className="h-3.5 w-3.5" /> Export JSON
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs hover:bg-primary/10 text-primary"
                      onClick={() => handleDownload(r.id, "pdf")}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" /> Download PDF
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs hover:bg-primary/10 text-primary"
                      onClick={() => handleDownload(r.id, "csv")}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" /> Download CSV
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
