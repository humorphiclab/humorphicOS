"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { attendanceApi } from "@/lib/api";
import { CheckCircle, QrCode } from "lucide-react";

export default function AttendancePage() {
  const qc = useQueryClient();
  const { data: records, isLoading } = useQuery({ queryKey: ["attendance"], queryFn: attendanceApi.records });
  const { data: analytics } = useQuery({ queryKey: ["attendance-analytics"], queryFn: attendanceApi.analytics });

  const markMutation = useMutation({
    mutationFn: attendanceApi.mark,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });

  return (
    <>
      <TopBar title="Attendance" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <p className="text-sm text-muted">Total Records</p>
            <p className="text-2xl font-bold mt-1">{analytics?.total ?? 0}</p>
          </Card>
          {analytics?.by_status?.map((s) => (
            <Card key={s.status}>
              <p className="text-sm text-muted capitalize">{s.status.replace("_", " ")}</p>
              <p className="text-2xl font-bold mt-1">{s.count}</p>
            </Card>
          ))}
        </div>

        <Card>
          <h3 className="font-semibold mb-4">Mark Today&apos;s Attendance</h3>
          <div className="flex gap-3">
            <Button onClick={() => markMutation.mutate()} disabled={markMutation.isPending} className="gap-2">
              <CheckCircle className="h-4 w-4" /> Manual Check-in
            </Button>
            <Button variant="secondary" className="gap-2" disabled>
              <QrCode className="h-4 w-4" /> QR Scan (Leadership generates QR)
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Recent Records</h3>
          {isLoading ? (
            <p className="text-muted text-sm">Loading...</p>
          ) : !records?.length ? (
            <p className="text-muted text-sm">No attendance records yet.</p>
          ) : (
            <ul className="space-y-2">
              {records.slice(0, 10).map((r) => (
                <li key={r.id} className="flex justify-between text-sm border-b border-card-border pb-2">
                  <span>{r.date}</span>
                  <span className="capitalize text-primary">{r.status}</span>
                  <span className="text-muted capitalize">{r.method}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
