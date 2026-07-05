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

export default function ProjectsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
  });

  const projects = data ?? [];

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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
      </div>
    </>
  );
}
