"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { departmentsApi, teamsApi, projectsApi, membersApi, getStoredUser, User, Department, Team } from "@/lib/api";
import { OrgChartNode } from "@/components/directory/OrgChartNode";
import { LayoutGrid, Network, Plus, Trash2, X, Users, Check, Crown, Search, UserPlus, UserMinus } from "lucide-react";
import { slugify, cn } from "@/lib/utils";

export default function DirectoryPage() {
  const queryClient = useQueryClient();
  const currentUser = getStoredUser();
  const isSuperuser = currentUser?.is_superuser;

  const [viewMode, setViewMode] = useState<"cards" | "orgchart">("cards");
  const [activeTab, setActiveTab] = useState<"departments" | "projects">("departments");

  // Member management panel
  const [memberPanel, setMemberPanel] = useState<{ type: "dept" | "team"; item: any } | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

  // Create modals
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // Form states
  const [deptName, setDeptName] = useState("");
  const [deptDesc, setDeptDesc] = useState("");
  const [deptColor, setDeptColor] = useState("#6366f1");
  const [deptHead, setDeptHead] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [teamProject, setTeamProject] = useState("");
  const [teamLead, setTeamLead] = useState("");

  // Queries
  const { data: departments = [], isLoading: isDeptsLoading } = useQuery({ queryKey: ["departments"], queryFn: departmentsApi.list });
  const { data: teams = [], isLoading: isTeamsLoading } = useQuery({ queryKey: ["teams"], queryFn: teamsApi.list });
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list });
  const { data: allMembers = [] } = useQuery({ queryKey: ["members"], queryFn: membersApi.list });

  const isLoading = isDeptsLoading || isTeamsLoading || isProjectsLoading;

  const filteredMembers = allMembers.filter((m) =>
    memberSearch === "" || m.full_name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // Mutations
  const createDeptMutation = useMutation({
    mutationFn: (data: any) => departmentsApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["departments"] }); setIsDeptModalOpen(false); setDeptName(""); setDeptDesc(""); setDeptColor("#6366f1"); setDeptHead(""); },
  });
  const updateDeptMutation = useMutation({
    mutationFn: ({ slug, data }: { slug: string; data: any }) => departmentsApi.update(slug, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["departments"] }),
  });
  const deleteDeptMutation = useMutation({
    mutationFn: (slug: string) => departmentsApi.delete(slug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["departments"] }),
  });
  const createTeamMutation = useMutation({
    mutationFn: (data: any) => teamsApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teams"] }); setIsTeamModalOpen(false); setTeamName(""); setTeamDesc(""); setTeamProject(""); setTeamLead(""); },
  });
  const updateTeamMutation = useMutation({
    mutationFn: ({ slug, data }: { slug: string; data: any }) => teamsApi.update(slug, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teams"] }),
  });
  const deleteTeamMutation = useMutation({
    mutationFn: (slug: string) => teamsApi.delete(slug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teams"] }),
  });

  const handleCreateDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName) return;
    createDeptMutation.mutate({ name: deptName, slug: slugify(deptName), description: deptDesc, color: deptColor, head: deptHead ? parseInt(deptHead) : null });
  };
  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName || !teamProject) return;
    createTeamMutation.mutate({ name: teamName, slug: slugify(teamName), description: teamDesc, project: parseInt(teamProject), lead: teamLead ? parseInt(teamLead) : null });
  };

  const toggleMemberInPanel = (memberId: number) => {
    if (!memberPanel) return;
    const { type, item } = memberPanel;
    const currentMembers: number[] = item.members || [];
    const isMember = currentMembers.includes(memberId);
    const updatedMembers = isMember ? currentMembers.filter((id) => id !== memberId) : [...currentMembers, memberId];
    if (type === "dept") {
      updateDeptMutation.mutate({ slug: item.slug, data: { members: updatedMembers } }, {
        onSuccess: (updated) => setMemberPanel({ type: "dept", item: { ...item, ...updated } }),
      });
    } else {
      updateTeamMutation.mutate({ slug: item.slug, data: { members: updatedMembers } }, {
        onSuccess: (updated) => setMemberPanel({ type: "team", item: { ...item, ...updated } }),
      });
    }
  };

  return (
    <>
      <TopBar title="Directory" />
      <div className="p-6 space-y-6">

        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-card-border">
            <button onClick={() => setViewMode("cards")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors", viewMode === "cards" ? "bg-primary text-white shadow-lg" : "text-muted hover:text-foreground hover:bg-muted/50")}>
              <LayoutGrid size={15} /> Cards
            </button>
            <button onClick={() => setViewMode("orgchart")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors", viewMode === "orgchart" ? "bg-primary text-white shadow-lg" : "text-muted hover:text-foreground hover:bg-muted/50")}>
              <Network size={15} /> Org Chart
            </button>
          </div>
          {isSuperuser && (
            <div className="flex gap-2">
              <Button onClick={() => setIsDeptModalOpen(true)} className="flex items-center gap-2 text-white text-sm"><Plus size={15} /> Department</Button>
              <Button onClick={() => setIsTeamModalOpen(true)} variant="outline" className="flex items-center gap-2 text-sm"><Plus size={15} /> Team</Button>
            </div>
          )}
        </div>

        {/* Tab bar for cards view */}
        {viewMode === "cards" && (
          <div className="flex border-b border-card-border">
            {(["departments", "projects"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={cn("pb-3 px-4 text-sm font-medium border-b-2 transition-colors capitalize", activeTab === tab ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground")}>
                {tab === "departments" ? `Departments (${departments.length})` : `Projects & Teams (${projects.length})`}
              </button>
            ))}
          </div>
        )}

        {isLoading && <p className="text-muted text-sm">Loading...</p>}

        {/* CARDS VIEW */}
        {viewMode === "cards" && !isLoading && (
          <>
            {activeTab === "departments" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {departments.map((dept) => (
                  <Card key={dept.id} className="group relative p-5 flex flex-col gap-4 hover:border-primary/40 transition-colors" style={{ borderTop: `3px solid ${dept.color || "#6366f1"}` }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white">{dept.name}</h3>
                        <p className="text-xs text-muted mt-1 line-clamp-2">{dept.description || "No description."}</p>
                      </div>
                      {isSuperuser && (
                        <button onClick={() => deleteDeptMutation.mutate(dept.slug)} className="p-1.5 text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-danger/10">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {dept.head_detail && (
                      <div className="flex items-center gap-2 text-xs">
                        <div className="h-6 w-6 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0">{dept.head_detail.full_name?.[0]}</div>
                        <span className="text-muted truncate">{dept.head_detail.full_name}</span>
                        <Crown size={11} className="text-amber-400 shrink-0" />
                      </div>
                    )}

                    {/* Member avatars */}
                    <div className="flex items-center justify-between border-t border-card-border pt-3">
                      <div className="flex -space-x-2">
                        {dept.members_detail?.slice(0, 6).map((m, i) => (
                          <div key={m.id} title={m.full_name} className="h-7 w-7 rounded-full bg-primary/20 border-2 border-card text-[10px] text-white flex items-center justify-center font-bold" style={{ zIndex: 6 - i }}>
                            {m.full_name?.[0]}
                          </div>
                        ))}
                        {(dept.members_detail?.length || 0) > 6 && (
                          <div className="h-7 w-7 rounded-full bg-muted border-2 border-card text-[10px] text-white flex items-center justify-center">+{(dept.members_detail?.length || 0) - 6}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted">{dept.members?.length || 0} members</span>
                        {isSuperuser && (
                          <button
                            onClick={() => { setMemberPanel({ type: "dept", item: dept }); setMemberSearch(""); }}
                            className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                            title="Manage Members"
                          >
                            <UserPlus size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                {departments.length === 0 && <p className="text-muted italic col-span-full text-sm">No departments found.</p>}
              </div>
            )}

            {activeTab === "projects" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {projects.map((proj) => {
                  const projectTeams = teams.filter((t) => t.project_detail?.id === proj.id);
                  return (
                    <Card key={proj.id} className="p-5 space-y-4">
                      <div>
                        <h3 className="font-bold text-white">{proj.title}</h3>
                        <span className="inline-block text-[10px] capitalize px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 mt-1">{proj.status?.replace("_", " ")}</span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Teams ({projectTeams.length})</p>
                        {projectTeams.map((team) => (
                          <div key={team.id} className="group/team relative p-3 rounded-lg bg-muted/20 border border-card-border">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-semibold text-white">{team.name}</p>
                                <p className="text-[10px] text-muted">{team.lead_detail?.full_name ? `Lead: ${team.lead_detail.full_name}` : "No lead"} · {team.members?.length || 0} members</p>
                              </div>
                              {isSuperuser && (
                                <div className="flex gap-1 opacity-0 group-hover/team:opacity-100 transition-all">
                                  <button onClick={() => { setMemberPanel({ type: "team", item: team }); setMemberSearch(""); }} className="p-1 rounded hover:bg-primary/20 text-primary transition-colors" title="Manage Members">
                                    <UserPlus size={12} />
                                  </button>
                                  <button onClick={() => deleteTeamMutation.mutate(team.slug)} className="p-1 rounded text-muted hover:text-danger hover:bg-danger/10 transition-colors" title="Delete">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                            {team.members_detail && team.members_detail.length > 0 && (
                              <div className="flex -space-x-1.5 mt-2">
                                {team.members_detail.slice(0, 5).map((m, i) => (
                                  <div key={m.id} title={m.full_name} className="h-5 w-5 rounded-full bg-accent/20 border border-card text-[8px] text-white flex items-center justify-center font-bold" style={{ zIndex: 5 - i }}>
                                    {m.full_name?.[0]}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {projectTeams.length === 0 && <p className="text-[10px] text-muted italic">No teams yet.</p>}
                      </div>
                    </Card>
                  );
                })}
                {projects.length === 0 && <p className="text-muted italic col-span-full text-sm">No projects found.</p>}
              </div>
            )}
          </>
        )}

        {/* ORG CHART VIEW */}
        {viewMode === "orgchart" && !isLoading && (
          <div className="overflow-x-auto pb-12 pt-8 flex justify-center">
            <OrgChartNode title="Robotics Club" subtitle="Organization" isRoot>
              <OrgChartNode title="Departments" color="#6b7280">
                {departments.map((dept) => (
                  <OrgChartNode key={dept.id} title={dept.name} subtitle={`${dept.members?.length || 0} Members`} color={dept.color || "#6366f1"} />
                ))}
              </OrgChartNode>
              <OrgChartNode title="Projects" color="#10b981">
                {projects.map((proj) => {
                  const projectTeams = teams.filter((t) => t.project_detail?.id === proj.id);
                  return (
                    <OrgChartNode key={proj.id} title={proj.title} subtitle={proj.status} color="#10b981">
                      {projectTeams.map((team) => (
                        <OrgChartNode key={team.id} title={team.name} subtitle={`${team.members?.length || 0} Members`} color="#6366f1" />
                      ))}
                    </OrgChartNode>
                  );
                })}
              </OrgChartNode>
            </OrgChartNode>
          </div>
        )}

        {/* Create Department Modal */}
        {isDeptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 bg-card relative space-y-4">
              <button onClick={() => setIsDeptModalOpen(false)} className="absolute top-4 right-4 text-muted hover:text-foreground"><X size={18} /></button>
              <h3 className="text-lg font-bold">Create Department</h3>
              <form onSubmit={handleCreateDept} className="space-y-4">
                <div className="space-y-1"><label className="text-xs font-semibold text-muted">Name</label><Input value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="e.g. Media, Sponsorship" required /></div>
                <div className="space-y-1"><label className="text-xs font-semibold text-muted">Description</label><Input value={deptDesc} onChange={(e) => setDeptDesc(e.target.value)} placeholder="What does this department do?" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-xs font-semibold text-muted">Accent Color</label><Input type="color" value={deptColor} onChange={(e) => setDeptColor(e.target.value)} className="h-10 cursor-pointer" /></div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted">Department Head</label>
                    <select value={deptHead} onChange={(e) => setDeptHead(e.target.value)} className="w-full h-10 rounded-lg border border-card-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="">Select...</option>
                      {allMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsDeptModalOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createDeptMutation.isPending} className="text-white">{createDeptMutation.isPending ? "Creating..." : "Create"}</Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Create Team Modal */}
        {isTeamModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 bg-card relative space-y-4">
              <button onClick={() => setIsTeamModalOpen(false)} className="absolute top-4 right-4 text-muted hover:text-foreground"><X size={18} /></button>
              <h3 className="text-lg font-bold">Create Team</h3>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div className="space-y-1"><label className="text-xs font-semibold text-muted">Name</label><Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Design, Engineering" required /></div>
                <div className="space-y-1"><label className="text-xs font-semibold text-muted">Description</label><Input value={teamDesc} onChange={(e) => setTeamDesc(e.target.value)} placeholder="What does this team focus on?" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted">Project *</label>
                    <select value={teamProject} onChange={(e) => setTeamProject(e.target.value)} required className="w-full h-10 rounded-lg border border-card-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="">Select project</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted">Team Lead</label>
                    <select value={teamLead} onChange={(e) => setTeamLead(e.target.value)} className="w-full h-10 rounded-lg border border-card-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="">Select...</option>
                      {allMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsTeamModalOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createTeamMutation.isPending} className="text-white">{createTeamMutation.isPending ? "Creating..." : "Create"}</Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>

      {/* Member Management Side Panel */}
      {memberPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMemberPanel(null)} />
          <div className="relative w-full max-w-sm bg-[#0f0f11] border-l border-card-border h-full overflow-hidden shadow-2xl flex flex-col">
            {/* Panel Header */}
            <div className="p-5 border-b border-card-border flex justify-between items-center bg-[#0f0f11]">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <UserPlus size={16} className="text-primary" />
                  Manage Members
                </h3>
                <p className="text-xs text-muted mt-0.5">{memberPanel.item.name}</p>
              </div>
              <button onClick={() => setMemberPanel(null)} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted hover:text-white transition-colors"><X size={16} /></button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-card-border">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search members..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-card-border bg-muted/20 text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <p className="text-[10px] text-muted mt-2 px-1">{memberPanel.item.members?.length || 0} members currently in this {memberPanel.type}</p>
            </div>

            {/* Member list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {filteredMembers.map((member) => {
                const isMember = memberPanel.item.members?.includes(member.id);
                return (
                  <button
                    key={member.id}
                    onClick={() => toggleMemberInPanel(member.id)}
                    disabled={updateDeptMutation.isPending || updateTeamMutation.isPending}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                      isMember ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/30 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", isMember ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground")}>
                        {member.full_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white leading-tight">{member.full_name}</p>
                        <p className="text-[10px] text-muted">{member.role?.name || "Member"}</p>
                      </div>
                    </div>
                    {isMember ? (
                      <div className="flex items-center gap-1 text-[10px] text-primary font-semibold shrink-0">
                        <UserMinus size={12} />
                        Remove
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] text-muted font-semibold shrink-0">
                        <UserPlus size={12} />
                        Add
                      </div>
                    )}
                  </button>
                );
              })}
              {filteredMembers.length === 0 && (
                <p className="text-xs text-muted text-center py-8">No members found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
