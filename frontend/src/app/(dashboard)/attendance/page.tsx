"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { attendanceApi, apiFetch, getStoredUser } from "@/lib/api";
import { CheckCircle, QrCode, Calendar, Clock, AlertCircle, Sparkles, Check, X, Camera, UserCheck } from "lucide-react";

export default function AttendancePage() {
  const qc = useQueryClient();
  const user = getStoredUser();
  const isLead = user?.role?.is_leadership;

  const [faceMsg, setFaceMsg] = useState("");
  const [faceErr, setFaceErr] = useState("");

  const [qrToken, setQrToken] = useState("");
  const [generatedQr, setGeneratedQr] = useState<{ token: string; date: string } | null>(null);

  // Leave Form State
  const [leaveForm, setLeaveForm] = useState({
    leave_type: "casual",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [leaveError, setLeaveError] = useState("");
  const [leaveSuccess, setLeaveSuccess] = useState("");

  const { data: records, isLoading } = useQuery({ queryKey: ["attendance"], queryFn: attendanceApi.records });
  const { data: analytics } = useQuery({ queryKey: ["attendance-analytics"], queryFn: attendanceApi.analytics });
  const { data: leaves } = useQuery({ queryKey: ["leaves"], queryFn: attendanceApi.leaves });
  const { data: holidays } = useQuery({ queryKey: ["holidays"], queryFn: attendanceApi.holidays });

  const markMutation = useMutation({
    mutationFn: attendanceApi.mark,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });

  const faceMutation = useMutation({
    mutationFn: attendanceApi.faceCheckin,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      setFaceMsg(`Face check-in verified successfully: ${data.notes || "Present"}`);
      setFaceErr("");
    },
    onError: (err: any) => {
      setFaceErr(err.message || "Face check-in verification failed.");
      setFaceMsg("");
    },
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

  const leaveMutation = useMutation({
    mutationFn: attendanceApi.requestLeave,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leaves"] });
      setLeaveForm({ leave_type: "casual", start_date: "", end_date: "", reason: "" });
      setLeaveSuccess("Leave request submitted successfully.");
      setLeaveError("");
    },
    onError: (err: any) => {
      setLeaveError(err.message || "Failed to submit leave request.");
      setLeaveSuccess("");
    },
  });

  const approveLeaveMutation = useMutation({
    mutationFn: attendanceApi.approveLeave,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leaves"] }),
  });

  const rejectLeaveMutation = useMutation({
    mutationFn: attendanceApi.rejectLeave,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leaves"] }),
  });

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason) {
      setLeaveError("Please fill in all leave request fields.");
      return;
    }
    leaveMutation.mutate(leaveForm);
  };

  const getLeaveStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-success/15 text-success">Approved</span>;
      case "rejected":
        return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-danger/15 text-danger">Rejected</span>;
      default:
        return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/15 text-warning">Pending</span>;
    }
  };

  return (
    <>
      <TopBar title="Attendance & Leaves" />
      <div className="p-6 space-y-6 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <p className="text-sm text-muted">Total Attendance Records</p>
            <p className="text-2xl font-bold mt-1">{analytics?.total ?? 0}</p>
          </Card>
          {analytics?.by_status?.map((s) => (
            <Card key={s.status}>
              <p className="text-sm text-muted capitalize">{s.status.replace("_", " ")}</p>
              <p className="text-2xl font-bold mt-1">{s.count}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h3 className="font-semibold mb-4">Mark Today&apos;s Attendance</h3>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => markMutation.mutate()} disabled={markMutation.isPending} className="gap-2">
                  <CheckCircle className="h-4 w-4" /> Manual Check-in
                </Button>

                <input
                  type="file"
                  id="face-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      faceMutation.mutate(file);
                    }
                  }}
                />
                <Button
                  onClick={() => document.getElementById("face-upload")?.click()}
                  disabled={faceMutation.isPending}
                  variant="secondary"
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" /> {faceMutation.isPending ? "Scanning Face..." : "Face Recognition Check-in"}
                </Button>
              </div>
              {faceMsg && <p className="text-xs text-success mt-3 font-semibold flex items-center gap-1.5"><UserCheck className="h-4 w-4" /> {faceMsg}</p>}
              {faceErr && <p className="text-xs text-danger mt-3 font-semibold flex items-center gap-1.5"><AlertCircle className="h-4 w-4" /> {faceErr}</p>}
            </Card>

            {isLead && (
              <Card>
                <h3 className="font-semibold mb-4 flex items-center gap-2"><QrCode className="h-4 w-4" /> QR Attendance (Leadership)</h3>
                <Button size="sm" onClick={() => generateQr.mutate()} disabled={generateQr.isPending}>Generate QR Token</Button>
                {generatedQr && (
                  <div className="mt-3 p-3 rounded-lg bg-primary/10 text-sm font-mono break-all border border-primary/20">
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

            {/* Leave Approval Panel for Leaders */}
            {isLead && leaves && leaves.filter(l => l.status === "pending").length > 0 && (
              <Card className="border-warning/30 bg-warning/5">
                <h3 className="font-semibold mb-4 text-warning flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Pending Leave Requests (Admin)
                </h3>
                <div className="space-y-3">
                  {leaves.filter(l => l.status === "pending").map((req) => (
                    <div key={req.id} className="p-4 rounded-xl border border-card-border bg-card flex justify-between items-start gap-4">
                      <div>
                        <p className="font-semibold text-sm">
                          {req.user_detail ? `${req.user_detail.first_name} ${req.user_detail.last_name}` : "Member"}
                        </p>
                        <p className="text-xs text-muted mt-0.5 capitalize">Type: {req.leave_type} Leave</p>
                        <p className="text-xs text-muted mt-0.5">Dates: {req.start_date} to {req.end_date}</p>
                        <p className="text-sm text-foreground mt-2 bg-muted/30 px-3 py-1.5 rounded-lg border border-card-border/40">
                          {req.reason}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-success/20 hover:text-success text-success p-2"
                          onClick={() => approveLeaveMutation.mutate(req.id)}
                          disabled={approveLeaveMutation.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-danger/20 hover:text-danger text-danger p-2"
                          onClick={() => rejectLeaveMutation.mutate(req.id)}
                          disabled={rejectLeaveMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Attendance History */}
            <Card>
              <h3 className="font-semibold mb-4">Recent Attendance Records</h3>
              {isLoading ? (
                <p className="text-muted text-sm">Loading...</p>
              ) : !records?.length ? (
                <p className="text-muted text-sm">No attendance records yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-card-border text-muted">
                        <th className="pb-2 font-medium">Date</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                      {records.slice(0, 10).map((r) => (
                        <tr key={r.id} className="hover:bg-muted/5">
                          <td className="py-2.5">{r.date}</td>
                          <td className="py-2.5 capitalize font-medium text-primary">{r.status}</td>
                          <td className="py-2.5 capitalize text-muted">{r.method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Leaves List */}
            <Card>
              <h3 className="font-semibold mb-4">My Leave Requests</h3>
              {!leaves?.length ? (
                <p className="text-muted text-sm">No leave requests found.</p>
              ) : (
                <div className="space-y-3">
                  {leaves.map((l) => (
                    <div key={l.id} className="flex justify-between items-start border-b border-card-border pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm capitalize">{l.leave_type} Leave</p>
                          {getLeaveStatusBadge(l.status)}
                        </div>
                        <p className="text-xs text-muted mt-1">Dates: {l.start_date} to {l.end_date}</p>
                        <p className="text-xs text-muted mt-1 italic">&quot;{l.reason}&quot;</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            {/* Request Leave Form */}
            <Card>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Request Leave
              </h3>
              <form onSubmit={handleLeaveSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="leave_type">Leave Type</Label>
                  <select
                    id="leave_type"
                    className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={leaveForm.leave_type}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                  >
                    <option value="casual">Casual Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="emergency">Emergency Leave</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Provide a reason for the leave request"
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    required
                  />
                </div>

                {leaveError && <p className="text-xs text-danger">{leaveError}</p>}
                {leaveSuccess && <p className="text-xs text-success">{leaveSuccess}</p>}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={leaveMutation.isPending}
                >
                  {leaveMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </form>
            </Card>

            {/* Holidays List */}
            <Card>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Upcoming Holidays
              </h3>
              {!holidays?.length ? (
                <p className="text-xs text-muted">No scheduled holidays.</p>
              ) : (
                <ul className="space-y-2">
                  {holidays.map((h) => (
                    <li key={h.id} className="text-xs flex justify-between border-b border-card-border/50 pb-2">
                      <div>
                        <p className="font-medium text-foreground">{h.name}</p>
                        {h.description && <p className="text-muted mt-0.5">{h.description}</p>}
                      </div>
                      <span className="text-primary font-mono text-[11px] whitespace-nowrap">{h.date}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
