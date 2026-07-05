"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { attendanceApi, apiFetch, getStoredUser } from "@/lib/api";
import { CheckCircle, QrCode } from "lucide-react";

export default function AttendancePage() {
  const qc = useQueryClient();
  const user = getStoredUser();
  const isLead = user?.role?.is_leadership;
  const [qrToken, setQrToken] = useState("");
  const [generatedQr, setGeneratedQr] = useState<{ token: string; date: string } | null>(null);

  const { data: records, isLoading } = useQuery({ queryKey: ["attendance"], queryFn: attendanceApi.records });
  const { data: analytics } = useQuery({ queryKey: ["attendance-analytics"], queryFn: attendanceApi.analytics });

  const markMutation = useMutation({
    mutationFn: attendanceApi.mark,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });

  const scanMutation = useMutation({
    mutationFn: () => apiFetch("/attendance/records/scan_qr/", { method: "POST", body: JSON.stringify({ token: qrToken }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      setQrToken("");
    },
  });

  const generateQr = useMutation({
    mutationFn: () => apiFetch<{ token: string; date: string }>("/attendance/records/generate_qr/", { method: "GET" }),
    onSuccess: (data) => setGeneratedQr(data),
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
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => markMutation.mutate()} disabled={markMutation.isPending} className="gap-2">
              <CheckCircle className="h-4 w-4" /> Manual Check-in
            </Button>
          </div>
        </Card>

        {isLead && (
          <Card>
            <h3 className="font-semibold mb-4 flex items-center gap-2"><QrCode className="h-4 w-4" /> QR Attendance (Leadership)</h3>
            <Button size="sm" onClick={() => generateQr.mutate()} disabled={generateQr.isPending}>Generate QR Token</Button>
            {generatedQr && (
              <div className="mt-3 p-3 rounded-lg bg-primary/10 text-sm font-mono break-all">
                Token: {generatedQr.token}<br />
                Date: {generatedQr.date}
              </div>
            )}
          </Card>
        )}

        <Card>
          <h3 className="font-semibold mb-4">Scan QR Token</h3>
          <div className="flex gap-2 max-w-md">
            <Input placeholder="Paste QR token" value={qrToken} onChange={(e) => setQrToken(e.target.value)} />
            <Button onClick={() => scanMutation.mutate()} disabled={!qrToken || scanMutation.isPending}>Scan</Button>
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
