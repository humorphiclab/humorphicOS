"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { meetingsApi, membersApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { ExternalLink, Calendar as CalendarIcon, Video, Plus, UserPlus, Search, Info } from "lucide-react";

export default function MeetingsPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "schedule">("upcoming");
  const [form, setForm] = useState({
    title: "",
    agenda: "",
    description: "",
    meet_link: "",
    platform: "google_meet",
    start_time: "",
    end_time: "",
    participants: [] as number[],
  });
  
  const [searchMember, setSearchMember] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const queryClient = useQueryClient();

  // Queries
  const { data: meetings, isLoading: meetingsLoading } = useQuery({
    queryKey: ["meetings-upcoming"],
    queryFn: meetingsApi.upcoming,
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["members"],
    queryFn: membersApi.list,
  });

  // Scheduling Mutation
  const scheduleMutation = useMutation({
    mutationFn: (data: typeof form) => {
      if (!data.title.trim()) throw new Error("Title is required");
      if (!data.start_time) throw new Error("Start time is required");
      if (!data.end_time) throw new Error("End time is required");
      if (new Date(data.start_time) >= new Date(data.end_time)) {
        throw new Error("End time must be after start time");
      }

      return meetingsApi.create({
        title: data.title,
        agenda: data.agenda,
        description: data.description,
        meet_link: data.meet_link,
        start_time: new Date(data.start_time).toISOString(),
        end_time: new Date(data.end_time).toISOString(),
        participants: data.participants,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings-upcoming"] });
      setSuccessMsg("Meeting scheduled successfully!");
      setErrorMsg("");
      setForm({
        title: "",
        agenda: "",
        description: "",
        meet_link: "",
        platform: "google_meet",
        start_time: "",
        end_time: "",
        participants: [],
      });
      setTimeout(() => {
        setActiveTab("upcoming");
        setSuccessMsg("");
      }, 1500);
    },
    onError: (err) => {
      setErrorMsg(err instanceof Error ? err.message : "Failed to schedule meeting");
    },
  });

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

  return (
    <>
      <TopBar title="Meetings" />
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-border items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`pb-3 text-sm font-medium border-b-2 transition-all px-1 ${
                activeTab === "upcoming"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Upcoming Meetings
            </button>
            <button
              onClick={() => setActiveTab("schedule")}
              className={`pb-3 text-sm font-medium border-b-2 transition-all px-1 ${
                activeTab === "schedule"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Schedule Meeting
            </button>
          </div>
          
          {activeTab === "upcoming" && (
            <Button size="sm" className="gap-1.5" onClick={() => setActiveTab("schedule")}>
              <Plus className="h-4 w-4" /> Schedule
            </Button>
          )}
        </div>

        {/* Tab Contents */}
        {activeTab === "upcoming" ? (
          <div className="space-y-4">
            {meetingsLoading ? (
              <p className="text-muted text-sm">Loading meetings...</p>
            ) : !meetings?.length ? (
              <Card className="flex flex-col items-center justify-center p-12 text-center">
                <CalendarIcon className="h-10 w-10 text-muted mb-3" />
                <h3 className="font-semibold text-lg">No Upcoming Meetings</h3>
                <p className="text-sm text-muted mt-1 max-w-md">
                  Everything is quiet. Use the "Schedule Meeting" tab to organize a new sync session.
                </p>
                <Button size="sm" className="mt-4" onClick={() => setActiveTab("schedule")}>
                  Schedule Meeting
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {meetings.map((meeting) => (
                  <Card key={meeting.id} className="p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    
                    <div className="flex flex-col justify-between h-full gap-4">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
                            {meeting.title}
                          </h3>
                          {meeting.meet_link && (
                            <a
                              href={meeting.meet_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80 transition-colors p-1"
                              title="Join Meeting"
                            >
                              <Video className="h-5 w-5" />
                            </a>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted mt-1">
                          {formatDate(meeting.start_time)}
                        </p>
                        
                        {meeting.agenda && (
                          <div className="mt-3 bg-muted/40 p-2.5 rounded text-xs text-foreground/80 line-clamp-2">
                            <span className="font-medium text-foreground block mb-0.5">Agenda:</span>
                            {meeting.agenda}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-xs border-t pt-3 border-border">
                        <span className="text-muted">
                          Organized by: <strong className="text-foreground">{meeting.organizer_detail?.first_name || "Lead"}</strong>
                        </span>
                        
                        {meeting.meet_link && (
                          <a
                            href={meeting.meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary font-semibold hover:underline"
                          >
                            Join Call <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Schedule Form Tab */
          <form onSubmit={handleScheduleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Meeting Details
                </h3>

                <div className="space-y-1">
                  <Label htmlFor="title">Meeting Title</Label>
                  <Input
                    id="title"
                    placeholder="E.g., Weekly Robo-Arm Sync"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="datetime-local"
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="datetime-local"
                      value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="agenda">Agenda</Label>
                  <Input
                    id="agenda"
                    placeholder="Briefly state key topics to cover"
                    value={form.agenda}
                    onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="description">Detailed Description</Label>
                  <textarea
                    id="description"
                    rows={3}
                    placeholder="Provide additional details or attachments info"
                    className="w-full text-sm bg-background border border-input rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="platform">Platform</Label>
                    <select
                      id="platform"
                      className="w-full text-sm h-9 bg-background border border-input rounded-md px-3 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={form.platform}
                      onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    >
                      <option value="google_meet">Google Meet</option>
                      <option value="zoom">Zoom</option>
                      <option value="other">Other / In-Person</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="meet_link">Meeting Link / Location</Label>
                    <Input
                      id="meet_link"
                      placeholder="https://meet.google.com/..."
                      value={form.meet_link}
                      onChange={(e) => setForm({ ...form, meet_link: e.target.value })}
                    />
                  </div>
                </div>
              </Card>

              {errorMsg && <p className="text-sm text-red-500 font-medium">{errorMsg}</p>}
              {successMsg && <p className="text-sm text-green-600 font-medium">{successMsg}</p>}

              <div className="flex gap-3 justify-end">
                <Button variant="outline" type="button" onClick={() => setActiveTab("upcoming")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={scheduleMutation.isPending}>
                  {scheduleMutation.isPending ? "Scheduling..." : "Schedule Meeting"}
                </Button>
              </div>
            </div>

            {/* Participants Selector Column */}
            <div className="space-y-4">
              <Card className="p-4 flex flex-col h-[460px]">
                <h3 className="font-semibold text-base mb-2 flex items-center gap-1.5">
                  <UserPlus className="h-4.5 w-4.5 text-primary" />
                  Add Participants
                </h3>
                
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchMember}
                    onChange={(e) => setSearchMember(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>

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
                          className={`flex items-center gap-3 p-2 rounded-md cursor-pointer border transition-colors ${
                            isSelected
                              ? "bg-primary/5 border-primary"
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
                            <p className="text-[10px] text-muted leading-tight mt-0.5">
                              {member.role?.name || "Member"}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="border-t pt-3 mt-3 border-border text-[10px] text-muted flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                  <span>
                    Selected: <strong>{form.participants.length}</strong> member(s). Reminders will schedule 15m and 5m before starting.
                  </span>
                </div>
              </Card>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
