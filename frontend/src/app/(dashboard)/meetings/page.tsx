"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { meetingsApi, membersApi, departmentsApi, teamsApi, getStoredUser } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { 
  ExternalLink, 
  Calendar as CalendarIcon, 
  Video, 
  UserPlus, 
  Search, 
  Info,
  Users,
  Target,
  Sparkles,
  Shield,
  Layers,
  MapPin,
  Clock
} from "lucide-react";

export default function MeetingsPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "schedule">("upcoming");
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getStoredUser>>(null);

  const [form, setForm] = useState({
    title: "",
    agenda: "",
    description: "",
    meet_link: "",
    targetType: "all", // "all" | "department" | "team"
    department: "",
    team: "",
    start_time: "",
    end_time: "",
    participants: [] as number[],
  });
  
  const [searchMember, setSearchMember] = useState("");
  const [filterType, setFilterType] = useState<"all" | "department" | "team" | "my">("all");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false);

  const queryClient = useQueryClient();

  const handleGenerateGoogleMeetLink = async () => {
    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
    if (!GOOGLE_CLIENT_ID) {
      toast.error("Google Client ID is not configured in the application environment.");
      return;
    }

    setIsGeneratingMeet(true);
    try {
      if (!(window as any).google) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Google Identity Services library."));
          document.body.appendChild(script);
        });
      }

      const googleObj = (window as any).google;
      if (!googleObj || !googleObj.accounts || !googleObj.accounts.oauth2) {
        throw new Error("Google Identity SDK is not fully loaded. Please try again.");
      }

      const client = googleObj.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/calendar.events",
        callback: async (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            try {
              const token = tokenResponse.access_token;
              
              const startStr = form.start_time ? new Date(form.start_time).toISOString() : new Date().toISOString();
              const endStr = form.start_time 
                ? new Date(new Date(form.start_time).getTime() + 60 * 60 * 1000).toISOString()
                : new Date(Date.now() + 60 * 60 * 1000).toISOString();

              const eventBody = {
                summary: form.title || "Humorphic Club Meeting",
                description: form.agenda || form.description || "Club coordination meeting scheduled via HumorphicOS.",
                start: { dateTime: startStr },
                end: { dateTime: endStr },
                conferenceData: {
                  createRequest: {
                    requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    conferenceSolutionKey: { type: "hangoutsMeet" }
                  }
                }
              };

              const res = await fetch(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
                {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify(eventBody)
                }
              );

              if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error?.message || "Failed to create Google Calendar event");
              }

              const data = await res.json();
              if (data.hangoutLink) {
                setForm((prev) => ({ ...prev, meet_link: data.hangoutLink }));
                toast.success("Genuine Google Meet link generated successfully!");
              } else {
                toast.error("Failed to generate Google Meet link. Please check your calendar access.");
              }
            } catch (err: any) {
              toast.error(err.message || "Failed to generate Google Meet link.");
            } finally {
              setIsGeneratingMeet(false);
            }
          } else {
            setIsGeneratingMeet(false);
            toast.error("Google Calendar authorization failed or was cancelled.");
          }
        }
      });
      client.requestAccessToken();
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize Google login client.");
      setIsGeneratingMeet(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    setCurrentUser(getStoredUser());
  }, []);

  // Queries
  const { data: meetings, isLoading: meetingsLoading } = useQuery({
    queryKey: ["meetings-upcoming"],
    queryFn: meetingsApi.upcoming,
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["members"],
    queryFn: membersApi.list,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentsApi.list(),
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: () => teamsApi.list(),
  });

  // Calculate meeting scheduling permissions
  const isGlobalOrganizer = mounted && !!(
    currentUser?.is_superuser ||
    ["founder", "president", "vice_president"].includes(currentUser?.role?.slug || "")
  );

  const headedDepartments = departments?.filter((d) => d.head === currentUser?.id || d.head_detail?.id === currentUser?.id) || [];
  const ledTeams = teams?.filter((t) => t.lead === currentUser?.id || t.lead_detail?.id === currentUser?.id) || [];
  const canScheduleMeeting = isGlobalOrganizer || headedDepartments.length > 0 || ledTeams.length > 0;

  // Mutations
  const scheduleMutation = useMutation({
    mutationFn: (data: typeof form) => {
      if (!data.title.trim()) throw new Error("Title is required");
      if (!data.start_time) throw new Error("Start time is required");
      if (!data.end_time) throw new Error("End time is required");
      if (new Date(data.start_time) >= new Date(data.end_time)) {
        throw new Error("End time must be after start time");
      }

      const payload: Record<string, any> = {
        title: data.title,
        agenda: data.agenda,
        description: data.description,
        meet_link: data.meet_link,
        start_time: new Date(data.start_time).toISOString(),
        end_time: new Date(data.end_time).toISOString(),
      };

      if (data.targetType === "department") {
        if (!data.department) throw new Error("Please select a target department");
        payload.department = Number(data.department);
      } else if (data.targetType === "team") {
        if (!data.team) throw new Error("Please select a target team");
        payload.team = Number(data.team);
      } else {
        // Target is "all", can send explicit list of participants if selected
        payload.participants = data.participants;
      }

      return meetingsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings-upcoming"] });
      setSuccessMsg("Meeting scheduled and notifications broadcast successfully!");
      setErrorMsg("");
      setForm({
        title: "",
        agenda: "",
        description: "",
        meet_link: "",
        targetType: isGlobalOrganizer ? "all" : headedDepartments.length > 0 ? "department" : "team",
        department: headedDepartments[0]?.id?.toString() || "",
        team: ledTeams[0]?.id?.toString() || "",
        start_time: "",
        end_time: "",
        participants: [],
      });
      setTimeout(() => {
        setActiveTab("upcoming");
        setSuccessMsg("");
      }, 2000);
    },
    onError: (err) => {
      setErrorMsg(err instanceof Error ? err.message : "Failed to schedule meeting");
    },
  });

  // Automatically set default target types once user metadata resolves
  useEffect(() => {
    if (currentUser) {
      if (isGlobalOrganizer) {
        setForm((prev) => ({ ...prev, targetType: "all" }));
      } else if (headedDepartments.length > 0) {
        setForm((prev) => ({ ...prev, targetType: "department", department: headedDepartments[0]?.id?.toString() || "" }));
      } else if (ledTeams.length > 0) {
        setForm((prev) => ({ ...prev, targetType: "team", team: ledTeams[0]?.id?.toString() || "" }));
      }
    }
  }, [currentUser, departments, teams]);

  const handleToggleParticipant = (userId: number) => {
    setForm((prev) => {
      const alreadyAdded = prev.participants.includes(userId);
      const nextParticipants = alreadyAdded
        ? prev.participants.filter((id) => id !== userId)
        : [...prev.participants, userId];
      return { ...prev, participants: nextParticipants };
    });
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    scheduleMutation.mutate(form);
  };

  // Filter members based on search input
  const filteredMembers = members?.filter((m) => {
    const fullName = `${m.first_name || ""} ${m.last_name || ""}`.toLowerCase();
    return (
      fullName.includes(searchMember.toLowerCase()) ||
      m.email.toLowerCase().includes(searchMember.toLowerCase())
    );
  });

  // Filter upcoming meetings list based on filters
  const filteredMeetings = meetings?.filter((m) => {
    if (filterType === "my") {
      const isOrganizer = m.organizer === currentUser?.id;
      const isParticipant = m.participants_detail?.some((p) => p.id === currentUser?.id);
      return isOrganizer || isParticipant;
    }
    if (filterType === "department") {
      if (selectedDeptFilter) {
        return m.department === Number(selectedDeptFilter);
      }
      return !!m.department;
    }
    if (filterType === "team") {
      if (selectedTeamFilter) {
        return m.team === Number(selectedTeamFilter);
      }
      return !!m.team;
    }
    return true;
  });

  if (!mounted) {
    return null;
  }

  return (
    <>
      <TopBar title="Meetings" />
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-card-border items-center justify-between">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all px-1 ${
                activeTab === "upcoming"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Upcoming Syncs
            </button>
            {canScheduleMeeting && (
              <button
                onClick={() => setActiveTab("schedule")}
                className={`pb-3 text-sm font-semibold border-b-2 transition-all px-1 ${
                  activeTab === "schedule"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Schedule Sync
              </button>
            )}
          </div>
        </div>

        {/* Tab Contents */}
        {activeTab === "upcoming" ? (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-xl border border-card-border">
              <span className="text-xs font-bold text-muted uppercase tracking-wider px-2">Filter By:</span>
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterType === "all"
                    ? "bg-primary/20 text-primary border border-primary/20"
                    : "text-muted hover:text-foreground bg-background/50 border border-transparent"
                }`}
              >
                All Syncs
              </button>
              <button
                onClick={() => setFilterType("my")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterType === "my"
                    ? "bg-primary/20 text-primary border border-primary/20"
                    : "text-muted hover:text-foreground bg-background/50 border border-transparent"
                }`}
              >
                My Syncs
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterType("department")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterType === "department"
                      ? "bg-primary/20 text-primary border border-primary/20"
                      : "text-muted hover:text-foreground bg-background/50 border border-transparent"
                  }`}
                >
                  Departments
                </button>
                {filterType === "department" && departments && (
                  <select
                    value={selectedDeptFilter}
                    onChange={(e) => setSelectedDeptFilter(e.target.value)}
                    className="text-xs h-8 bg-background border border-card-border rounded px-2 text-foreground focus:outline-none"
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterType("team")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterType === "team"
                      ? "bg-primary/20 text-primary border border-primary/20"
                      : "text-muted hover:text-foreground bg-background/50 border border-transparent"
                  }`}
                >
                  Teams
                </button>
                {filterType === "team" && teams && (
                  <select
                    value={selectedTeamFilter}
                    onChange={(e) => setSelectedTeamFilter(e.target.value)}
                    className="text-xs h-8 bg-background border border-card-border rounded px-2 text-foreground focus:outline-none"
                  >
                    <option value="">All Teams</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {meetingsLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : !filteredMeetings?.length ? (
              <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed">
                <CalendarIcon className="h-12 w-12 text-muted mb-4 stroke-[1.5]" />
                <h3 className="font-bold text-lg text-foreground">No Syncs Found</h3>
                <p className="text-sm text-muted mt-1 max-w-sm">
                  There are no scheduled syncs matching your filters at this time.
                </p>
                {canScheduleMeeting && (
                  <Button size="sm" className="mt-5" onClick={() => setActiveTab("schedule")}>
                    Schedule a Meeting
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {filteredMeetings.map((meeting) => (
                  <Card key={meeting.id} className="p-6 hover:shadow-lg transition-all relative overflow-hidden group border border-card-border hover:border-primary/30 flex flex-col justify-between">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary to-purple-600" />
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-start gap-3">
                          <h3 className="font-bold text-lg leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {meeting.title}
                          </h3>
                          {meeting.meet_link && (
                            <a
                              href={meeting.meet_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80 transition-colors p-1.5 bg-primary/10 rounded-lg shrink-0"
                              title="Join Video Call"
                            >
                              <Video className="h-4.5 w-4.5" />
                            </a>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-xs text-muted mt-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span>{formatDate(meeting.start_time)}</span>
                        </div>
                      </div>

                      {/* Display targets badges */}
                      <div className="flex flex-wrap gap-1.5">
                        {meeting.department_detail && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            Dept: {meeting.department_detail.name}
                          </span>
                        )}
                        {meeting.team_detail && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            Team: {meeting.team_detail.name}
                          </span>
                        )}
                        {!meeting.department_detail && !meeting.team_detail && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                            Global Meeting
                          </span>
                        )}
                      </div>
                      
                      {meeting.agenda && (
                        <div className="bg-background/50 border border-card-border p-3 rounded-lg text-xs text-foreground/80">
                          <span className="font-bold text-foreground block mb-1">Agenda:</span>
                          <p className="line-clamp-2 leading-relaxed">{meeting.agenda}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-xs border-t pt-4 mt-4 border-card-border">
                      <span className="text-muted">
                        Organized by: <strong className="text-foreground">{meeting.organizer_detail?.first_name || "Lead"}</strong>
                      </span>
                      
                      {meeting.meet_link && (
                        <a
                          href={meeting.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary font-bold hover:underline"
                        >
                          Join Meeting <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Schedule Form Tab */
          <form onSubmit={handleScheduleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 space-y-6">
                <div className="flex items-center gap-2 pb-3 border-b border-card-border">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg text-foreground">Sync Details</h3>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-semibold">Meeting Title *</Label>
                  <Input
                    id="title"
                    placeholder="E.g., Weekly Robo-Arm Sync"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                {/* Date-Times */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="start_time" className="text-xs font-semibold">Start Time *</Label>
                    <Input
                      id="start_time"
                      type="datetime-local"
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="end_time" className="text-xs font-semibold">End Time *</Label>
                    <Input
                      id="end_time"
                      type="datetime-local"
                      value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>



                <div className="space-y-1.5">
                  <Label htmlFor="agenda" className="text-xs font-semibold">Agenda</Label>
                  <Input
                    id="agenda"
                    placeholder="Briefly state key topics to cover"
                    value={form.agenda}
                    onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-semibold">Detailed Description</Label>
                  <textarea
                    id="description"
                    rows={3}
                    placeholder="Provide additional details or attachments info"
                    className="w-full text-sm bg-background border border-card-border rounded-lg px-3 py-2 focus-visible:outline-none focus:border-primary transition-colors resize-none placeholder:text-muted/60"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="meet_link" className="text-xs font-semibold">Meeting Link / Location (Optional)</Label>
                    <button
                      type="button"
                      onClick={handleGenerateGoogleMeetLink}
                      disabled={isGeneratingMeet}
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 bg-primary/5 px-2 py-0.5 rounded border border-primary/20 hover:bg-primary/10 transition-colors disabled:opacity-50"
                    >
                      {isGeneratingMeet ? "Generating..." : "Generate Google Meet ↗"}
                    </button>
                  </div>
                  <Input
                    id="meet_link"
                    placeholder="e.g. https://meet.google.com/abc-defg-hij or Room 102"
                    value={form.meet_link}
                    onChange={(e) => setForm({ ...form, meet_link: e.target.value })}
                  />
                  <span className="text-[10px] text-muted block italic">
                    If left blank, a free and instantly joinable Jitsi Meet link will be generated automatically.
                  </span>
                </div>
              </Card>

              {errorMsg && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              
              {successMsg && (
                <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button variant="outline" type="button" onClick={() => setActiveTab("upcoming")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={scheduleMutation.isPending}>
                  {scheduleMutation.isPending ? "Scheduling..." : "Schedule Meeting"}
                </Button>
              </div>
            </div>

            {/* Target Audience & Participants Panel */}
            <div className="space-y-4">
              <Card className="p-5 flex flex-col h-[600px] space-y-4">
                <div className="border-b border-card-border pb-3">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-primary" />
                    Target & Participants
                  </h3>
                  <p className="text-[10px] text-muted mt-0.5">
                    Select target audience and manage participants.
                  </p>
                </div>

                {/* Target Audience type radio buttons */}
                <div className="flex flex-wrap gap-2">
                  {isGlobalOrganizer && (
                    <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                      form.targetType === "all"
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-background/50 border-card-border hover:bg-card-border/20 text-muted"
                    }`}>
                      <input
                        type="radio"
                        name="targetType"
                        value="all"
                        checked={form.targetType === "all"}
                        onChange={(e) => setForm({ ...form, targetType: e.target.value })}
                        className="sr-only"
                      />
                      Member
                    </label>
                  )}

                  {(isGlobalOrganizer || headedDepartments.length > 0) && (
                    <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                      form.targetType === "department"
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-background/50 border-card-border hover:bg-card-border/20 text-muted"
                    }`}>
                      <input
                        type="radio"
                        name="targetType"
                        value="department"
                        checked={form.targetType === "department"}
                        onChange={(e) => setForm({ ...form, targetType: e.target.value })}
                        className="sr-only"
                      />
                      Department
                    </label>
                  )}

                  {(isGlobalOrganizer || ledTeams.length > 0) && (
                    <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                      form.targetType === "team"
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-background/50 border-card-border hover:bg-card-border/20 text-muted"
                    }`}>
                      <input
                        type="radio"
                        name="targetType"
                        value="team"
                        checked={form.targetType === "team"}
                        onChange={(e) => setForm({ ...form, targetType: e.target.value })}
                        className="sr-only"
                      />
                      Team
                    </label>
                  )}
                </div>

                {/* Target Cards for Department/Team */}
                {form.targetType === "department" && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted">Select Department</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                      {(isGlobalOrganizer ? departments : headedDepartments)?.map((d) => {
                        const isSelected = form.department === d.id.toString();
                        return (
                          <div
                            key={d.id}
                            onClick={() => setForm({ ...form, department: d.id.toString() })}
                            className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all flex flex-col justify-between h-[68px] ${
                              isSelected
                                ? "bg-primary/15 border-primary text-primary"
                                : "bg-background/40 border-card-border hover:bg-card-border/30 hover:border-card-border/60 text-foreground"
                            }`}
                          >
                            <p className="line-clamp-1 font-bold">{d.name}</p>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-[9px] text-muted font-normal">{d.member_count || d.members?.length || 0} members</span>
                              {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {form.targetType === "team" && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted">Select Team</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                      {(isGlobalOrganizer ? teams : ledTeams)?.map((t) => {
                        const isSelected = form.team === t.id.toString();
                        return (
                          <div
                            key={t.id}
                            onClick={() => setForm({ ...form, team: t.id.toString() })}
                            className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all flex flex-col justify-between h-[68px] ${
                              isSelected
                                ? "bg-primary/15 border-primary text-primary"
                                : "bg-background/40 border-card-border hover:bg-card-border/30 hover:border-card-border/60 text-foreground"
                            }`}
                          >
                            <p className="line-clamp-1 font-bold">{t.name}</p>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-[9px] text-muted font-normal">{t.member_count || t.members?.length || 0} members</span>
                              {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Members list view */}
                <div className="flex-1 flex flex-col min-h-0">
                  {form.targetType === "all" ? (
                    // Explicit checklist of participants
                    <>
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
                          <Input
                            placeholder="Search members..."
                            value={searchMember}
                            onChange={(e) => setSearchMember(e.target.value)}
                            className="pl-8 text-xs h-8.5 bg-background border-card-border"
                          />
                        </div>
                      </div>

                      {/* Select All Option */}
                      <label className="flex items-center justify-between px-2.5 py-2 mb-2 bg-background/50 rounded-lg border border-card-border text-[10px] font-semibold cursor-pointer hover:bg-muted/20 transition-colors">
                        <span className="text-muted uppercase tracking-wider">Select All Members</span>
                        <input
                          type="checkbox"
                          checked={members && members.length > 0 ? form.participants.length === members.length : false}
                          onChange={(e) => {
                            if (e.target.checked && members) {
                              setForm({ ...form, participants: members.map((m) => m.id) });
                            } else {
                              setForm({ ...form, participants: [] });
                            }
                          }}
                          className="h-3.5 w-3.5 accent-primary rounded cursor-pointer"
                        />
                      </label>

                      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                        {membersLoading ? (
                          <p className="text-muted text-xs p-2">Loading members...</p>
                        ) : !filteredMembers?.length ? (
                          <p className="text-muted text-xs p-2">No matching members found.</p>
                        ) : (
                          filteredMembers.map((member) => {
                            const isSelected = form.participants.includes(member.id);
                            return (
                              <div
                                key={member.id}
                                onClick={() => handleToggleParticipant(member.id)}
                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-colors ${
                                  isSelected
                                    ? "bg-primary/10 border-primary/30"
                                    : "border-transparent hover:bg-muted/40"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  readOnly
                                  className="h-3.5 w-3.5 accent-primary rounded cursor-pointer"
                                />
                                <div className="text-left">
                                  <p className="text-xs font-semibold text-foreground leading-none">
                                    {member.first_name} {member.last_name}
                                  </p>
                                  <p className="text-[10px] text-muted leading-tight mt-1">
                                    {member.role?.name || "Member"}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  ) : (
                    // Read-only member list of the selected target group
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">
                        Included Members in this {form.targetType}:
                      </div>
                      
                      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                        {form.targetType === "department" && !form.department ? (
                          <p className="text-xs text-muted italic p-2 text-center">Please select a department card to see included members.</p>
                        ) : form.targetType === "team" && !form.team ? (
                          <p className="text-xs text-muted italic p-2 text-center">Please select a team card to see included members.</p>
                        ) : (
                          (() => {
                            const selectedDept = departments?.find((d) => d.id === Number(form.department));
                            const selectedTeam = teams?.find((t) => t.id === Number(form.team));
                            
                            const targetMembers = members?.filter((m) => {
                              if (form.targetType === "department") {
                                return selectedDept?.members?.includes(m.id);
                              }
                              if (form.targetType === "team") {
                                return selectedTeam?.members?.includes(m.id);
                              }
                              return false;
                            }) || [];

                            if (!targetMembers.length) {
                              return <p className="text-xs text-muted italic p-2 text-center">No members currently in this group.</p>;
                            }

                            return targetMembers.map((member) => (
                              <div
                                key={member.id}
                                className="flex items-center gap-3 p-2 rounded-lg border border-card-border bg-background/30"
                              >
                                <div className="h-2 w-2 rounded-full bg-primary" />
                                <div className="text-left">
                                  <p className="text-xs font-semibold text-foreground leading-none">
                                    {member.first_name} {member.last_name}
                                  </p>
                                  <p className="text-[10px] text-muted leading-tight mt-1">
                                    {member.role?.name || "Member"}
                                  </p>
                                </div>
                              </div>
                            ));
                          })()
                        )}
                      </div>
                      
                      <div className="mt-3 p-3 rounded-lg border border-dashed border-card-border bg-background/25 flex items-start gap-2 shrink-0">
                        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          All members of the selected {form.targetType} are auto-subscribed to this meeting and will receive notifications.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {form.targetType === "all" && (
                  <div className="border-t pt-3 border-card-border text-[10px] text-muted flex items-start gap-1 shrink-0">
                    <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      Selected: <strong>{form.participants.length}</strong> member(s). Reminders will trigger 15m and 5m before meeting.
                    </span>
                  </div>
                )}
              </Card>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
