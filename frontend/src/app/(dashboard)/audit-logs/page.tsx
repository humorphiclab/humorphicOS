"use client";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { authApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { ScrollText, Activity, Clock, User } from "lucide-react";

export default function AuditLogsPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: authApi.auditLogs,
  });

  return (
    <>
      <TopBar title="Audit Logs" />
      <div className="p-6 space-y-6">
        <div className="max-w-4xl space-y-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary" /> System Activity
            </h3>
            <p className="text-sm text-muted mt-1">
              Track administrative changes, system events, and member actions.
            </p>
          </div>

          <Card className="p-0 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-muted text-sm">
                Loading logs...
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">
                No system activity logs found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-card-border bg-muted/20 text-muted-foreground">
                      <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">User</th>
                      <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Action</th>
                      <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Resource</th>
                      <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/5 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="flex items-center gap-2 font-medium text-foreground">
                            <User className="h-4 w-4 text-muted" />
                            {log.user_name || "System"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="flex items-center gap-2 capitalize">
                            <Activity className="h-3.5 w-3.5 text-primary/70" />
                            {log.action.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-muted">
                          {log.resource}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-muted text-xs">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDate(log.created_at)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
