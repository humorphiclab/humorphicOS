"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { apiFetch, getStoredUser, membersApi, projectsApi, tasksApi, departmentsApi, teamsApi, Project } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Paperclip, UploadCloud } from "lucide-react";

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
  const isLead = user?.is_superuser || user?.role?.is_leadership || false;
  
  const [tab, setTab] = useState<"list" | "kanban" | "create">("list");
  const tabs: ("list" | "kanban" | "create")[] = ["list", "kanban", "create"];
  
  const [assignType, setAssignType] = useState<"member" | "team" | "department">("member");
  
  const [form, setForm] = useState({ 
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

  const [attachments, setAttachments] = useState<File[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const { data: tasks, isLoading } = useQuery({ queryKey: ["my-tasks"], queryFn: tasksApi.myTasks });
  const { data: kanban } = useQuery({ queryKey: ["kanban"], queryFn: () => tasksApi.kanban(), enabled: tab === "kanban" });
  
  const { data: members } = useQuery({ queryKey: ["members"], queryFn: membersApi.list, enabled: isLead && assignType === "member" });
  const { data: teams } = useQuery({ queryKey: ["teams"], queryFn: teamsApi.list, enabled: isLead && assignType === "team" });
  const { data: departments } = useQuery({ queryKey: ["departments"], queryFn: departmentsApi.list, enabled: isLead && assignType === "department" });
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list, enabled: isLead });

  // When a project is selected, fetch its details to get the phases tree
  const { data: selectedProjectDetail } = useQuery({ 
    queryKey: ["projectDetail", form.project], 
    queryFn: () => projectsApi.get(projects?.find(p => p.id === Number(form.project))?.slug || ""),
    enabled: !!form.project
  });

  const createTask = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const task = await tasksApi.create(data);
      
      // Upload attachments if any
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
        title: "", description: "", priority: "medium", 
        assignee: "", assigned_team: "", assigned_department: "",
        project: "", linked_phase: "", linked_sub_stage: "", linked_sub_level: ""
      });
      setAttachments([]);
    },
    onError: (err: any) => {
        alert(err.message || "Failed to create task");
    }
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => tasksApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
      qc.invalidateQueries({ queryKey: ["kanban"] });
    },
  });

  return (
    <>
      <TopBar title="Tasks" />
      <div className="p-6 space-y-4">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <Button key={t} variant={tab === t ? "primary" : "secondary"} size="sm" onClick={() => setTab(t)} className="capitalize">
              {t === "create" ? "Create Task" : t}
            </Button>
          ))}
        </div>

        {tab === "create" && (
          <Card>
            <h3 className="font-semibold mb-4">Assign New Task</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTask.mutate({
                  title: form.title,
                  description: form.description,
                  priority: form.priority,
                  status: "todo",
                  ...(isLead && assignType === "member" && form.assignee ? { assignee: Number(form.assignee) } : !isLead && user?.id ? { assignee: user.id } : {}),
                  ...(isLead && assignType === "team" && form.assigned_team ? { assigned_team: Number(form.assigned_team) } : {}),
                  ...(isLead && assignType === "department" && form.assigned_department ? { assigned_department: Number(form.assigned_department) } : {}),
                  ...(form.project ? { project: Number(form.project) } : {}),
                  ...(form.linked_phase ? { linked_phase: Number(form.linked_phase) } : {}),
                  ...(form.linked_sub_stage ? { linked_sub_stage: Number(form.linked_sub_stage) } : {}),
                  ...(form.linked_sub_level ? { linked_sub_level: Number(form.linked_sub_level) } : {}),
                });
              }}
              className="space-y-4 max-w-2xl"
            >
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              {/* Assignment Controls */}
              {isLead && (
                <div className="p-4 border rounded-lg bg-card/50">
                    <h4 className="text-sm font-medium mb-3">Assignment Target</h4>
                    <div className="flex gap-2 mb-3">
                      <Button type="button" size="sm" variant={assignType === "member" ? "primary" : "secondary"} onClick={() => setAssignType("member")}>Member</Button>
                      <Button type="button" size="sm" variant={assignType === "team" ? "primary" : "secondary"} onClick={() => setAssignType("team")}>Team</Button>
                      <Button type="button" size="sm" variant={assignType === "department" ? "primary" : "secondary"} onClick={() => setAssignType("department")}>Department</Button>
                    </div>
                    
                    {assignType === "member" && (
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
                    )}

                    {assignType === "team" && (
                      <select
                          className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm"
                          value={form.assigned_team}
                          onChange={(e) => setForm({ ...form, assigned_team: e.target.value })}
                      >
                          <option value="">Select Team</option>
                          {(teams ?? []).map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                      </select>
                    )}

                    {assignType === "department" && (
                      <select
                          className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm"
                          value={form.assigned_department}
                          onChange={(e) => setForm({ ...form, assigned_department: e.target.value })}
                      >
                          <option value="">Select Department</option>
                          {(departments ?? []).map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                      </select>
                    )}
                </div>
              )}

              {/* Project Linkage Controls */}
              <div className="p-4 border rounded-lg bg-card/50 space-y-3">
                  <h4 className="text-sm font-medium">Project Linkage (Optional)</h4>
                  <p className="text-xs text-muted">Completing this task will automatically progress the selected project hierarchy level.</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Project</Label>
                        <select
                        className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm"
                        value={form.project}
                        onChange={(e) => setForm({ ...form, project: e.target.value, linked_phase: "", linked_sub_stage: "", linked_sub_level: "" })}
                        >
                        <option value="">None</option>
                        {(projects ?? []).map((p) => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                        </select>
                      </div>
                      
                      <div>
                        <Label>Phase</Label>
                        <select
                        className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm disabled:opacity-50"
                        value={form.linked_phase}
                        onChange={(e) => setForm({ ...form, linked_phase: e.target.value, linked_sub_stage: "", linked_sub_level: "" })}
                        disabled={!form.project || !selectedProjectDetail?.phases?.length}
                        >
                        <option value="">None</option>
                        {(selectedProjectDetail?.phases ?? []).map((ph: any) => (
                            <option key={ph.id} value={ph.id}>{ph.title}</option>
                        ))}
                        </select>
                      </div>
                      
                      <div>
                        <Label>Sub Stage</Label>
                        <select
                        className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm disabled:opacity-50"
                        value={form.linked_sub_stage}
                        onChange={(e) => setForm({ ...form, linked_sub_stage: e.target.value, linked_sub_level: "" })}
                        disabled={!form.linked_phase}
                        >
                        <option value="">None</option>
                        {(selectedProjectDetail?.phases?.find((p:any) => p.id === Number(form.linked_phase))?.sub_stages ?? []).map((st: any) => (
                            <option key={st.id} value={st.id}>{st.title}</option>
                        ))}
                        </select>
                      </div>
                      
                      <div>
                        <Label>Sub Level</Label>
                        <select
                        className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm disabled:opacity-50"
                        value={form.linked_sub_level}
                        onChange={(e) => setForm({ ...form, linked_sub_level: e.target.value })}
                        disabled={!form.linked_sub_stage}
                        >
                        <option value="">None</option>
                        {(selectedProjectDetail?.phases?.find((p:any) => p.id === Number(form.linked_phase))?.sub_stages?.find((s:any) => s.id === Number(form.linked_sub_stage))?.sub_levels ?? []).map((sl: any) => (
                            <option key={sl.id} value={sl.id}>{sl.title}</option>
                        ))}
                        </select>
                      </div>
                  </div>
              </div>

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
                   <Label>Attachments</Label>
                   <div className="relative">
                      <input 
                        type="file" 
                        multiple 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                            if (e.target.files) {
                                setAttachments(Array.from(e.target.files));
                            }
                        }}
                      />
                      <div className="w-full rounded-lg border border-dashed border-card-border bg-card px-3 py-2 text-sm flex items-center justify-center gap-2 text-muted hover:bg-card-border transition-colors">
                          <UploadCloud size={16} />
                          {attachments.length > 0 ? `${attachments.length} file(s) selected` : "Drag or click to attach"}
                      </div>
                   </div>
                </div>
              </div>
              
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? "Creating..." : "Create Task"}
              </Button>
            </form>
          </Card>
        )}

        {tab === "kanban" && (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3 overflow-x-auto">
            {STATUSES.map((status) => (
              <div key={status} className="min-w-[200px]">
                <p className="text-xs font-semibold uppercase text-muted mb-2">{status.replace("_", " ")}</p>
                <div className="space-y-2">
                  {(kanban?.[status] ?? []).map((task) => (
                    <Card key={task.id} className="p-3 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedTask(task)}>
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.project_detail && <p className="text-[10px] text-primary mt-1">{task.project_detail.title}</p>}
                      {(isLead || task.assignee === user?.id) && status !== "done" && (
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

        {tab === "list" && (
          isLoading ? (
            <p className="text-muted">Loading tasks...</p>
          ) : !tasks?.length ? (
            <Card><p className="text-muted text-center py-8">No tasks assigned yet.</p></Card>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <Card key={task.id} className="flex items-start justify-between gap-4 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedTask(task)}>
                  <div>
                    <h3 className="font-medium">{task.title}</h3>
                    {task.description && <p className="text-sm text-muted mt-1 line-clamp-2">{task.description}</p>}
                    <div className="flex gap-2 items-center mt-2">
                        {task.project_detail && <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">{task.project_detail.title}</span>}
                        {task.attachments && task.attachments.length > 0 && (
                            <span className="text-xs text-muted flex items-center gap-1">
                                <Paperclip size={12}/> {task.attachments.length}
                            </span>
                        )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {(isLead || task.assignee === user?.id) && task.status !== "done" ? (
                        <select
                          className={cn("text-xs px-2 py-0.5 rounded-full capitalize border-none outline-none appearance-none cursor-pointer", statusColors[task.status] || statusColors.todo)}
                          value={task.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateStatus.mutate({ id: task.id, status: e.target.value })}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                        </select>
                    ) : (
                        <span className={cn("text-xs px-2 py-0.5 rounded-full capitalize", statusColors[task.status] || statusColors.todo)}>
                        {task.status.replace("_", " ")}
                        </span>
                    )}
                    <span className="text-xs capitalize">{task.priority}</span>
                    {task.due_date && <span className="text-xs text-muted">Due {task.due_date}</span>}
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
                      <h4 className="font-semibold mb-2 flex items-center gap-2"><Paperclip size={14}/> Attachments</h4>
                      <div className="flex flex-wrap gap-2">
                          {selectedTask.attachments.map((att: any) => (
                              <a key={att.id} href={att.file} target="_blank" rel="noopener noreferrer" className="text-xs bg-muted/20 px-3 py-1.5 rounded-lg border border-card-border hover:bg-muted/40 transition-colors">
                                  Attachment {att.id}
                              </a>
                          ))}
                      </div>
                  </div>
              )}

              {(isLead || selectedTask.assignee === user?.id) && (
                  <div className="pt-4 border-t border-card-border">
                      <label className="text-xs font-semibold text-muted mb-1 block">Update Status</label>
                      <select
                          className="w-full max-w-xs rounded-lg border border-card-border bg-card px-3 py-2 text-sm"
                          value={selectedTask.status}
                          onChange={(e) => {
                              updateStatus.mutate({ id: selectedTask.id, status: e.target.value });
                              setSelectedTask({ ...selectedTask, status: e.target.value });
                          }}
                      >
                          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ").toUpperCase()}</option>)}
                      </select>
                  </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
