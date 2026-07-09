"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { departmentsApi, teamsApi, projectsApi, membersApi, getStoredUser, User } from "@/lib/api";
import { Users, Briefcase, ChevronRight, X, LogIn, LogOut, Crown, Rocket, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const healthColors: Record<string, string> = {
  on_track: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  at_risk: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  off_track: "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

export default function MySpacePage() {
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = React.useState<any | null>(null);

  React.useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  const isSuperuser = currentUser?.is_superuser;


  const [selectedDept, setSelectedDept] = useState<any | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [browseTab, setBrowseTab] = useState<"departments" | "teams">("departments");
  const [showBrowse, setShowBrowse] = useState(false);

  const { data: departments = [], isLoading: deptsLoading } = useQuery({ queryKey: ["departments"], queryFn: departmentsApi.list });
  const { data: teams = [], isLoading: teamsLoading } = useQuery({ queryKey: ["teams"], queryFn: teamsApi.list });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list });

  const isLoading = deptsLoading || teamsLoading;

  const myDepts = departments.filter((d: any) => d.members?.includes(Number(currentUser?.id)) || d.head === Number(currentUser?.id));
  const myTeams = teams.filter((t: any) => t.members?.includes(Number(currentUser?.id)) || t.lead === Number(currentUser?.id));
  const otherDepts = departments.filter((d: any) => !myDepts.find((m: any) => m.id === d.id));
  const otherTeams = teams.filter((t: any) => !myTeams.find((m: any) => m.id === t.id));
  
  const myProjects = projects.filter((p: any) => 
    p.owner === Number(currentUser?.id) || 
    p.members?.includes(Number(currentUser?.id)) ||
    myTeams.some((t: any) => t.project === p.id)
  );

  const joinDeptMutation = useMutation({
    mutationFn: (slug: string) => departmentsApi.join(slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
  const leaveDeptMutation = useMutation({
    mutationFn: (slug: string) => departmentsApi.leave(slug),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); setSelectedDept(null); },
  });
  const joinTeamMutation = useMutation({
    mutationFn: (slug: string) => teamsApi.join(slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });
  const leaveTeamMutation = useMutation({
    mutationFn: (slug: string) => teamsApi.leave(slug),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["teams"] }); setSelectedTeam(null); },
  });

  return (
    <>
      <TopBar title="My Space" />
      <div className="p-6 space-y-8 max-w-6xl">

        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-white">Welcome back, {currentUser?.first_name || "Member"} 👋</h1>
            <p className="text-muted text-sm mt-1">Your projects, teams, and departments — all in one place.</p>
          </div>
          <Button onClick={() => setShowBrowse(true)} className="flex items-center gap-2 text-white bg-primary">
            <LogIn size={16} /> Explore & Join
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 text-muted py-12 justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading your space...
          </div>
        ) : (
          <>
            {/* My Departments */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 border-b border-card-border pb-3">
                <Users size={18} className="text-primary" />
                <h2 className="text-base font-bold">My Departments</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">{myDepts.length}</span>
              </div>
              {myDepts.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <Users size={32} className="text-muted/30 mx-auto mb-3" />
                  <p className="text-sm text-muted">You haven't joined any departments.</p>
                  <button onClick={() => { setBrowseTab("departments"); setShowBrowse(true); }} className="text-xs text-primary hover:underline mt-2 block mx-auto">Browse departments →</button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {myDepts.map((dept: any) => (
                    <div
                      key={dept.id}
                      onClick={() => setSelectedDept(dept)}
                      className="group relative overflow-hidden rounded-xl border border-card-border bg-card p-5 cursor-pointer hover:border-primary/50 hover:-translate-y-0.5 transition-all duration-200"
                      style={{ borderTop: `3px solid ${dept.color || "#6366f1"}` }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-white group-hover:text-primary transition-colors">{dept.name}</h3>
                        {dept.head === Number(currentUser?.id) && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full font-semibold">
                            <Crown size={10} /> Head
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted line-clamp-2 mb-4">{dept.description || "No description."}</p>
                      <div className="flex items-center justify-between border-t border-card-border pt-3">
                        <div className="flex items-center gap-1 text-xs text-muted">
                          <Users size={12} />
                          <span>{dept.members?.length || 0} members</span>
                        </div>
                        <ChevronRight size={14} className="text-muted group-hover:text-primary transition-colors" />
                      </div>
                      {/* Avatar stack */}
                      {dept.members_detail && dept.members_detail.length > 0 && (
                        <div className="flex -space-x-1.5 mt-3">
                          {dept.members_detail.slice(0, 5).map((m: User, i: number) => (
                            <div key={m.id} title={m.full_name} className="h-6 w-6 rounded-full bg-primary/20 border-2 border-card text-[9px] text-white flex items-center justify-center font-bold" style={{ zIndex: 5 - i }}>
                              {m.full_name?.[0] || "?"}
                            </div>
                          ))}
                          {dept.members_detail.length > 5 && <div className="h-6 w-6 rounded-full bg-muted border-2 border-card text-[9px] text-white flex items-center justify-center">+{dept.members_detail.length - 5}</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* My Projects */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 border-b border-card-border pb-3">
                <Briefcase size={18} className="text-amber-400" />
                <h2 className="text-base font-bold">My Projects</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 font-semibold">{myProjects.length}</span>
              </div>
              {myProjects.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <Briefcase size={32} className="text-muted/30 mx-auto mb-3" />
                  <p className="text-sm text-muted">You are not involved in any projects.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {myProjects.map((project: any) => (
                    <div
                      key={project.id}
                      onClick={() => window.location.href = `/projects?select=${project.slug}`}
                      className="group relative overflow-hidden rounded-xl border border-card-border bg-card p-5 cursor-pointer hover:border-amber-400/50 hover:-translate-y-0.5 transition-all duration-200"
                      style={{ borderTop: "3px solid #fbbf24" }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">{project.title}</h3>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap", healthColors[project.health] || "text-muted border-muted")}>
                          {project.health?.replace("_", " ").toUpperCase() || "UNKNOWN"}
                        </span>
                      </div>
                      <p className="text-xs text-muted line-clamp-2 mb-4">{project.description || "No description."}</p>
                      
                      <div className="flex items-center justify-between border-t border-card-border pt-3">
                        <div className="flex items-center gap-1 text-xs text-muted">
                          <CheckCircle2 size={12} className="text-emerald-400" />
                          <span>{project.completion_percentage || 0}% Done</span>
                        </div>
                        <ChevronRight size={14} className="text-muted group-hover:text-amber-400 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* My Teams */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 border-b border-card-border pb-3">
                <Rocket size={18} className="text-accent" />
                <h2 className="text-base font-bold">My Teams</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-semibold">{myTeams.length}</span>
              </div>
              {myTeams.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <Rocket size={32} className="text-muted/30 mx-auto mb-3" />
                  <p className="text-sm text-muted">You haven't joined any teams.</p>
                  <button onClick={() => { setBrowseTab("teams"); setShowBrowse(true); }} className="text-xs text-primary hover:underline mt-2 block mx-auto">Browse teams →</button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {myTeams.map((team: any) => {
                    const project = projects.find((p: any) => p.id === team.project);
                    return (
                      <div
                        key={team.id}
                        onClick={() => setSelectedTeam(team)}
                        className="group relative overflow-hidden rounded-xl border border-card-border bg-card p-5 cursor-pointer hover:border-accent/50 hover:-translate-y-0.5 transition-all duration-200"
                        style={{ borderTop: "3px solid #8b5cf6" }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-white group-hover:text-accent transition-colors">{team.name}</h3>
                          {team.lead === currentUser?.id && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full font-semibold">
                              <Crown size={10} /> Lead
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted line-clamp-2 mb-3">{team.description || "No description."}</p>
                        {project && (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted bg-muted/30 border border-card-border rounded-lg px-2 py-1 mb-3">
                            <Briefcase size={10} />
                            <span className="truncate">{project.title}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between border-t border-card-border pt-3">
                          <div className="flex items-center gap-1 text-xs text-muted">
                            <Users size={12} />
                            <span>{team.members?.length || 0} members</span>
                          </div>
                          <ChevronRight size={14} className="text-muted group-hover:text-accent transition-colors" />
                        </div>
                        {team.members_detail && team.members_detail.length > 0 && (
                          <div className="flex -space-x-1.5 mt-3">
                            {team.members_detail.slice(0, 5).map((m: User, i: number) => (
                              <div key={m.id} title={m.full_name} className="h-6 w-6 rounded-full bg-accent/20 border-2 border-card text-[9px] text-white flex items-center justify-center font-bold" style={{ zIndex: 5 - i }}>
                                {m.full_name?.[0] || "?"}
                              </div>
                            ))}
                            {team.members_detail.length > 5 && <div className="h-6 w-6 rounded-full bg-muted border-2 border-card text-[9px] text-white flex items-center justify-center">+{team.members_detail.length - 5}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Department Detail Side Panel */}
      {selectedDept && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedDept(null)} />
          <div className="relative w-full max-w-md bg-[#0f0f11] border-l border-card-border h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-[#0f0f11] border-b border-card-border p-5 flex justify-between items-center z-10">
              <div>
                <h2 className="text-lg font-black text-white">{selectedDept.name}</h2>
                <p className="text-xs text-muted">Department</p>
              </div>
              <button onClick={() => setSelectedDept(null)} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-5 flex-1">
              <div className="h-1.5 w-full rounded-full" style={{ background: selectedDept.color || "#6366f1" }} />
              <p className="text-sm text-muted">{selectedDept.description || "No description provided."}</p>
              {selectedDept.head_detail && (
                <div className="bg-muted/20 border border-card-border rounded-xl p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                    {selectedDept.head_detail.full_name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{selectedDept.head_detail.full_name}</p>
                    <p className="text-[10px] text-amber-400 font-medium">Department Head</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Members ({selectedDept.members_detail?.length || 0})</p>
                <div className="space-y-2">
                  {selectedDept.members_detail?.map((m: User) => (
                    <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {m.full_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{m.full_name}</p>
                        <p className="text-[10px] text-muted">{m.role?.name || "Member"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 p-4 border-t border-card-border bg-[#0f0f11]">
              {myDepts.find((d: any) => d.id === selectedDept.id) ? (
                <Button
                  onClick={() => leaveDeptMutation.mutate(selectedDept.slug)}
                  disabled={leaveDeptMutation.isPending}
                  variant="danger"
                  className="w-full flex items-center gap-2 justify-center"
                >
                  <LogOut size={15} />
                  {leaveDeptMutation.isPending ? "Leaving..." : "Leave Department"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Team Detail Side Panel */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedTeam(null)} />
          <div className="relative w-full max-w-md bg-[#0f0f11] border-l border-card-border h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-[#0f0f11] border-b border-card-border p-5 flex justify-between items-center z-10">
              <div>
                <h2 className="text-lg font-black text-white">{selectedTeam.name}</h2>
                <p className="text-xs text-muted">{selectedTeam.project_detail?.title || "No Project"}</p>
              </div>
              <button onClick={() => setSelectedTeam(null)} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-5 flex-1">
              <div className="h-1.5 w-full rounded-full bg-violet-500" />
              <p className="text-sm text-muted">{selectedTeam.description || "No description provided."}</p>
              {selectedTeam.lead_detail && (
                <div className="bg-muted/20 border border-card-border rounded-xl p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                    {selectedTeam.lead_detail.full_name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{selectedTeam.lead_detail.full_name}</p>
                    <p className="text-[10px] text-emerald-400 font-medium">Team Lead</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Members ({selectedTeam.members_detail?.length || 0})</p>
                <div className="space-y-2">
                  {selectedTeam.members_detail?.map((m: User) => (
                    <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors">
                      <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {m.full_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{m.full_name}</p>
                        <p className="text-[10px] text-muted">{m.role?.name || "Member"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 p-4 border-t border-card-border bg-[#0f0f11]">
              {myTeams.find((t: any) => t.id === selectedTeam.id) ? (
                <Button
                  onClick={() => leaveTeamMutation.mutate(selectedTeam.slug)}
                  disabled={leaveTeamMutation.isPending}
                  variant="danger"
                  className="w-full flex items-center gap-2 justify-center"
                >
                  <LogOut size={15} />
                  {leaveTeamMutation.isPending ? "Leaving..." : "Leave Team"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Browse & Join Modal */}
      {showBrowse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-[#0f0f11] border border-card-border rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-card-border flex justify-between items-center">
              <h3 className="text-lg font-black text-white flex items-center gap-2"><LogIn size={18} className="text-primary" /> Explore & Join</h3>
              <button onClick={() => setShowBrowse(false)} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted hover:text-white"><X size={18} /></button>
            </div>
            <div className="flex border-b border-card-border">
              <button onClick={() => setBrowseTab("departments")} className={cn("px-5 py-3 text-sm font-semibold border-b-2 transition-colors", browseTab === "departments" ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground")}>
                Departments ({otherDepts.length} available)
              </button>
              <button onClick={() => setBrowseTab("teams")} className={cn("px-5 py-3 text-sm font-semibold border-b-2 transition-colors", browseTab === "teams" ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground")}>
                Teams ({otherTeams.length} available)
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {browseTab === "departments" ? (
                otherDepts.length === 0 ? (
                  <p className="text-center text-muted py-8 text-sm">You are already in all departments!</p>
                ) : otherDepts.map((dept: any) => (
                  <div key={dept.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/10 border border-card-border hover:bg-muted/20 transition-colors" style={{ borderLeft: `3px solid ${dept.color || "#6366f1"}` }}>
                    <div>
                      <p className="font-semibold text-white">{dept.name}</p>
                      <p className="text-xs text-muted mt-0.5">{dept.members?.length || 0} members · {dept.description?.slice(0, 60) || "No description"}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => joinDeptMutation.mutate(dept.slug)}
                      disabled={joinDeptMutation.isPending}
                      className="text-white shrink-0 ml-3"
                    >
                      <LogIn size={13} className="mr-1" /> Join
                    </Button>
                  </div>
                ))
              ) : (
                otherTeams.length === 0 ? (
                  <p className="text-center text-muted py-8 text-sm">You are already in all teams!</p>
                ) : otherTeams.map((team: any) => (
                  <div key={team.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/10 border border-card-border hover:bg-muted/20 transition-colors" style={{ borderLeft: "3px solid #8b5cf6" }}>
                    <div>
                      <p className="font-semibold text-white">{team.name}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {team.project_detail?.title && <span className="text-violet-400 mr-2">{team.project_detail.title}</span>}
                        {team.members?.length || 0} members
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => joinTeamMutation.mutate(team.slug)}
                      disabled={joinTeamMutation.isPending}
                      className="text-white shrink-0 ml-3"
                    >
                      <LogIn size={13} className="mr-1" /> Join
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
