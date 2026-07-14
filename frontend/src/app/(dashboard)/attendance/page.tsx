"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { attendanceApi, apiFetch, getStoredUser, getImageUrl, authApi, membersApi } from "@/lib/api";
import { CheckCircle, QrCode, Calendar, Clock, AlertCircle, Sparkles, Check, X, Camera, UserCheck, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AttendancePage() {
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const user = getStoredUser();
  const isLead = user?.role?.is_leadership;
  const isAuthority = user?.is_superuser || user?.role?.is_leadership || (user?.role?.priority && user.role.priority >= 70);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Month / Year for Calendar and Matrix
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-11
  const [matrixSearch, setMatrixSearch] = useState("");

  // Student selection for leadership calendar
  const [selectedStudentId, setSelectedStudentId] = useState<number>(user?.id || 0);

  // Queries
  const { data: membersList } = useQuery({
    queryKey: ["members-list"],
    queryFn: () => authApi.users(),
    enabled: !!isAuthority,
  });

  const { data: allRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ["attendance-records-all"],
    queryFn: () => attendanceApi.records({ no_pagination: true }),
  });

  const { data: analytics } = useQuery({ queryKey: ["attendance-analytics"], queryFn: attendanceApi.analytics });
  const { data: leaves } = useQuery({ queryKey: ["leaves"], queryFn: attendanceApi.leaves });
  const { data: holidays } = useQuery({ queryKey: ["holidays"], queryFn: attendanceApi.holidays });

  // Mutations
  const markMutation = useMutation({
    mutationFn: attendanceApi.mark,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance-records-all"] }),
  });

  const faceMutation = useMutation({
    mutationFn: attendanceApi.faceCheckin,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["attendance-records-all"] });
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
      qc.invalidateQueries({ queryKey: ["attendance-records-all"] });
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

  // Calendar Math
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const mm = String(currentMonth + 1).padStart(2, "0");
    const dd = String(i).padStart(2, "0");
    calendarDays.push({
      day: i,
      dateStr: `${currentYear}-${mm}-${dd}`,
    });
  }

  // Matrix Math
  const matrixDays: number[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    matrixDays.push(i);
  }

  const filteredMembers = membersList?.filter((m) =>
    `${m.first_name} ${m.last_name} ${m.username}`
      .toLowerCase()
      .includes(matrixSearch.toLowerCase())
  ) || [];

  const dailyStrengths = matrixDays.map((dayNum) => {
    const mm = String(currentMonth + 1).padStart(2, "0");
    const dd = String(dayNum).padStart(2, "0");
    const dateStr = `${currentYear}-${mm}-${dd}`;

    const totalMembersCount = membersList?.length || 1;
    const presentCount = allRecords?.filter(
      (r) => r.date === dateStr && (r.status === "present" || r.status === "late")
    ).length || 0;

    const strengthPercentage = Math.round((presentCount / totalMembersCount) * 100);

    return {
      dateStr,
      presentCount,
      totalMembersCount,
      percentage: strengthPercentage,
    };
  });

  if (!mounted) return null;

  return (
    <>
      <TopBar title="Attendance & Leaves" />
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Top Summary Widgets */}
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
            {/* Mark Attendance Card */}
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

            {/* QR Generation (Admin) */}
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

            {/* Scan QR Token Card */}
            <Card>
              <h3 className="font-semibold mb-4">Scan QR Token</h3>
              <div className="flex gap-2 max-w-md">
                <Input placeholder="Paste QR token" value={qrToken} onChange={(e) => setQrToken(e.target.value)} />
                <Button onClick={() => scanMutation.mutate()} disabled={!qrToken || scanMutation.isPending}>Scan</Button>
              </div>
            </Card>

            {/* Pending Leave Requests for Admins */}
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

            {/* Attendance Month Calendar (Replaces Recent Attendance Records list) */}
            <Card className="p-5 border-card-border bg-card">
              <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <div>
                  <h3 className="font-semibold text-base">Attendance Calendar</h3>
                  {isAuthority && membersList && (
                    <div className="mt-2 flex items-center gap-2">
                      <Label htmlFor="student-select" className="text-xs text-muted">Viewing Student:</Label>
                      <select
                        id="student-select"
                        className="rounded-lg border border-card-border bg-card px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                      >
                        {membersList.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.first_name} {m.last_name} ({m.username})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Month navigation */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrevMonth} className="h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-semibold min-w-[100px] text-center">
                    {monthNames[currentMonth]} {currentYear}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {recordsLoading ? (
                <div className="py-12 text-center text-muted text-xs animate-pulse">Loading attendance history...</div>
              ) : (
                <div className="space-y-4">
                  {/* Grid of days of the week */}
                  <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold tracking-wider uppercase text-muted">
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                  </div>

                  {/* Grid of calendar days */}
                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((dayObj, idx) => {
                      if (!dayObj) {
                        return <div key={`empty-${idx}`} className="h-14 bg-muted/5 rounded-lg border border-card-border/10 opacity-20" />;
                      }

                      const { day, dateStr } = dayObj;
                      const record = allRecords?.find((r) => r.user_detail?.id === selectedStudentId && r.date === dateStr);
                      const holiday = holidays?.find((h) => h.date === dateStr);

                      let dayClass = "bg-card border-card-border/60 text-foreground hover:bg-muted/10";
                      let statusText = "";
                      let timeText = "";

                      if (record) {
                        if (record.status === "present") {
                          dayClass = "bg-success/15 border-success/30 text-success-foreground hover:bg-success/20";
                          statusText = "Present";
                        } else if (record.status === "absent") {
                          dayClass = "bg-danger/15 border-danger/30 text-danger-foreground hover:bg-danger/20";
                          statusText = "Absent";
                        } else if (record.status === "late") {
                          dayClass = "bg-warning/15 border-warning/30 text-warning-foreground hover:bg-warning/20";
                          statusText = "Late";
                        } else if (record.status === "leave") {
                          dayClass = "bg-info/15 border-info/30 text-info-foreground hover:bg-info/20";
                          statusText = "Leave";
                        }
                        if (record.check_in) {
                          timeText = new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        }
                      } else if (holiday) {
                        dayClass = "bg-purple-500/10 border-purple-500/30 text-purple-500 hover:bg-purple-500/20";
                        statusText = "Holiday";
                      }

                      const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();

                      return (
                        <div
                          key={`day-${day}`}
                          className={cn(
                            "relative h-14 p-1.5 rounded-lg border flex flex-col justify-between transition-all duration-200 cursor-pointer",
                            dayClass,
                            isToday && "ring-1.5 ring-primary ring-offset-1 ring-offset-background"
                          )}
                          title={holiday ? `${holiday.name}: ${holiday.description || ""}` : record ? `Method: ${record.method}, Notes: ${record.notes || "None"}` : "No Record"}
                        >
                          <span className="text-xs font-bold">{day}</span>
                          {statusText && (
                            <div className="flex flex-col text-[8px] leading-tight font-semibold opacity-90 truncate w-full items-start">
                              <span className="uppercase">{statusText}</span>
                              {timeText && <span className="text-[7px] opacity-75">{timeText}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 pt-3 text-[10px] text-muted border-t border-card-border/40">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-success" /> Present
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-warning" /> Late
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-danger" /> Absent
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-info" /> Leave Approved
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-purple-500" /> Holiday
                    </div>
                  </div>
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

            {/* My Leave Requests Card */}
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
        </div>

        {/* Leadership View: All Student Matrix */}
        {isAuthority && (
          <Card className="p-5 border-card-border bg-card/40 backdrop-blur">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
              <div>
                <h3 className="font-semibold text-base">All Student Attendance Matrix</h3>
                <p className="text-xs text-muted">Daily attendance overview for {monthNames[currentMonth]} {currentYear}</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search student..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  className="h-8 w-48 text-xs py-1"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-card-border/60 rounded-xl">
              <table className="w-full border-collapse text-xs text-left min-w-[800px]">
                <thead>
                  <tr className="border-b border-card-border bg-muted/20">
                    <th className="p-3 font-semibold sticky left-0 bg-card z-10 w-48 border-r border-card-border/60">Student</th>
                    {matrixDays.map((d) => (
                      <th key={`th-${d}`} className="p-2 text-center font-semibold border-r border-card-border/40 min-w-[28px]">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/40">
                  {filteredMembers.map((member) => {
                    return (
                      <tr key={member.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-3 font-medium sticky left-0 bg-card z-10 flex items-center gap-2 border-r border-card-border/60 w-48">
                          {member.avatar ? (
                            <img
                              src={getImageUrl(member.avatar) || ""}
                              alt=""
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                              {member.first_name?.[0] ?? member.username?.[0] ?? "?"}
                            </div>
                          )}
                          <span className="truncate max-w-[130px]" title={`${member.first_name} ${member.last_name}`}>
                            {member.first_name} {member.last_name}
                          </span>
                        </td>
                        {matrixDays.map((d) => {
                          const mm = String(currentMonth + 1).padStart(2, "0");
                          const dd = String(d).padStart(2, "0");
                          const dateStr = `${currentYear}-${mm}-${dd}`;
                          const record = allRecords?.find((r) => r.user_detail?.id === member.id && r.date === dateStr);

                          let dotColor = "bg-muted-foreground/20";
                          let titleStr = "No Record";
                          if (record) {
                            if (record.status === "present") {
                              dotColor = "bg-success";
                              titleStr = "Present";
                            } else if (record.status === "absent") {
                              dotColor = "bg-danger";
                              titleStr = "Absent";
                            } else if (record.status === "late") {
                              dotColor = "bg-warning";
                              titleStr = "Late";
                            } else if (record.status === "leave") {
                              dotColor = "bg-info";
                              titleStr = "Leave";
                            }
                          }

                          return (
                            <td key={`td-${member.id}-${d}`} className="p-2 text-center border-r border-card-border/40" title={`${member.first_name}: ${titleStr}`}>
                              <div className={`h-2.5 w-2.5 rounded-full ${dotColor} mx-auto transition-transform hover:scale-125`} />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Daily Strength row at the bottom */}
                  <tr className="border-t-2 border-card-border bg-primary/5 font-semibold text-primary">
                    <td className="p-3 sticky left-0 bg-card z-10 border-r border-card-border/60 w-48">
                      Daily Strength
                    </td>
                    {dailyStrengths.map((str, idx) => {
                      let textClass = "text-muted-foreground";
                      if (str.percentage >= 80) textClass = "text-success font-bold";
                      else if (str.percentage >= 50) textClass = "text-warning font-bold";
                      else if (str.percentage > 0) textClass = "text-danger font-bold";

                      return (
                        <td key={`strength-${idx}`} className="p-2 text-center border-r border-card-border/40" title={`Strength: ${str.percentage}% (${str.presentCount}/${str.totalMembersCount})`}>
                          <div className={`text-[10px] ${textClass}`}>
                            {str.presentCount}/{str.totalMembersCount}
                          </div>
                          <div className="text-[8px] opacity-70 mt-0.5">{str.percentage}%</div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
