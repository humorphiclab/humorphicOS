"use client";

import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { tasksApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  todo: "bg-muted/20 text-muted",
  in_progress: "bg-primary/20 text-primary",
  review: "bg-warning/20 text-warning",
  done: "bg-success/20 text-success",
  blocked: "bg-danger/20 text-danger",
};

const priorityColors: Record<string, string> = {
  low: "text-muted",
  medium: "text-accent",
  high: "text-warning",
  urgent: "text-danger",
};

export default function TasksPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: tasksApi.myTasks,
  });

  const tasks = data?.results ?? [];

  return (
    <>
      <TopBar title="My Tasks" />
      <div className="p-6">
        {isLoading ? (
          <p className="text-muted">Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <Card>
            <p className="text-muted text-center py-8">No tasks assigned yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <Card key={task.id} className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium">{task.title}</h3>
                  {task.description && (
                    <p className="text-sm text-muted mt-1 line-clamp-2">{task.description}</p>
                  )}
                  {task.project_detail && (
                    <p className="text-xs text-muted mt-2">{task.project_detail.title}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full capitalize",
                      statusColors[task.status] || statusColors.todo
                    )}
                  >
                    {task.status.replace("_", " ")}
                  </span>
                  <span className={cn("text-xs capitalize", priorityColors[task.priority])}>
                    {task.priority}
                  </span>
                  {task.due_date && (
                    <span className="text-xs text-muted">Due {task.due_date}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
