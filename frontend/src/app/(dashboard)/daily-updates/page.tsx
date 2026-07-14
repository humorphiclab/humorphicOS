"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { dailyUpdatesApi, getStoredUser } from "@/lib/api";
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Flame, 
  BookOpen, 
  HelpCircle, 
  Users, 
  Activity, 
  Mail, 
  Calendar,
  Zap
} from "lucide-react";

export default function DailyUpdatesPage() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getStoredUser>>(null);

  useEffect(() => {
    setMounted(true);
    setCurrentUser(getStoredUser());
  }, []);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["daily-update-today"],
    queryFn: dailyUpdatesApi.today,
  });

  // Fetch compliance only if leadership or superuser
  const isLeadership = mounted && !!(
    currentUser?.is_superuser || currentUser?.role?.is_leadership
  );

  const { data: complianceData } = useQuery({
    queryKey: ["daily-updates-compliance"],
    queryFn: dailyUpdatesApi.compliance,
    enabled: isLeadership,
  });

  const [form, setForm] = useState({
    work_done: "",
    hours_worked: "2",
    challenges: "",
    learning: "",
    tomorrow_plan: "",
    need_help: "",
  });

  const [successMessage, setSuccessMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      dailyUpdatesApi.create({
        date: today,
        work_done: form.work_done,
        hours_worked: parseFloat(form.hours_worked),
        challenges: form.challenges,
        learning: form.learning,
        tomorrow_plan: form.tomorrow_plan,
        need_help: form.need_help,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-update-today"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["daily-updates-compliance"] });
      setSuccessMessage("Update submitted successfully!");
      setTimeout(() => setSuccessMessage(""), 4000);
    },
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (isLoading || !mounted) {
    return (
      <>
        <TopBar title="Daily Update" />
        <div className="p-6 flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-muted text-sm">Loading daily updates workspace...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Daily Updates" />
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        
        {/* Header Hero card */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent border border-card-border p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Keep the Momentum Going</h2>
            <p className="mt-2 text-sm text-muted">
              Documenting progress daily helps maintain momentum, log learnings, flag blockers early, and keeps the whole team aligned.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Submission / Status Form Block */}
          <div className="lg:col-span-2 space-y-6">
            {existing ? (
              <Card className="p-6 border-success/20 bg-success/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-success" />
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <h3 className="font-bold text-lg text-foreground">Today's Update Logged</h3>
                  </div>
                  <span className="text-xs font-semibold text-success bg-success/15 px-3 py-1 rounded-full border border-success/10">
                    Received
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                  <div className="sm:col-span-2 bg-background/50 border border-card-border rounded-xl p-4">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-primary" /> Work Completed
                    </p>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">{existing.work_done}</p>
                  </div>
                  
                  <div className="bg-background/50 border border-card-border rounded-xl p-4">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" /> Time Spent
                    </p>
                    <p className="text-lg font-bold text-foreground">{existing.hours_worked} Hours</p>
                  </div>

                  {existing.tomorrow_plan && (
                    <div className="bg-background/50 border border-card-border rounded-xl p-4">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" /> Next Steps
                      </p>
                      <p className="text-foreground leading-relaxed">{existing.tomorrow_plan}</p>
                    </div>
                  )}

                  {existing.challenges && (
                    <div className="sm:col-span-2 bg-background/50 border border-card-border rounded-xl p-4">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-yellow-500" /> Blocker & Challenges
                      </p>
                      <p className="text-foreground leading-relaxed">{existing.challenges}</p>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="p-6 space-y-6">
                <div>
                  <h3 className="font-bold text-lg text-foreground">Log Daily Progress</h3>
                  <p className="text-xs text-muted mt-1">Fields marked with * are required.</p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    mutation.mutate();
                  }}
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="work_done" className="text-xs font-semibold">Today's Work *</Label>
                    <textarea
                      id="work_done"
                      value={form.work_done}
                      onChange={(e) => update("work_done", e.target.value)}
                      placeholder="Detail the tasks you finalized, bugs resolved or research completed..."
                      required
                      rows={4}
                      className="w-full text-sm bg-background border border-card-border rounded-lg px-3 py-2 focus-visible:outline-none focus:border-primary transition-colors resize-none placeholder:text-muted/60"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="hours" className="text-xs font-semibold">Hours Invested</Label>
                      <Input
                        id="hours"
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        value={form.hours_worked}
                        onChange={(e) => update("hours_worked", e.target.value)}
                        className="bg-background border-card-border"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="tomorrow" className="text-xs font-semibold">Tomorrow's Focus Plan</Label>
                      <Input
                        id="tomorrow"
                        value={form.tomorrow_plan}
                        onChange={(e) => update("tomorrow_plan", e.target.value)}
                        placeholder="What are you targeting tomorrow?"
                        className="bg-background border-card-border"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="challenges" className="text-xs font-semibold flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-yellow-500" /> Blocker / Challenges
                    </Label>
                    <textarea
                      id="challenges"
                      value={form.challenges}
                      onChange={(e) => update("challenges", e.target.value)}
                      placeholder="Any issues, delays, or code issues stopping your progress?"
                      rows={2}
                      className="w-full text-sm bg-background border border-card-border rounded-lg px-3 py-2 focus-visible:outline-none focus:border-primary transition-colors resize-none placeholder:text-muted/60"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="learning" className="text-xs font-semibold flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-primary" /> Key Takeaway / Learning
                      </Label>
                      <Input
                        id="learning"
                        value={form.learning}
                        onChange={(e) => update("learning", e.target.value)}
                        placeholder="Any new skill, tool, or fix discovered?"
                        className="bg-background border-card-border"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="help" className="text-xs font-semibold flex items-center gap-1.5">
                        <HelpCircle className="h-3.5 w-3.5 text-primary" /> Assistance Needed
                      </Label>
                      <Input
                        id="help"
                        value={form.need_help}
                        onChange={(e) => update("need_help", e.target.value)}
                        placeholder="Do you need review or support from leads?"
                        className="bg-background border-card-border"
                      />
                    </div>
                  </div>

                  {mutation.isError && (
                    <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{mutation.error instanceof Error ? mutation.error.message : "Failed to log update."}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  <Button type="submit" className="w-full sm:w-auto" disabled={mutation.isPending}>
                    {mutation.isPending ? "Logging Update..." : "Submit Daily Update"}
                  </Button>
                </form>
              </Card>
            )}
          </div>

          {/* Right sidebar column: Compliance Dashboard (visible to leadership) or General Tips */}
          <div className="space-y-6">
            {isLeadership && complianceData && (
              <Card className="p-5 space-y-6 border-primary/20 bg-gradient-to-b from-card to-primary/5">
                <div className="flex items-center justify-between border-b border-card-border pb-3">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-primary" />
                    Compliance Dashboard
                  </h3>
                  <span className="text-[10px] text-muted">Today</span>
                </div>

                {/* Compliance rate visualization */}
                <div className="flex flex-col items-center py-2">
                  <div className="relative flex items-center justify-center">
                    <svg className="w-28 h-28 transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        className="stroke-card-border fill-none"
                        strokeWidth="8"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        className="stroke-primary fill-none transition-all duration-500"
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 48}
                        strokeDashoffset={
                          2 * Math.PI * 48 * (1 - complianceData.compliance_rate / 100)
                        }
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-2xl font-black text-foreground">{complianceData.compliance_rate}%</span>
                      <span className="text-[9px] text-muted block uppercase tracking-wider font-semibold">Submitted</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 w-full mt-5 text-center">
                    <div className="bg-background/40 p-2 rounded-lg border border-card-border">
                      <span className="text-xs text-muted block">Logged</span>
                      <span className="text-base font-bold text-foreground">{complianceData.submitted}</span>
                    </div>
                    <div className="bg-background/40 p-2 rounded-lg border border-card-border">
                      <span className="text-xs text-muted block">Pending</span>
                      <span className="text-base font-bold text-foreground">
                        {complianceData.total_members - complianceData.submitted}
                      </span>
                    </div>
                  </div>
                </div>

                {/* List of members missing today's update */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted flex items-center justify-between">
                    <span>Missing Logs ({complianceData.missing?.length || 0})</span>
                  </p>
                  
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {!complianceData.missing?.length ? (
                      <p className="text-xs text-success bg-success/5 p-3 rounded-lg border border-success/15 text-center">
                        All members have submitted! 🎉
                      </p>
                    ) : (
                      complianceData.missing.map((member: any) => (
                        <div 
                          key={member.id} 
                          className="flex items-center justify-between p-2 rounded bg-background/50 border border-card-border text-xs group"
                        >
                          <div className="truncate">
                            <p className="font-semibold text-foreground truncate">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-[10px] text-muted truncate">{member.email}</p>
                          </div>
                          <a 
                            href={`mailto:${member.email}?subject=Reminder: Daily Update Submission Required&body=Hi ${member.first_name},%0D%0A%0D%0APlease log your daily update on HumorphicOS today to keep the team synced.%0D%0A%0D%0AThanks!`}
                            className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"
                            title="Send email reminder"
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* General Best Practices Guidelines */}
            <Card className="p-5 space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted flex items-center gap-1.5 border-b border-card-border pb-3">
                <Flame className="h-4 w-4 text-orange-500" />
                Submission Guidelines
              </h3>
              
              <ul className="space-y-3 text-xs text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span><strong>Be Specific:</strong> Instead of "worked on code", write "integrated auth endpoints & fixed user permissions".</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span><strong>Mention Blockers:</strong> If you are blocked by another task or need input, list it clearly in the Challenges field.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span><strong>Time Limits:</strong> Daily logs must be submitted before 11:59 PM each day to count towards compliance metrics.</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
