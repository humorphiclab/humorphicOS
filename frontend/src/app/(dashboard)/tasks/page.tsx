"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { apiFetch, getStoredUser, membersApi, projectsApi, tasksApi } from "@/lib/api";
import { cn } from "@/lib/utils";

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
  const isLead = user?.role?.is_leadership || false;
  const [tab, setTab] = useState<"list" | "kanban" | "create">("list");
  const tabs: ("list" | "kanban" | "create")[] = isLead ? ["list", "kanban", "create"] : ["list", "kanban"];
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", assignee: "", project: "" });

  const { data: tasks, isLoading } = useQuery({ queryKey: ["my-tasks"], queryFn: tasksApi.myTasks });
  const { data: kanban } = useQuery({ queryKey: ["kanban"], queryFn: () => tasksApi.kanban(), enabled: tab === "kanban" });
  const { data: members } = useQuery({ queryKey: ["members"], queryFn: membersApi.list, enabled: isLead });
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list, enabled: isLead });

  const createTask = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/tasks/", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
      qc.invalidateQueries({ queryKey: ["kanban"] });
      setTab("list");
      setForm({ title: "", description: "", priority: "medium", assignee: "", project: "" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch(`/tasks/${id}/status/`, { method: "PATCH", body: JSON.stringify({ status }) }),
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

        {tab === "create" && isLead && (
          <Card>
            <h3 className="font-semibold mb-4">Assign New Task</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTask.mutate({
                  title: form.title,
                  description: form.description,
                  priority: form.priority,
                  assignee: form.assignee ? Number(form.assignee) : undefined,
                  project: form.project ? Number(form.project) : undefined,
                  status: "todo",
                });
              }}
              className="space-y-4 max-w-lg"
            >
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
                  <Label>Assign to</Label>
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
              </div>
              <div>
                <Label>Project</Label>
                <select
                  className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm"
                  value={form.project}
                  onChange={(e) => setForm({ ...form, project: e.target.value })}
                >
                  <option value="">No project</option>
                  {(projects ?? []).map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={createTask.isPending}>Create Task</Button>
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
                    <Card key={task.id} className="p-3">
                      <p className="text-sm font-medium">{task.title}</p>
                      {isLead && status !== "done" && (
                        <select
                          className="mt-2 w-full text-xs rounded border border-card-border bg-card px-1 py-0.5"
                          value={status}
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
                <Card key={task.id} className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium">{task.title}</h3>
                    {task.description && <p className="text-sm text-muted mt-1 line-clamp-2">{task.description}</p>}
                    {task.project_detail && <p className="text-xs text-muted mt-2">{task.project_detail.title}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full capitalize", statusColors[task.status] || statusColors.todo)}>
                      {task.status.replace("_", " ")}
                    </span>
                    <span className="text-xs capitalize">{task.priority}</span>
                    {task.due_date && <span className="text-xs text-muted">Due {task.due_date}</span>}
                  </div>
                </Card>
              ))}
            </div>
          )
        )}
      </div>
    </>
  );
}
