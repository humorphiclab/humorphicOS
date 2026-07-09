"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import {
  projectsApi,
  membersApi,
  getStoredUser,
  projectPhasesApi,
  subStagesApi,
  subLevelsApi,
  teamsApi,
  apiFetch,
} from "@/lib/api";
import { cn, slugify } from "@/lib/utils";
import { Plus, X, Trash2, Circle, Users, UserMinus, UserPlus, FolderGit, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollList } from "@/components/ui/scroll-list";
import { RadioButton } from "@/components/ui/radio-button";

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
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);
  const isSuperuser = currentUser?.is_superuser;
  const isLead = currentUser?.is_superuser || currentUser?.role?.is_leadership || currentUser?.role?.slug === "team_lead" || currentUser?.role?.slug === "department_head" || false;

  const [selectedProjectSlug, setSelectedProjectSlug] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState<"phases" | "teams">("phases");

  // Project Creation states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("planning");
  const [health, setHealth] = useState("on_track");
  const [owner, setOwner] = useState("");

  // Phases tree states
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [newSubStageTitle, setNewSubStageTitle] = useState("");
  const [newSubLevelTitle, setNewSubLevelTitle] = useState("");
  const [activePhaseAddId, setActivePhaseAddId] = useState<number | null>(null);
  const [activeSubStageAddId, setActiveSubStageAddId] = useState<number | null>(null);

  // Teams & Members states
  const [selectedTeamIdForMembers, setSelectedTeamIdForMembers] = useState<number | "project">("project");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [newTeamLead, setNewTeamLead] = useState("");
  const [teamMemberToAdd, setTeamMemberToAdd] = useState("");
  const [showCreateTeam, setShowCreateTeam] = useState(false);

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    assignee: "",
    assigned_team: "",
    assigned_department: "",
    project: "",
    linked_phase: "",
    linked_sub_stage: "",
    linked_sub_level: "",
  });
  const [assignType, setAssignType] = useState<"member" | "team" | "department">("member");

  // Queries
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: membersApi.list,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: () => apiFetch<any[]>("/teams/").then((res: any) => res.results || res),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiFetch<any[]>("/departments/").then((res: any) => res.results || res),
  });

  const { data: projectDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["project", selectedProjectSlug],
    queryFn: () => projectsApi.get(selectedProjectSlug!),
    enabled: !!selectedProjectSlug,
  });

  // Reset tab selection when project changes
  useEffect(() => {
    setSelectedTeamIdForMembers("project");
  }, [selectedProjectSlug]);

  // Project Mutations
  const createProjectMutation = useMutation({
    mutationFn: (data: any) => projectsApi.create(data),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsCreateModalOpen(false);
      setSelectedProjectSlug(newProject.slug);
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

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/tasks/", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", selectedProjectSlug] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsTaskModalOpen(false);
      setTaskForm({ title: "", description: "", priority: "medium", assignee: "", assigned_team: "", assigned_department: "", project: "", linked_phase: "", linked_sub_stage: "", linked_sub_level: "" });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to assign task");
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

  // Teams Mutations
  const createTeamMutation = useMutation({
    mutationFn: (data: any) => teamsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", selectedProjectSlug] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setNewTeamName("");
      setNewTeamDescription("");
      setNewTeamLead("");
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (slug: string) => teamsApi.delete(slug),
    onSuccess: (deletedSlug) => {
      queryClient.invalidateQueries({ queryKey: ["project", selectedProjectSlug] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      // Reset team detail selection if active team was deleted
      setSelectedTeamIdForMembers("project");
    },
  });

  const updateTeamMembersMutation = useMutation({
    mutationFn: ({ slug, members }: { slug: string; members: number[] }) =>
      teamsApi.update(slug, { members }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", selectedProjectSlug] });
    },
  });

  const removeProjectMemberMutation = useMutation({
    mutationFn: ({ slug, userId }: { slug: string; userId: number }) =>
      projectsApi.removeMember(slug, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", selectedProjectSlug] });
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
      owner: owner ? Number(owner) : undefined,
    });
  };

  const handleAddPhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhaseTitle || !projectDetail) return;
    createPhaseMutation.mutate({
      project: projectDetail.id,
      title: newPhaseTitle,
      order: 1,
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

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName || !projectDetail) return;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    createTeamMutation.mutate({
      name: newTeamName,
      slug: `${slugify(newTeamName)}-${randomSuffix}`,
      description: newTeamDescription,
      project: projectDetail.id,
      lead: newTeamLead ? Number(newTeamLead) : null,
      members: newTeamLead ? [Number(newTeamLead)] : [],
    });
  };

  const handleAddTeamMember = (e: React.FormEvent, teamSlug: string, currentMembers: number[]) => {
    e.preventDefault();
    if (!teamMemberToAdd) return;
    const userId = Number(teamMemberToAdd);
    if (!currentMembers.includes(userId)) {
      updateTeamMembersMutation.mutate({
        slug: teamSlug,
        members: [...currentMembers, userId],
      });
    }
    setTeamMemberToAdd("");
  };

  const openTaskModal = (linkData: any) => {
    setTaskForm({
      title: "", description: "", priority: "medium",
      assignee: "", assigned_team: "", assigned_department: "",
      project: String(projectDetail?.id || ""),
      linked_phase: linkData.linked_phase || "",
      linked_sub_stage: linkData.linked_sub_stage || "",
      linked_sub_level: linkData.linked_sub_level || "",
    });
    setIsTaskModalOpen(true);
  };

  // Helper selectors for right column of Team tab
  const getSelectedTeamMembers = () => {
    if (!projectDetail) return [];
    if (selectedTeamIdForMembers === "project") {
      // Return combined members across all teams
      const allTeamMembersMap = new Map<number, any>();
      projectDetail.teams_detail?.forEach((team: any) => {
        team.members_detail?.forEach((member: any) => {
          allTeamMembersMap.set(member.id, member);
        });
      });
      return Array.from(allTeamMembersMap.values());
    } else {
      const selectedTeam = projectDetail.teams_detail?.find(
        (t: any) => t.id === selectedTeamIdForMembers
      );
      return selectedTeam?.members_detail || [];
    }
  };

  const activeSelectedTeamObj = selectedTeamIdForMembers === "project" 
    ? null 
    : projectDetail?.teams_detail?.find((t: any) => t.id === selectedTeamIdForMembers);

  const eligibleTeamMembers = activeSelectedTeamObj
    ? members.filter((m: any) => !activeSelectedTeamObj.members?.includes(m.id))
    : [];

  return (
    <>
      <TopBar title="Projects" />
      <div className="p-6 flex flex-col lg:flex-row gap-6 items-stretch h-[calc(100vh-112px)] overflow-hidden">
        {/* Left Side: Wider Navigation (Project Cards list) */}
        <div className="space-y-6 flex flex-col w-full lg:w-5/12 xl:w-4/12 h-full overflow-hidden shrink-0">
          <div className="flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-lg font-bold text-white">Projects</h2>
              <p className="text-muted text-[10px]">Select a project card to view details</p>
            </div>
            {isSuperuser && (
              <Button 
                onClick={() => {
                  setIsCreateModalOpen(true);
                  setSelectedProjectSlug(null);
                }} 
                className="h-8 text-xs flex items-center gap-1.5 text-white shrink-0"
              >
                <Plus size={14} /> Create
              </Button>
            )}
          </div>

          <ScrollList className="flex-1 pb-4 pr-1">
            {isProjectsLoading ? (
              <p className="text-muted text-xs">Loading projects...</p>
            ) : projects.length === 0 ? (
              <Card className="p-4 text-center">
                <p className="text-muted text-xs">No projects found.</p>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    onClick={() => {
                      setSelectedProjectSlug(project.slug);
                      setIsCreateModalOpen(false);
                    }}
                    className={cn(
                      "relative group p-5 flex flex-col justify-between cursor-pointer transition-all border border-card-border hover:border-primary/50",
                      selectedProjectSlug === project.slug && "border-primary bg-primary/5 shadow-md shadow-primary/5"
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-base text-white group-hover:text-primary transition-colors line-clamp-1">{project.title}</h3>
                        {isSuperuser && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteProjectMutation.mutate(project.slug);
                            }}
                            className="p-1 rounded text-muted hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="inline-block text-[9px] capitalize px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {project.status.replace("_", " ")}
                        </span>
                        <span className={cn("text-[9px] capitalize font-medium", healthColors[project.health])}>
                          {project.health.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-card-border/50">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted">Progress</span>
                        <span className="text-white font-semibold">{project.completion_percentage}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-card-border overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${project.completion_percentage}%` }}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollList>
        </div>

        {/* Right Side: Persistent Manage Panel */}
        <div className="w-full lg:w-7/12 xl:w-8/12 h-full flex flex-col overflow-hidden">
          <Card className="flex-1 p-6 bg-card relative flex flex-col shadow-2xl border-card-border h-full overflow-hidden">
            <ScrollList className="flex-1 h-full pr-1">
              <AnimatePresence mode="wait">
                {isCreateModalOpen ? (
                  <motion.div
                    key="create-form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 text-muted hover:text-foreground">
                      <X size={18} />
                    </button>
                    <h3 className="text-lg font-bold text-white">Create New Project</h3>
                    <form onSubmit={handleCreateProject} className="space-y-4 max-w-xl">
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
                  </motion.div>
                ) : selectedProjectSlug ? (
                  <motion.div
                    key="project-details"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    <button
                      onClick={() => setSelectedProjectSlug(null)}
                      className="absolute top-4 right-4 text-muted hover:text-foreground"
                    >
                      <X size={20} />
                    </button>

                    {isDetailLoading || !projectDetail ? (
                      <p className="text-muted py-8 text-center text-xs">Loading details...</p>
                    ) : (
                      <div className="space-y-6">
                        {/* Header details */}
                        <div className="border-b border-card-border pb-4 pr-10">
                          <div className="flex flex-col gap-2">
                            <h2 className="text-2xl font-black text-white leading-tight">{projectDetail.title}</h2>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <span className="inline-block px-2.5 py-0.5 rounded-full border border-white/10 text-xs capitalize font-medium">
                                {projectDetail.status.replace("_", " ")}
                              </span>
                              <span className={cn("px-2.5 py-0.5 rounded-full border text-xs capitalize", healthColors[projectDetail.health])}>
                                {projectDetail.health.replace("_", " ")}
                              </span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Project Leader</p>
                                <p className="text-sm font-semibold text-white mt-0.5">{projectDetail.owner_detail?.full_name || "None Assigned"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Department</p>
                                <p className="text-sm font-semibold text-white mt-0.5">{projectDetail.department_detail?.name || "None"}</p>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-muted mt-4 leading-relaxed">{projectDetail.description || "No description provided."}</p>
                        </div>

                        {/* Progress Bar Row */}
                        <div className="space-y-2 p-4 bg-muted/10 rounded-xl border border-card-border">
                          <div className="flex justify-between text-sm font-bold">
                            <span className="text-muted">Progression Status</span>
                            <span className="text-white">{projectDetail.completion_percentage}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${projectDetail.completion_percentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Tabs Switches */}
                        <div className="flex border-b border-white/10 shrink-0">
                          <button
                            onClick={() => setActiveTab("phases")}
                            className={cn(
                              "pb-3 px-6 text-sm font-bold border-b-2 transition-all",
                              activeTab === "phases"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted hover:text-white"
                            )}
                          >
                            Phases & Stages
                          </button>
                          <button
                            onClick={() => setActiveTab("teams")}
                            className={cn(
                              "pb-3 px-6 text-sm font-bold border-b-2 transition-all",
                              activeTab === "teams"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted hover:text-white"
                            )}
                          >
                            Teams & Members
                          </button>
                        </div>

                        {/* Switchable tab contents */}
                        <AnimatePresence mode="wait">
                          {activeTab === "phases" ? (
                            <motion.div
                              key="phases-tab"
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              transition={{ duration: 0.1 }}
                              className="space-y-4 pt-2"
                            >
                              <div className="flex justify-between items-center pb-2">
                                <h3 className="text-base font-bold text-white">Project Phases & Stages</h3>
                              </div>

                              {/* Add Phase Form */}
                              {isSuperuser && (
                                <div className="space-y-2 max-w-md">
                                  <form onSubmit={handleAddPhase} className="flex gap-2 w-full">
                                    <Input
                                      value={newPhaseTitle}
                                      onChange={(e) => { setNewPhaseTitle(e.target.value); setPhaseError(null); }}
                                      placeholder="Add a Phase (e.g. Design & CAD)"
                                      className="h-9 text-xs"
                                      required
                                    />
                                    <Button type="submit" size="sm" disabled={createPhaseMutation.isPending} className="h-9 px-3 text-white flex items-center gap-1 shrink-0">
                                      <Plus size={14} /> Add Phase
                                    </Button>
                                  </form>
                                  {phaseError && (
                                    <p className="text-xs text-danger bg-danger/10 border border-danger/20 px-3 py-1.5 rounded-lg">{phaseError}</p>
                                  )}
                                </div>
                              )}

                              {/* Interactive Phases Tree */}
                              <div className="space-y-4">
                                {projectDetail.phases?.map((phase: any) => {
                                  return (
                                    <div key={phase.id} className="border border-white/5 bg-white/2 rounded-xl p-4 space-y-3">
                                      <div className="flex justify-between items-center bg-white/2 -mx-4 -mt-4 p-3 rounded-t-xl border-b border-white/5">
                                        <div className="flex items-center gap-3">
                                          <RadioButton
                                            disabled={!isSuperuser}
                                            checked={phase.is_completed}
                                            onCheckedChange={(checked) =>
                                              togglePhaseMutation.mutate({
                                                id: phase.id,
                                                data: { is_completed: checked },
                                              })
                                            }
                                          />
                                          <div>
                                            <span className="font-bold text-sm text-white">{phase.title}</span>
                                            <LinkedTasks tasks={phase.tasks} />
                                          </div>
                                        </div>
                                        {isSuperuser && (
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => openTaskModal({ linked_phase: String(phase.id) })}
                                              className="text-[10px] bg-primary/20 hover:bg-primary/40 text-primary px-2 py-0.5 rounded transition-colors font-bold"
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
                                          return (
                                            <div key={stage.id} className="border-l border-white/10 pl-4 space-y-2">
                                              <div className="flex justify-between items-center group/stage">
                                                <div className="flex items-center gap-3">
                                                  <RadioButton
                                                    disabled={!isSuperuser}
                                                    checked={stage.is_completed}
                                                    onCheckedChange={(checked) =>
                                                      toggleSubStageMutation.mutate({
                                                        id: stage.id,
                                                        data: { is_completed: checked },
                                                      })
                                                    }
                                                  />
                                                  <div>
                                                    <span className="text-xs font-semibold text-white/80">{stage.title}</span>
                                                    <LinkedTasks tasks={stage.tasks} />
                                                  </div>
                                                </div>
                                                {isSuperuser && (
                                                  <div className="flex items-center gap-1 opacity-0 group-hover/stage:opacity-100 transition-all">
                                                    <button
                                                      onClick={() => openTaskModal({ linked_phase: String(phase.id), linked_sub_stage: String(stage.id) })}
                                                      className="text-[9px] bg-primary/20 hover:bg-primary/40 text-primary px-1.5 py-0.5 rounded transition-colors font-bold"
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
                                                    <div className="flex items-center gap-3">
                                                      <RadioButton
                                                        disabled={!isSuperuser}
                                                        checked={sub.is_completed}
                                                        onCheckedChange={(checked) =>
                                                          toggleSubLevelMutation.mutate({
                                                            id: sub.id,
                                                            data: { is_completed: checked },
                                                          })
                                                        }
                                                      />
                                                      <div>
                                                        <span className="text-white/60">{sub.title}</span>
                                                        <LinkedTasks tasks={sub.tasks} />
                                                      </div>
                                                    </div>
                                                    {isSuperuser && (
                                                      <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-all">
                                                        <button
                                                          onClick={() => openTaskModal({ linked_phase: String(phase.id), linked_sub_stage: String(stage.id), linked_sub_level: String(sub.id) })}
                                                          className="text-[9px] bg-primary/20 hover:bg-primary/40 text-primary px-1.5 py-0.5 rounded transition-colors font-bold"
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
                                                    className="flex gap-2 w-full pt-1"
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
                                                    className="text-[10px] text-primary/70 hover:text-primary flex items-center gap-0.5 pt-1 font-bold"
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
                                            className="flex gap-2 w-full pt-1 pl-4"
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
                                            className="text-xs text-primary/75 hover:text-primary flex items-center gap-1 pl-4 font-bold"
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
                            </motion.div>
                          ) : (
                            <motion.div
                              key="teams-tab"
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              transition={{ duration: 0.1 }}
                              className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 items-stretch"
                            >
                              {/* ────────── LEFT SUB-COLUMN: PROJECT CARD + TEAM SELECTOR + TEAM CREATOR ────────── */}
                              <div className="space-y-4 flex flex-col">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Selectors</h3>
                                
                                {/* Project Selector Card */}
                                <Card
                                  onClick={() => setSelectedTeamIdForMembers("project")}
                                  className={cn(
                                    "p-4 border cursor-pointer transition-all flex flex-col justify-between hover:border-primary/50",
                                    selectedTeamIdForMembers === "project" 
                                      ? "border-primary bg-primary/5 shadow-md shadow-primary/5" 
                                      : "border-white/5 bg-white/2"
                                  )}
                                >
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <FolderGit className="text-indigo-400 h-4 w-4" />
                                      <h4 className="font-bold text-xs uppercase tracking-wider text-white">Project Wide View</h4>
                                    </div>
                                    <p className="text-xs font-semibold text-white/90">{projectDetail.title}</p>
                                    <p className="text-[10px] text-muted mt-1">Select to view all combined team members</p>
                                  </div>
                                  <div className="mt-3 pt-2 border-t border-white/5 flex justify-between items-center text-[10px] text-muted">
                                    <span>Combined Team Members</span>
                                    <span className="text-white font-bold">
                                      {(() => {
                                        const setIds = new Set();
                                        projectDetail.teams_detail?.forEach((t: any) => 
                                          t.members?.forEach((mId: number) => setIds.add(mId))
                                        );
                                        return setIds.size;
                                      })()}
                                    </span>
                                  </div>
                                </Card>

                                {/* Team Selector Cards */}
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Sub Teams</p>
                                  {(!projectDetail.teams_detail || projectDetail.teams_detail.length === 0) ? (
                                    <p className="text-xs text-muted italic pl-1">No sub-teams created.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {projectDetail.teams_detail.map((team: any) => (
                                        <Card
                                          key={team.id}
                                          onClick={() => setSelectedTeamIdForMembers(team.id)}
                                          className={cn(
                                            "p-3 border cursor-pointer transition-all flex flex-col justify-between hover:border-primary/50 group",
                                            selectedTeamIdForMembers === team.id
                                              ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                                              : "border-white/5 bg-white/2"
                                          )}
                                        >
                                          <div className="flex justify-between items-start gap-2">
                                            <div>
                                              <h5 className="font-bold text-xs text-white">{team.name}</h5>
                                              <p className="text-[10px] text-muted mt-0.5 line-clamp-1">{team.description || "No description"}</p>
                                            </div>
                                            {isSuperuser && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  deleteTeamMutation.mutate(team.slug);
                                                }}
                                                className="p-1 rounded text-muted hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete Team"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            )}
                                          </div>
                                          <div className="mt-2 pt-1.5 border-t border-white/5 flex justify-between items-center text-[9px] text-muted">
                                            <span>Lead: <strong className="text-white/80">{team.lead_detail?.first_name || "None"}</strong></span>
                                            <span>Members: <strong className="text-white/80">{team.members?.length || 0}</strong></span>
                                          </div>
                                        </Card>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Create Team form (always below Project Card / sub-column) */}
                                {isSuperuser && (
                                  showCreateTeam ? (
                                    <form onSubmit={handleCreateTeam} className="p-3 border border-white/5 bg-white/2 rounded-xl space-y-3 mt-auto">
                                      <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Create New Team</h4>
                                        <button type="button" onClick={() => setShowCreateTeam(false)} className="text-muted hover:text-white"><X size={12}/></button>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="space-y-0.5">
                                          <label className="text-[9px] font-bold text-muted uppercase">Team Name</label>
                                          <Input
                                            value={newTeamName}
                                            onChange={(e) => setNewTeamName(e.target.value)}
                                            placeholder="e.g. Software, CAD, Electrical"
                                            className="h-7 text-xs"
                                            required
                                          />
                                        </div>
                                        <div className="space-y-0.5">
                                          <label className="text-[9px] font-bold text-muted uppercase">Team Lead</label>
                                          <select
                                            value={newTeamLead}
                                            onChange={(e) => setNewTeamLead(e.target.value)}
                                            className="w-full h-7 rounded border border-card-border bg-card px-2 text-[10px] text-foreground focus:outline-none"
                                          >
                                            <option value="">Select Team Lead...</option>
                                            {members.map((m: any) => (
                                              <option key={m.id} value={m.id}>{m.full_name}</option>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="space-y-0.5">
                                          <label className="text-[9px] font-bold text-muted uppercase">Description</label>
                                          <Input
                                            value={newTeamDescription}
                                            onChange={(e) => setNewTeamDescription(e.target.value)}
                                            placeholder="Optional..."
                                            className="h-7 text-xs"
                                          />
                                        </div>
                                      </div>
                                      <Button type="submit" size="sm" disabled={createTeamMutation.isPending} className="h-7 w-full text-white flex items-center justify-center gap-1">
                                        <Plus size={12} /> Create Team
                                      </Button>
                                    </form>
                                  ) : (
                                    <Button type="button" onClick={() => setShowCreateTeam(true)} variant="outline" className="w-full mt-auto h-8 text-xs border-dashed border-white/20 text-muted hover:text-white flex items-center justify-center gap-1">
                                      <Plus size={12} /> Create Sub-Team
                                    </Button>
                                  )
                                )}
                              </div>

                              {/* ────────── RIGHT SUB-COLUMN: SINGLE-COLUMN SCROLL OF MEMBERS ────────── */}
                              <div className="border-l border-white/5 pl-6 flex flex-col min-h-[300px]">
                                <div className="space-y-1 mb-4">
                                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <Users size={16} className="text-indigo-400" />
                                    {selectedTeamIdForMembers === "project" 
                                      ? "Combined Team Members" 
                                      : `${activeSelectedTeamObj?.name || "Team"} Members`
                                    }
                                    <span className="text-xs text-muted font-normal">({getSelectedTeamMembers().length})</span>
                                  </h3>
                                  <p className="text-[10px] text-muted">
                                    {selectedTeamIdForMembers === "project"
                                      ? "Viewing combined list of all assigned team members."
                                      : "Manage members of this sub-team."
                                    }
                                  </p>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[320px] scrollbar-thin">
                                  {getSelectedTeamMembers().length === 0 ? (
                                    <p className="text-xs text-muted italic pt-4">No team members assigned.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {getSelectedTeamMembers().map((m: any) => (
                                        <div key={m.id} className="flex justify-between items-center p-2 rounded-lg border border-white/5 bg-white/2">
                                          <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-white truncate">{m.full_name}</span>
                                            <span className="text-[8px] uppercase tracking-wider font-semibold text-primary/80 mt-0.5">{m.role?.name || "Member"}</span>
                                          </div>
                                          {selectedTeamIdForMembers !== "project" && activeSelectedTeamObj && isSuperuser && (
                                            <button
                                              onClick={() => {
                                                updateTeamMembersMutation.mutate({
                                                  slug: activeSelectedTeamObj.slug,
                                                  members: activeSelectedTeamObj.members.filter((id: number) => id !== m.id),
                                                });
                                              }}
                                              className="p-1 rounded text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                                              title="Remove from Team"
                                            >
                                              <UserMinus size={13} />
                                            </button>
                                          )}
                                          {selectedTeamIdForMembers === "project" && isSuperuser && (
                                            <button
                                              onClick={() => {
                                                removeProjectMemberMutation.mutate({
                                                  slug: projectDetail.slug,
                                                  userId: m.id,
                                                });
                                              }}
                                              className="p-1 rounded text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                                              title="Remove from Project"
                                            >
                                              <UserMinus size={13} />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Add Member to Selected Team Form */}
                                {selectedTeamIdForMembers !== "project" && activeSelectedTeamObj && isSuperuser && (
                                  <form
                                    onSubmit={(e) => handleAddTeamMember(e, activeSelectedTeamObj.slug, activeSelectedTeamObj.members || [])}
                                    className="mt-4 pt-3 border-t border-white/5 flex flex-col gap-2"
                                  >
                                    <p className="text-[10px] font-bold text-white uppercase">Add Member to Team</p>
                                    <div className="flex gap-2">
                                      <select
                                        value={teamMemberToAdd}
                                        onChange={(e) => setTeamMemberToAdd(e.target.value)}
                                        className="flex-1 h-8 rounded border border-card-border bg-card px-2 text-xs text-foreground focus:outline-none"
                                        required
                                      >
                                        <option value="">Select member to add...</option>
                                        {eligibleTeamMembers.map((pm: any) => (
                                          <option key={pm.id} value={pm.id}>
                                            {pm.full_name} ({pm.role?.name || "Member"})
                                          </option>
                                        ))}
                                      </select>
                                      <button type="submit" className="h-8 px-3 bg-primary/20 hover:bg-primary/40 text-primary text-xs rounded transition-colors flex items-center gap-1 font-bold">
                                        <UserPlus size={12} /> Add
                                      </button>
                                    </div>
                                  </form>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty-placeholder"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center justify-center text-center py-24 px-4 h-full space-y-4 animate-in fade-in duration-300"
                  >
                    <div className="p-4 bg-primary/10 rounded-full text-primary border border-primary/25">
                      <Circle size={32} className="text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">No Project Selected</h3>
                    <p className="text-sm text-muted max-w-xs leading-relaxed">
                      Please select a card to show details of project, or click the "Create Project" button to start a new one.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </ScrollList>
          </Card>
        </div>
      </div>

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
    </>
  );
}
