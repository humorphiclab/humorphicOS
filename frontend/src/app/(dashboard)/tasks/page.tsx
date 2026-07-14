"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { apiFetch, getStoredUser, membersApi, projectsApi, tasksApi, departmentsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Paperclip, UploadCloud, Plus, Layers3 } from "lucide-react";

const STATUSES = ["todo", "in_progress", "review", "done", "blocked"] as const;

const statusColors: Record<string, string> = {
  todo: "bg-muted/20 text-muted",
  in_progress: "bg-primary/20 text-primary",
  review: "bg-warning/20 text-warning",
  done: "bg-success/20 text-success",
  blocked: "bg-danger/20 text-danger",
};

export default function TasksPage() {
  const qc = useQueryClient();
  const user = getStoredUser();
  const isLead = user?.is_superuser || user?.role?.is_leadership || user?.role?.slug === "team_lead" || user?.role?.slug === "department_head" || false;

  const [tab, setTab] = useState<"list" | "kanban" | "create">("list");
  const tabs: ("list" | "kanban" | "create")[] = ["list", "kanban", "create"];

  const [assignType, setAssignType] = useState<"member" | "project" | "department">("member");
  const [assigneeType, setAssigneeType] = useState<"single" | "multiple" | "all">("single");
  const [projectTargetType, setProjectTargetType] = useState<"team" | "member">("team");

  // Create Form State
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
    assignee: "",
    assigned_team: "",
    assigned_department: "",
    project: "",
    linked_phase: "",
    linked_sub_stage: "",
    linked_sub_level: "",
  });

  // Selected members for bulk assign
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  const [attachments, setAttachments] = useState<File[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [taskUploads, setTaskUploads] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [statusNote, setStatusNote] = useState("");

  // Queries
  const { data: tasks, isLoading } = useQuery({ queryKey: ["my-tasks"], queryFn: tasksApi.myTasks });
  const { data: kanban } = useQuery({ queryKey: ["kanban"], queryFn: () => tasksApi.kanban(), enabled: tab === "kanban" });

  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: membersApi.list,
    enabled: isLead && assignType === "member" && tab === "create",
  });

  const { data: departments } = useQuery({ queryKey: ["departments"], queryFn: departmentsApi.list, enabled: isLead && assignType === "department" });
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list, enabled: isLead });

  const { data: selectedProjectDetail } = useQuery({
    queryKey: ["projectDetail", form.project],
    queryFn: () => projectsApi.get(projects?.find(p => p.id === Number(form.project))?.slug || ""),
    enabled: !!form.project,
  });

  const allProjectMembers = React.useMemo(() => {
    if (!selectedProjectDetail) return [];
    const membersMap = new Map();
    (selectedProjectDetail.members_detail || []).forEach((m: any) => membersMap.set(m.id, m));
    (selectedProjectDetail.teams_detail || []).forEach((t: any) => {
      if (t.lead_detail) membersMap.set(t.lead_detail.id, t.lead_detail);
      (t.members_detail || []).forEach((m: any) => membersMap.set(m.id, m));
    });
    return Array.from(membersMap.values());
  }, [selectedProjectDetail]);

  const createTask = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const task = await tasksApi.create(data);
      for (const file of attachments) {
        await tasksApi.uploadAttachment(task.id, file);
      }
      return task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
      qc.invalidateQueries({ queryKey: ["kanban"] });
      setTab("list");
      setForm({
        title: "", description: "", priority: "medium", due_date: "",
        assignee: "", assigned_team: "", assigned_department: "",
        project: "", linked_phase: "", linked_sub_stage: "", linked_sub_level: ""
      });
      setAssignType("member");
      setAssigneeType("single");
      setProjectTargetType("team");
      setAttachments([]);
      setSelectedMembers([]);
    },
    onError: (err: any) => {
      alert(err.message || "Failed to create task");
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => tasksApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
      qc.invalidateQueries({ queryKey: ["kanban"] });
    },
  });

  // Client-side permission helper matching backend restrictions
  const canUserModifyTask = (task: any) => {
    if (!user) return false;
    if (user.is_superuser) return true;
    if (task.assigned_by === user.id) return true;
    if (task.assignee === user.id) return true;

    if (task.assigned_team_detail) {
      if (task.assigned_team_detail.lead === user.id) return true;
    }
    if (task.assigned_department_detail) {
      if (task.assigned_department_detail.head === user.id) return true;
    }
    return false;
  };

  return (
    <>
      <TopBar title="Tasks" />
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <Button key={t} variant={tab === t ? "primary" : "secondary"} size="sm" onClick={() => setTab(t)} className="capitalize">
              {t === "create" ? "Create Task" : t}
            </Button>
          ))}
        </div>

        {/* Tab: Create Task */}
        {tab === "create" && (
          <Card>
            <form
              onSubmit={(e) => {
                e.preventDefault();

                if (!isLead) {
                  // General member self-assign
                  createTask.mutate({
                    title: form.title,
                    description: form.description,
                    priority: form.priority,
                    ...(form.due_date ? { due_date: form.due_date } : {}),
                    status: "todo",
                    assignee: user?.id,
                  });
                  return;
                }

                // Lead assignment options
                if (assignType === "member") {
                  if (assigneeType === "all") {
                    createTask.mutate({
                      title: form.title,
                      description: form.description,
                      priority: form.priority,
                      ...(form.due_date ? { due_date: form.due_date } : {}),
                      status: "todo",
                      assignee: "all",
                    });
                  } else if (assigneeType === "multiple") {
                    if (selectedMembers.length === 0) {
                      alert("Please select at least one member.");
                      return;
                    }
                    createTask.mutate({
                      title: form.title,
                      description: form.description,
                      priority: form.priority,
                      ...(form.due_date ? { due_date: form.due_date } : {}),
                      status: "todo",
                      selected_members: selectedMembers,
                    });
                  } else {
                    createTask.mutate({
                      title: form.title,
                      description: form.description,
                      priority: form.priority,
                      ...(form.due_date ? { due_date: form.due_date } : {}),
                      status: "todo",
                      ...(form.assignee ? { assignee: Number(form.assignee) } : {}),
                    });
                  }
                } else if (assignType === "project") {
                  createTask.mutate({
                    title: form.title,
                    description: form.description,
                    priority: form.priority,
                    ...(form.due_date ? { due_date: form.due_date } : {}),
                    status: "todo",
                    project: Number(form.project),
                    ...(projectTargetType === "team" && form.assigned_team ? { assigned_team: Number(form.assigned_team) } : {}),
                    ...(projectTargetType === "member" && form.assignee ? { assignee: Number(form.assignee) } : {}),
                    ...(form.linked_phase ? { linked_phase: Number(form.linked_phase) } : {}),
                    ...(form.linked_sub_stage ? { linked_sub_stage: Number(form.linked_sub_stage) } : {}),
                    ...(form.linked_sub_level ? { linked_sub_level: Number(form.linked_sub_level) } : {}),
                  });
                } else if (assignType === "department") {
                  createTask.mutate({
                    title: form.title,
                    description: form.description,
                    priority: form.priority,
                    ...(form.due_date ? { due_date: form.due_date } : {}),
                    status: "todo",
                    assigned_department: Number(form.assigned_department),
                  });
                }
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div className="col-span-1 md:col-span-2 flex items-center justify-between border-b border-card-border pb-4 mb-2">
                <h3 className="font-semibold m-0">Assign New Task</h3>
                <Button type="submit" disabled={createTask.isPending} size="sm" variant="primary" className="gap-2">
                  <Plus size={16} />
                  {createTask.isPending ? "Creating..." : "Create Task"}
                </Button>
              </div>

              {/* Left Side: Basic Info & Assignment */}
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-24" />
                </div>

                {/* Assignment Controls */}
                {isLead ? (
                  <div className="p-4 border rounded-lg bg-card/50 space-y-4">
                    <h4 className="text-sm font-medium">Assignment Target</h4>
                    <div className="flex gap-2 border-b border-card-border pb-3">
                      <Button type="button" size="sm" variant={assignType === "member" ? "primary" : "secondary"} onClick={() => { setAssignType("member"); setForm({ ...form, project: "", assignee: "" }); }}>Standalone Member</Button>
                      <Button type="button" size="sm" variant={assignType === "project" ? "primary" : "secondary"} onClick={() => { setAssignType("project"); setForm({ ...form, assignee: "", assigned_team: "", assigned_department: "" }); }}>Project Workflow</Button>
                      <Button type="button" size="sm" variant={assignType === "department" ? "primary" : "secondary"} onClick={() => { setAssignType("department"); setForm({ ...form, project: "", assignee: "", assigned_team: "" }); }}>Department</Button>
                    </div>

                    {assignType === "member" && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-muted block mb-1">Assign Mode</Label>
                          <div className="flex gap-3 mb-2">
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <input
                                type="radio"
                                name="assignee_type"
                                checked={assigneeType === "single"}
                                onChange={() => setAssigneeType("single")}
                                className="text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                              Single Member
                            </label>
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <input
                                type="radio"
                                name="assignee_type"
                                checked={assigneeType === "multiple"}
                                onChange={() => setAssigneeType("multiple")}
                                className="text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                              Multiple Members
                            </label>
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <input
                                type="radio"
                                name="assignee_type"
                                checked={assigneeType === "all"}
                                onChange={() => setAssigneeType("all")}
                                className="text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                              All Members
                            </label>
                          </div>
                        </div>

                        {assigneeType === "single" && (
                          <div className="space-y-1">
                            <Label>Select Member</Label>
                            <select
                              className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm"
                              value={form.assignee}
                              onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                            >
                              <option value="">Unassigned</option>
                              {(members ?? []).map((m) => (
                                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {assigneeType === "multiple" && (
                          <div className="space-y-2">
                            <Label className="text-xs text-muted">Select Member List</Label>
                            <div className="max-h-48 overflow-y-auto border border-card-border/80 rounded-lg p-2.5 space-y-1.5 bg-card/60">
                              {members && members.length > 0 ? (
                                members.map((m) => {
                                  const isChecked = selectedMembers.includes(m.id);
                                  return (
                                    <label key={m.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/10 p-1.5 rounded transition-colors">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          if (isChecked) {
                                            setSelectedMembers(selectedMembers.filter(id => id !== m.id));
                                          } else {
                                            setSelectedMembers([...selectedMembers, m.id]);
                                          }
                                        }}
                                        className="rounded border-card-border text-primary h-3.5 w-3.5"
                                      />
                                      <span>{m.first_name} {m.last_name} ({m.username})</span>
                                    </label>
                                  );
                                })
                              ) : (
                                <p className="text-xs text-muted py-2 text-center">Loading members list...</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {assignType === "project" && (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <Label>1. Select Project</Label>
                          <select
                            className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm"
                            value={form.project}
                            onChange={(e) => setForm({ ...form, project: e.target.value, assignee: "", assigned_team: "", linked_phase: "", linked_sub_stage: "", linked_sub_level: "" })}
                          >
                            <option value="">Select a Project...</option>
                            {(projects ?? []).map((p) => (
                              <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                          </select>
                        </div>

                        {form.project && (
                          <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                            <div>
                              <Label className="block mb-2">2. Assign to Project Team or Member</Label>
                              <div className="flex gap-2 mb-2">
                                <Button type="button" size="sm" className="h-7 text-xs" variant={projectTargetType === "team" ? "primary" : "outline"} onClick={() => { setProjectTargetType("team"); setForm({ ...form, assignee: "" }); }}>Team</Button>
                                <Button type="button" size="sm" className="h-7 text-xs" variant={projectTargetType === "member" ? "primary" : "outline"} onClick={() => { setProjectTargetType("member"); setForm({ ...form, assigned_team: "" }); }}>Specific Member</Button>
                              </div>

                              {projectTargetType === "team" && (
                                <select
                                  className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm"
                                  value={form.assigned_team}
                                  onChange={(e) => setForm({ ...form, assigned_team: e.target.value })}
                                >
                                  <option value="">Select Team involved in project...</option>
                                  {(selectedProjectDetail?.teams_detail ?? []).map((t: any) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                  ))}
                                </select>
                              )}

                              {projectTargetType === "member" && (
                                <select
                                  className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm"
                                  value={form.assignee}
                                  onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                                >
                                  <option value="">Select Member involved in project...</option>
                                  {allProjectMembers.map((m: any) => (
                                    <option key={m.id} value={m.id}>{m.full_name || (m.first_name + ' ' + m.last_name)}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {assignType === "department" && (
                      <div className="space-y-1">
                        <Label>Select Department</Label>
                        <select
                          className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm"
                          value={form.assigned_department}
                          onChange={(e) => setForm({ ...form, assigned_department: e.target.value })}
                        >
                          <option value="">Select Department...</option>
                          {(departments ?? []).map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 border rounded-lg bg-card/50">
                    <Label className="block mb-1">Assigned To</Label>
                    <p className="text-sm font-semibold text-primary">Myself</p>
                  </div>
                )}
              </div>

              {/* Right Side: Project Linkage & Attachments */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Priority</Label>
                    <select
                      className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    >
                      {["low", "medium", "high", "urgent"].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    />
                  </div>
                </div>

                {isLead && assignType === "project" && selectedProjectDetail && (
                  <div className="p-4 border rounded-lg bg-card/50 space-y-3">
                    <h4 className="text-sm font-medium mb-1 flex items-center gap-1.5"><Layers3 size={14} /> Project Phase Association</h4>
                    <div>
                      <Label className="text-xs text-muted">Phase</Label>
                      <select
                        className="w-full rounded-lg border border-card-border bg-card px-2.5 py-1.5 text-xs"
                        value={form.linked_phase}
                        onChange={(e) => setForm({ ...form, linked_phase: e.target.value, linked_sub_stage: "", linked_sub_level: "" })}
                      >
                        <option value="">No phase association</option>
                        {(selectedProjectDetail.phases_detail ?? []).map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    {form.linked_phase && (
                      <div>
                        <Label className="text-xs text-muted">Sub Stage</Label>
                        <select
                          className="w-full rounded-lg border border-card-border bg-card px-2.5 py-1.5 text-xs"
                          value={form.linked_sub_stage}
                          onChange={(e) => setForm({ ...form, linked_sub_stage: e.target.value, linked_sub_level: "" })}
                        >
                          <option value="">No sub stage association</option>
                          {((selectedProjectDetail.phases_detail ?? []).find((p: any) => p.id === Number(form.linked_phase))?.substages_detail ?? []).map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {form.linked_sub_stage && (
                      <div>
                        <Label className="text-xs text-muted">Sub Level</Label>
                        <select
                          className="w-full rounded-lg border border-card-border bg-card px-2.5 py-1.5 text-xs"
                          value={form.linked_sub_level}
                          onChange={(e) => setForm({ ...form, linked_sub_level: e.target.value })}
                        >
                          <option value="">No sub level association</option>
                          {((((selectedProjectDetail.phases_detail ?? []).find((p: any) => p.id === Number(form.linked_phase))?.substages_detail ?? []).find((s: any) => s.id === Number(form.linked_sub_stage))?.sublevels_detail ?? [])).map((l: any) => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label>Attachments</Label>
                  <div className="border border-dashed border-card-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/10 transition-colors" onClick={() => document.getElementById("task-create-file-upload")?.click()}>
                    <input
                      type="file"
                      multiple
                      id="task-create-file-upload"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) setAttachments(Array.from(e.target.files));
                      }}
                    />
                    <UploadCloud className="mx-auto h-8 w-8 text-muted mb-2" />
                    <p className="text-sm font-medium">Click to upload files</p>
                    <p className="text-xs text-muted mt-1">Select files to upload for this task</p>
                  </div>
                  {attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {attachments.map((f, i) => (
                        <div key={i} className="text-xs bg-muted/20 border border-card-border rounded px-2 py-1 flex items-center gap-1.5">
                          <Paperclip size={10} />
                          <span className="truncate max-w-[120px]">{f.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </form>
          </Card>
        )}

        {/* Tab: Kanban Board */}
        {tab === "kanban" && (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3 overflow-x-auto">
            {STATUSES.map((status) => (
              <div key={status} className="min-w-[200px]">
                <p className="text-xs font-semibold uppercase text-muted mb-2">{status.replace("_", " ")}</p>
                <div className="space-y-2">
                  {(kanban?.[status] ?? []).map((task: any) => (
                    <Card key={task.id} className="p-3 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedTask(task)}>
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.project_detail && <p className="text-[10px] text-primary mt-1">{task.project_detail.title}</p>}
                      {canUserModifyTask(task) && status !== "done" && (
                        <select
                          className="mt-2 w-full text-xs rounded border border-card-border bg-card px-1 py-0.5"
                          value={status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateStatus.mutate({ id: task.id, status: e.target.value })}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Task List */}
        {tab === "list" && (
          isLoading ? (
            <p className="text-muted text-sm">Loading tasks...</p>
          ) : !tasks?.length ? (
            <Card><p className="text-muted text-center py-8">No tasks assigned yet.</p></Card>
          ) : (
            <div className="space-y-3">
              {tasks.map((task: any) => (
                <Card key={task.id} className="flex items-start justify-between gap-4 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedTask(task)}>
                  <div>
                    <h3 className="font-medium">{task.title}</h3>
                    {task.description && <p className="text-sm text-muted mt-1 line-clamp-2">{task.description}</p>}
                    <div className="flex gap-2 items-center mt-2">
                      {task.project_detail && <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">{task.project_detail.title}</span>}
                      {task.attachments && task.attachments.length > 0 && (
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Paperclip size={12} /> {task.attachments.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {canUserModifyTask(task) && task.status !== "done" ? (
                      <select
                        className={cn("text-xs px-2 py-0.5 rounded-full capitalize border-none outline-none appearance-none cursor-pointer font-medium", statusColors[task.status] || statusColors.todo)}
                        value={task.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateStatus.mutate({ id: task.id, status: e.target.value })}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </select>
                    ) : (
                      <span className={cn("text-xs px-2 py-0.5 rounded-full capitalize font-medium", statusColors[task.status] || statusColors.todo)}>
                        {task.status.replace("_", " ")}
                      </span>
                    )}
                    <span className="text-xs capitalize font-medium">{task.priority}</span>
                    {task.due_date && <span className="text-xs text-muted font-mono">{task.due_date}</span>}
                  </div>
                </Card>
              ))}
            </div>
          )
        )}
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl p-6 bg-card relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedTask(null)} className="absolute top-4 right-4 text-muted hover:text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full capitalize font-medium", statusColors[selectedTask.status] || statusColors.todo)}>
                    {selectedTask.status.replace("_", " ")}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full capitalize border border-card-border font-medium">
                    {selectedTask.priority} Priority
                  </span>
                </div>
                <h2 className="text-xl font-bold">{selectedTask.title}</h2>
              </div>

              <div className="bg-muted/10 p-4 rounded-xl border border-card-border space-y-3 text-sm">
                <div className="flex justify-between border-b border-card-border pb-2">
                  <span className="text-muted">Assigned To</span>
                  <span className="font-semibold">{selectedTask.assignee_detail ? selectedTask.assignee_detail.first_name + ' ' + selectedTask.assignee_detail.last_name : "Unassigned"}</span>
                </div>
                <div className="flex justify-between border-b border-card-border pb-2">
                  <span className="text-muted">Assigned By</span>
                  <span className="font-semibold">{selectedTask.assigned_by_detail ? selectedTask.assigned_by_detail.first_name + ' ' + selectedTask.assigned_by_detail.last_name : "System"}</span>
                </div>
                {selectedTask.project_detail && (
                  <div className="flex justify-between pt-1">
                    <span className="text-muted">Project Link</span>
                    <span className="font-semibold text-primary">{selectedTask.project_detail.title}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted whitespace-pre-wrap">{selectedTask.description || "No description provided."}</p>
              </div>

              {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><Paperclip size={14} /> Attachments</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.attachments.map((att: any) => (
                      <a
                        key={att.id}
                        href={att.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="flex items-center gap-2 text-xs bg-muted/20 px-3 py-1.5 rounded-lg border border-card-border hover:bg-muted/40 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        File {att.id}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload new attachment (Assignee or Lead) */}
              {canUserModifyTask(selectedTask) && selectedTask.status !== "done" && (
                <div className="pt-2">
                  <label className="text-xs font-semibold text-muted mb-1 block">Add Delivery / Review Attachments</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      multiple
                      id="task-file-upload"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) setTaskUploads(Array.from(e.target.files));
                      }}
                    />
                    <label htmlFor="task-file-upload" className="cursor-pointer flex items-center gap-2 text-xs bg-card px-3 py-1.5 rounded-lg border border-card-border hover:bg-muted/20 transition-colors">
                      <UploadCloud size={14} /> Select Files
                    </label>
                    {taskUploads.length > 0 && (
                      <Button
                        size="sm"
                        disabled={isUploading}
                        onClick={async () => {
                          setIsUploading(true);
                          try {
                            for (const f of taskUploads) {
                              await tasksApi.uploadAttachment(selectedTask.id, f);
                            }
                            setTaskUploads([]);
                            qc.invalidateQueries({ queryKey: ["my-tasks"] });
                            qc.invalidateQueries({ queryKey: ["kanban"] });
                            const t = await tasksApi.myTasks().then(res => res.find((x: any) => x.id === selectedTask.id));
                            if (t) setSelectedTask(t);
                          } catch (e) {
                            alert("Upload failed");
                          } finally {
                            setIsUploading(false);
                          }
                        }}
                      >
                        {isUploading ? "Uploading..." : `Upload ${taskUploads.length} File(s)`}
                      </Button>
                    )}
                    {taskUploads.length > 0 && (
                      <button className="text-danger p-1" onClick={() => setTaskUploads([])}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {canUserModifyTask(selectedTask) && (
                <div className="pt-4 border-t border-card-border space-y-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-muted">Add Note (Optional)</label>
                    <Textarea
                      className="h-16 text-sm"
                      placeholder="Add a note or context when changing status..."
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 items-center pt-2">
                    <span className="text-xs font-semibold text-muted w-full block mb-1">Task Actions</span>

                    {selectedTask.status === "todo" && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          try { if (statusNote.trim()) await tasksApi.addComment(selectedTask.id, statusNote); } catch (e) { console.error(e); }
                          updateStatus.mutate({ id: selectedTask.id, status: "in_progress" });
                          setSelectedTask({ ...selectedTask, status: "in_progress" });
                          setStatusNote("");
                        }}
                      >
                        Take Task
                      </Button>
                    )}

                    {selectedTask.status === "in_progress" && (
                      <Button
                        size="sm"
                        className="bg-warning text-white hover:bg-yellow-600 border-none"
                        onClick={async () => {
                          try { if (statusNote.trim()) await tasksApi.addComment(selectedTask.id, statusNote); } catch (e) { console.error(e); }
                          updateStatus.mutate({ id: selectedTask.id, status: "review" });
                          setSelectedTask({ ...selectedTask, status: "review" });
                          setStatusNote("");
                        }}
                      >
                        Submit for Review
                      </Button>
                    )}

                    {selectedTask.status === "review" && !user?.role?.is_leadership && !user?.is_superuser && selectedTask.assigned_by !== user?.id && (
                      <span className="text-xs text-warning bg-warning/10 px-3 py-1.5 rounded-lg border border-warning/20">Waiting for leader approval...</span>
                    )}

                    {(isLead || selectedTask.assigned_by === user?.id) && (
                      <div className="flex flex-wrap gap-2 w-full items-center">
                        {selectedTask.status === "review" && (
                          <>
                            <Button size="sm" className="bg-success text-white hover:bg-green-600 border-none" onClick={async () => {
                              try { if (statusNote.trim()) await tasksApi.addComment(selectedTask.id, statusNote); } catch (e) { console.error(e); }
                              updateStatus.mutate({ id: selectedTask.id, status: "done" });
                              setSelectedTask({ ...selectedTask, status: "done" });
                              setStatusNote("");
                            }}>
                              Accept & Complete
                            </Button>
                            <Button size="sm" variant="danger" onClick={async () => {
                              try { if (statusNote.trim()) await tasksApi.addComment(selectedTask.id, statusNote); } catch (e) { console.error(e); }
                              updateStatus.mutate({ id: selectedTask.id, status: "in_progress" });
                              setSelectedTask({ ...selectedTask, status: "in_progress" });
                              setStatusNote("");
                            }}>
                              Do Changes
                            </Button>
                          </>
                        )}

                        <select
                          className="max-w-[150px] rounded-lg border border-card-border bg-card px-3 py-1.5 text-sm ml-auto font-medium"
                          value={selectedTask.status}
                          onChange={async (e) => {
                            try { if (statusNote.trim()) await tasksApi.addComment(selectedTask.id, statusNote); } catch (e) { console.error(e); }
                            updateStatus.mutate({ id: selectedTask.id, status: e.target.value });
                            setSelectedTask({ ...selectedTask, status: e.target.value });
                            setStatusNote("");
                          }}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ").toUpperCase()}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Comments Section below Actions to show history */}
              {selectedTask.comments && selectedTask.comments.length > 0 && (
                <div className="pt-4 border-t border-card-border mt-4">
                  <h4 className="font-semibold mb-3 text-sm">Notes & History</h4>
                  <div className="space-y-3">
                    {selectedTask.comments.map((c: any) => (
                      <div key={c.id} className="bg-muted/10 p-3 rounded-lg border border-card-border">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-xs">{c.author_detail?.first_name} {c.author_detail?.last_name}</span>
                          <span className="text-[10px] text-muted">{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm">{c.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
