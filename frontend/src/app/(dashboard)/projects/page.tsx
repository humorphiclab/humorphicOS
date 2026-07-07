"use client";

import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { projectsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const healthColors: Record<string, string> = {
  on_track: "text-success",
  at_risk: "text-warning",
  off_track: "text-danger",
};

const LinkedTasks = ({ tasks }: { tasks?: any[] }) => {
  if (!tasks || tasks.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {tasks.map((t) => (
        <span key={t.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-card-border bg-black/20 text-[10px] text-white/80">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              t.status === "done" ? "bg-success" : t.status === "in_progress" ? "bg-primary" : "bg-muted"
            )}
          />
          {t.title}
          {t.assignee_detail && <span className="text-muted ml-1 opacity-70">({t.assignee_detail.first_name})</span>}
        </span>
      ))}
    </div>
  );
};

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const currentUser = getStoredUser();
  const isSuperuser = currentUser?.is_superuser;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProjectSlug, setSelectedProjectSlug] = useState<string | null>(null);

  // Form states for project creation
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("planning");
  const [health, setHealth] = useState("on_track");
  const [owner, setOwner] = useState("");

  // Phase tree adding states
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [activePhaseAddId, setActivePhaseAddId] = useState<number | null>(null);
  const [newSubStageTitle, setNewSubStageTitle] = useState("");
  const [activeSubStageAddId, setActiveSubStageAddId] = useState<number | null>(null);
  const [newSubLevelTitle, setNewSubLevelTitle] = useState("");
  const [phaseError, setPhaseError] = useState<string | null>(null);

  // Queries
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: membersApi.list,
  });

  const { data: projectDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["project", selectedProjectSlug],
    queryFn: () => projectsApi.get(selectedProjectSlug!),
    enabled: !!selectedProjectSlug,
  });

  // Project Mutations
  const createProjectMutation = useMutation({
    mutationFn: (data: any) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsCreateModalOpen(false);
      setTitle("");
      setDescription("");
      setStatus("planning");
      setHealth("on_track");
      setOwner("");
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (slug: string) => projectsApi.delete(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (selectedProjectSlug) setSelectedProjectSlug(null);
    },
  });

  // Phase Hierarchy Mutations
  const createPhaseMutation = useMutation({
    mutationFn: (data: any) => projectPhasesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", selectedProjectSlug] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setNewPhaseTitle("");
      setPhaseError(null);
    },
    onError: (err: any) => setPhaseError(err?.message || "Failed to create phase"),
  });

  const deletePhaseMutation = useMutation({
    mutationFn: (id: number) => projectPhasesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", selectedProjectSlug] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const togglePhaseMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => projectPhasesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", selectedProjectSlug] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const createSubStageMutation = useMutation({
    mutationFn: (data: any) => subStagesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", selectedProjectSlug] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setNewSubStageTitle("");
      setActivePhaseAddId(null);
    },
  });

  const deleteSubStageMutation = useMutation({
    mutationFn: (id: number) => subStagesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", selectedProjectSlug] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const toggleSubStageMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => subStagesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", selectedProjectSlug] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const createSubLevelMutation = useMutation({
    mutationFn: (data: any) => subLevelsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", selectedProjectSlug] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setNewSubLevelTitle("");
      setActiveSubStageAddId(null);
    },
  });

  const deleteSubLevelMutation = useMutation({
    mutationFn: (id: number) => subLevelsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", selectedProjectSlug] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const toggleSubLevelMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => subLevelsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", selectedProjectSlug] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  // Handlers
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    createProjectMutation.mutate({
      title,
      slug: slugify(title),
      description,
      status,
      health,
      owner: owner ? parseInt(owner) : null,
    });
  };

  const handleAddPhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhaseTitle || !projectDetail) return;
    createPhaseMutation.mutate({
      project: projectDetail.id,
      title: newPhaseTitle,
      order: (projectDetail.phases?.length || 0) + 1,
    });
  };

  const handleAddSubStage = (e: React.FormEvent, phaseId: number) => {
    e.preventDefault();
    if (!newSubStageTitle) return;
    createSubStageMutation.mutate({
      phase: phaseId,
      title: newSubStageTitle,
      order: 1,
    });
  };

  const handleAddSubLevel = (e: React.FormEvent, subStageId: number) => {
    e.preventDefault();
    if (!newSubLevelTitle) return;
    createSubLevelMutation.mutate({
      sub_stage: subStageId,
      title: newSubLevelTitle,
      order: 1,
    });
  };

  return (
    <>
      <TopBar title="Projects" />
      <div className="p-6">
        {isLoading ? (
          <p className="text-muted">Loading projects...</p>
        ) : projects.length === 0 ? (
          <Card>
            <p className="text-muted text-center py-8">No projects yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold">{project.title}</h3>
                  <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                    {project.status.replace("_", " ")}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Progress</span>
                    <span>{project.completion_percentage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-card-border overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${project.completion_percentage}%` }}
                    />
                  </div>
                  <p className={cn("text-xs capitalize", healthColors[project.health])}>
                    {project.health.replace("_", " ")}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create Project Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 bg-card relative space-y-4">
              <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 text-muted hover:text-foreground">
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold">Create New Project</h3>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Project Title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. RoboDog V2, Drone Swarm" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Description</label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Overview of the project goals..." />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full h-10 rounded-lg border border-card-border bg-card px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="planning">Planning</option>
                      <option value="active">Active</option>
                      <option value="on_hold">On Hold</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted">Health</label>
                    <select
                      value={health}
                      onChange={(e) => setHealth(e.target.value)}
                      className="w-full h-10 rounded-lg border border-card-border bg-card px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="on_track">On Track</option>
                      <option value="at_risk">At Risk</option>
                      <option value="off_track">Off Track</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Project Leader</label>
                  <select
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="w-full h-10 rounded-lg border border-card-border bg-card px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select Project Leader</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createProjectMutation.isPending} className="text-white">
                    {createProjectMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Project Detailed View Modal */}
        {selectedProjectSlug && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <Card className="w-full max-w-4xl p-6 bg-card relative max-h-[90vh] overflow-y-auto space-y-6">
              <button
                onClick={() => setSelectedProjectSlug(null)}
                className="absolute top-4 right-4 text-muted hover:text-foreground"
              >
                <X size={20} />
              </button>

              {isDetailLoading || !projectDetail ? (
                <p className="text-muted py-8 text-center">Loading details...</p>
              ) : (
                <div className="space-y-6">
                  {/* Header details */}
                  <div className="border-b border-card-border pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-black text-white">{projectDetail.title}</h2>
                        <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full border text-xs capitalize font-medium mr-2" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                          {projectDetail.status.replace("_", " ")}
                        </span>
                        <span className={cn("px-2.5 py-0.5 rounded-full border text-xs capitalize", healthColors[projectDetail.health])}>
                          {projectDetail.health.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted">Project Leader</p>
                        <p className="text-sm font-semibold text-white">{projectDetail.owner_detail?.full_name || "None Assigned"}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted mt-4">{projectDetail.description || "No description provided."}</p>
                  </div>

                  {/* Progress & Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-4 rounded-xl border border-card-border">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-muted">Progression</span>
                        <span className="text-white">{projectDetail.completion_percentage}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${projectDetail.completion_percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-around items-center text-center">
                      <div>
                        <p className="text-lg font-bold text-white">{projectDetail.phases?.length || 0}</p>
                        <p className="text-xs text-muted">Phases</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">{projectDetail.teams_detail?.length || 0}</p>
                        <p className="text-xs text-muted">Teams</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">{projectDetail.members_detail?.length || 0}</p>
                        <p className="text-xs text-muted">Members</p>
                      </div>
                    </div>
                  </div>

                  {/* Phases Tree & Hierarchy */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-card-border pb-2">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        Project Phases & Stages
                      </h3>
                    </div>

                    {/* Add Phase Form */}
                    {isSuperuser && (
                      <div className="space-y-2">
                        <form onSubmit={handleAddPhase} className="flex gap-2 max-w-lg">
                          <Input
                            value={newPhaseTitle}
                            onChange={(e) => { setNewPhaseTitle(e.target.value); setPhaseError(null); }}
                            placeholder="Add a Phase (e.g. Phase 1: Design & CAD)"
                            className="h-9 text-xs"
                            required
                          />
                          <Button type="submit" size="sm" disabled={createPhaseMutation.isPending} className="h-9 px-3 text-white flex items-center gap-1 shrink-0">
                            <Plus size={14} /> {createPhaseMutation.isPending ? "Adding..." : "Add Phase"}
                          </Button>
                        </form>
                        {phaseError && (
                          <p className="text-xs text-danger bg-danger/10 border border-danger/20 px-3 py-1.5 rounded-lg">{phaseError}</p>
                        )}
                      </div>
                    )}

                    {/* Interactive Phases Tree */}
                    <div className="space-y-4 pt-2">
                      {projectDetail.phases?.map((phase: any) => {
                        const hasStages = (phase.sub_stages?.length || 0) > 0;
                        return (
                          <div key={phase.id} className="border border-white/5 bg-white/[0.02] rounded-xl p-4 space-y-3">
                            <div className="flex justify-between items-center bg-white/[0.02] -mx-4 -mt-4 p-3 rounded-t-xl border-b border-white/5">
                              <div className="flex items-center gap-2">
                                {/* Toggling is only active if no children */}
                                <button
                                  disabled={hasStages || !isSuperuser}
                                  onClick={() =>
                                    togglePhaseMutation.mutate({
                                      id: phase.id,
                                      data: { is_completed: !phase.is_completed },
                                    })
                                  }
                                  className={cn("text-muted hover:text-white transition-colors", hasStages && "opacity-50 cursor-not-allowed")}
                                >
                                  {phase.is_completed ? (
                                    <CheckCircle2 size={16} className="text-success" />
                                  ) : (
                                    <Circle size={16} />
                                  )}
                                </button>
                                <div>
                                    <span className="font-bold text-sm text-white">{phase.title}</span>
                                    <LinkedTasks tasks={phase.tasks} />
                                </div>
                              </div>
                                  {isSuperuser && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openTaskModal({ linked_phase: String(phase.id) })}
                                            className="text-[10px] bg-primary/20 hover:bg-primary/40 text-primary px-2 py-0.5 rounded transition-colors"
                                        >
                                            + Task
                                        </button>
                                        <button
                                        onClick={() => deletePhaseMutation.mutate(phase.id)}
                                        className="text-muted hover:text-danger p-1 rounded transition-colors"
                                        >
                                        <Trash2 size={14} />
                                        </button>
                                    </div>
                                  )}
                            </div>

                            {/* Sub Stages */}
                            <div className="pl-6 space-y-4">
                              {phase.sub_stages?.map((stage: any) => {
                                const hasSubLevels = (stage.sub_levels?.length || 0) > 0;
                                return (
                                  <div key={stage.id} className="border-l border-white/10 pl-4 space-y-2">
                                    <div className="flex justify-between items-center group/stage">
                                      <div className="flex items-center gap-2">
                                        <button
                                          disabled={hasSubLevels || !isSuperuser}
                                          onClick={() =>
                                            toggleSubStageMutation.mutate({
                                              id: stage.id,
                                              data: { is_completed: !stage.is_completed },
                                            })
                                          }
                                          className={cn("text-muted hover:text-white transition-colors", hasSubLevels && "opacity-50 cursor-not-allowed")}
                                        >
                                          {stage.is_completed ? (
                                            <CheckCircle2 size={14} className="text-success" />
                                          ) : (
                                            <Circle size={14} />
                                          )}
                                        </button>
                                        <div>
                                            <span className="text-xs font-semibold text-white/80">{stage.title}</span>
                                            <LinkedTasks tasks={stage.tasks} />
                                        </div>
                                      </div>
                                      {isSuperuser && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover/stage:opacity-100 transition-all">
                                            <button
                                                onClick={() => openTaskModal({ linked_phase: String(phase.id), linked_sub_stage: String(stage.id) })}
                                                className="text-[9px] bg-primary/20 hover:bg-primary/40 text-primary px-1.5 py-0.5 rounded transition-colors"
                                            >
                                                + Task
                                            </button>
                                            <button
                                            onClick={() => deleteSubStageMutation.mutate(stage.id)}
                                            className="text-muted hover:text-danger p-0.5 rounded"
                                            >
                                            <Trash2 size={12} />
                                            </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Sub Levels */}
                                    <div className="pl-6 space-y-1.5">
                                      {stage.sub_levels?.map((sub: any) => (
                                        <div key={sub.id} className="flex justify-between items-center group/sub text-[11px]">
                                          <div className="flex items-center gap-2">
                                            <button
                                              disabled={!isSuperuser}
                                              onClick={() =>
                                                toggleSubLevelMutation.mutate({
                                                  id: sub.id,
                                                  data: { is_completed: !sub.is_completed },
                                                })
                                              }
                                              className="text-muted hover:text-white transition-colors"
                                            >
                                              {sub.is_completed ? (
                                                <CheckCircle2 size={12} className="text-success" />
                                              ) : (
                                                <Circle size={12} />
                                              )}
                                            </button>
                                            <div>
                                                <span className="text-white/60">{sub.title}</span>
                                                <LinkedTasks tasks={sub.tasks} />
                                            </div>
                                          </div>
                                          {isSuperuser && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-all">
                                                <button
                                                    onClick={() => openTaskModal({ linked_phase: String(phase.id), linked_sub_stage: String(stage.id), linked_sub_level: String(sub.id) })}
                                                    className="text-[9px] bg-primary/20 hover:bg-primary/40 text-primary px-1.5 py-0.5 rounded transition-colors"
                                                >
                                                    + Task
                                                </button>
                                                <button
                                                onClick={() => deleteSubLevelMutation.mutate(sub.id)}
                                                className="text-muted hover:text-danger p-0.5 rounded"
                                                >
                                                <Trash2 size={10} />
                                                </button>
                                            </div>
                                          )}
                                        </div>
                                      ))}

                                      {/* Add SubLevel Trigger */}
                                      {isSuperuser && activeSubStageAddId === stage.id ? (
                                        <form
                                          onSubmit={(e) => handleAddSubLevel(e, stage.id)}
                                          className="flex gap-2 max-w-xs pt-1"
                                        >
                                          <Input
                                            value={newSubLevelTitle}
                                            onChange={(e) => setNewSubLevelTitle(e.target.value)}
                                            placeholder="Sub-level check item"
                                            className="h-7 text-[10px]"
                                            autoFocus
                                            required
                                          />
                                          <Button type="submit" size="sm" className="h-7 px-2 text-[10px]">Add</Button>
                                          <button type="button" onClick={() => setActiveSubStageAddId(null)} className="text-muted hover:text-white">
                                            <X size={12} />
                                          </button>
                                        </form>
                                      ) : isSuperuser ? (
                                        <button
                                          onClick={() => {
                                            setActiveSubStageAddId(stage.id);
                                            setNewSubLevelTitle("");
                                          }}
                                          className="text-[10px] text-primary/70 hover:text-primary flex items-center gap-0.5 pt-1"
                                        >
                                          <Plus size={10} /> Add Sub-level
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Add SubStage Trigger */}
                              {isSuperuser && activePhaseAddId === phase.id ? (
                                <form
                                  onSubmit={(e) => handleAddSubStage(e, phase.id)}
                                  className="flex gap-2 max-w-xs pt-1 pl-4"
                                >
                                  <Input
                                    value={newSubStageTitle}
                                    onChange={(e) => setNewSubStageTitle(e.target.value)}
                                    placeholder="Sub-stage title"
                                    className="h-8 text-xs"
                                    autoFocus
                                    required
                                  />
                                  <Button type="submit" size="sm" className="h-8 px-2 text-xs">Add</Button>
                                  <button type="button" onClick={() => setActivePhaseAddId(null)} className="text-muted hover:text-white">
                                    <X size={14} />
                                  </button>
                                </form>
                              ) : isSuperuser ? (
                                <button
                                  onClick={() => {
                                    setActivePhaseAddId(phase.id);
                                    setNewSubStageTitle("");
                                  }}
                                  className="text-xs text-primary/75 hover:text-primary flex items-center gap-1 pl-4"
                                >
                                  <Plus size={12} /> Add Sub-stage
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                      {(!projectDetail.phases || projectDetail.phases.length === 0) && (
                        <p className="text-xs text-muted italic pl-2">No phases defined for this project.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Task Creation Modal */}
        {isTaskModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <Card className="w-full max-w-lg p-6 bg-card relative max-h-[90vh] overflow-y-auto space-y-4">
              <button onClick={() => setIsTaskModalOpen(false)} className="absolute top-4 right-4 text-muted hover:text-foreground">
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold">Assign Task</h3>
              <p className="text-xs text-muted mb-4">This task will be automatically linked to the selected project level.</p>
              
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createTaskMutation.mutate({
                    title: taskForm.title,
                    description: taskForm.description,
                    priority: taskForm.priority,
                    status: "todo",
                    ...(assignType === "member" && taskForm.assignee ? { assignee: Number(taskForm.assignee) } : {}),
                    ...(assignType === "team" && taskForm.assigned_team ? { assigned_team: Number(taskForm.assigned_team) } : {}),
                    ...(assignType === "department" && taskForm.assigned_department ? { assigned_department: Number(taskForm.assigned_department) } : {}),
                    ...(taskForm.project ? { project: Number(taskForm.project) } : {}),
                    ...(taskForm.linked_phase ? { linked_phase: Number(taskForm.linked_phase) } : {}),
                    ...(taskForm.linked_sub_stage ? { linked_sub_stage: Number(taskForm.linked_sub_stage) } : {}),
                    ...(taskForm.linked_sub_level ? { linked_sub_level: Number(taskForm.linked_sub_level) } : {}),
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-semibold text-muted">Title</label>
                  <Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />
                </div>
                
                <div className="p-3 border rounded-lg bg-card/50">
                    <h4 className="text-xs font-medium mb-2">Assignment Target</h4>
                    <div className="flex gap-2 mb-2">
                        <Button type="button" size="sm" variant={assignType === "member" ? "primary" : "secondary"} className="h-7 text-[10px]" onClick={() => setAssignType("member")}>Member</Button>
                        <Button type="button" size="sm" variant={assignType === "team" ? "primary" : "secondary"} className="h-7 text-[10px]" onClick={() => setAssignType("team")}>Team</Button>
                        <Button type="button" size="sm" variant={assignType === "department" ? "primary" : "secondary"} className="h-7 text-[10px]" onClick={() => setAssignType("department")}>Department</Button>
                    </div>
                    
                    {assignType === "member" && (
                        <select
                            className="w-full rounded-lg border border-card-border bg-card px-3 py-1.5 text-sm"
                            value={taskForm.assignee}
                            onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                        >
                            <option value="">Unassigned</option>
                            {(members ?? []).map((m: any) => (
                            <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                            ))}
                        </select>
                    )}

                    {assignType === "team" && (
                        <select
                            className="w-full rounded-lg border border-card-border bg-card px-3 py-1.5 text-sm"
                            value={taskForm.assigned_team}
                            onChange={(e) => setTaskForm({ ...taskForm, assigned_team: e.target.value })}
                        >
                            <option value="">Select Team</option>
                            {(teams ?? []).map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    )}

                    {assignType === "department" && (
                        <select
                            className="w-full rounded-lg border border-card-border bg-card px-3 py-1.5 text-sm"
                            value={taskForm.assigned_department}
                            onChange={(e) => setTaskForm({ ...taskForm, assigned_department: e.target.value })}
                        >
                            <option value="">Select Department</option>
                            {(departments ?? []).map((d: any) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div>
                    <label className="text-xs font-semibold text-muted">Priority</label>
                    <select
                    className="w-full rounded-lg border border-card-border bg-card px-3 py-1.5 text-sm"
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    </select>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsTaskModalOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createTaskMutation.isPending} className="text-white">
                    {createTaskMutation.isPending ? "Assigning..." : "Assign Task"}
                    </Button>
                </div>
              </form>
            </Card>
           </div>
        )}

      </div>
    </>
  );
}
