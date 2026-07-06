"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { projectsApi } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { ArrowLeft, Calendar, User, Users, CheckSquare, Layers, Clock, Award, Star } from "lucide-react";

const healthColors: Record<string, string> = {
  on_track: "text-success bg-success/10 border-success/20",
  at_risk: "text-warning bg-warning/10 border-warning/20",
  off_track: "text-danger bg-danger/10 border-danger/20",
};

const statusColors: Record<string, string> = {
  active: "bg-primary/15 text-primary border-primary/20",
  completed: "bg-success/15 text-success border-success/20",
  on_hold: "bg-warning/15 text-warning border-warning/20",
  planning: "bg-muted/30 text-muted border-muted/40",
};

export default function ProjectsPage() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const { data: projectsList, isLoading: listLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
  });

  const { data: projectDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ["project-details", selectedSlug],
    queryFn: () => projectsApi.detail(selectedSlug!),
    enabled: !!selectedSlug,
  });

  const projects = projectsList ?? [];

  if (selectedSlug) {
    return (
      <>
        <TopBar title={projectDetails?.title || "Project Details"} />
        <div className="p-6 max-w-5xl space-y-6">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedSlug(null)}
            className="gap-2 mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Projects
          </Button>

          {detailsLoading ? (
            <div className="p-8 text-center text-muted text-sm">
              Loading project details...
            </div>
          ) : !projectDetails ? (
            <Card>
              <p className="text-muted text-center py-8">Project not found.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize", statusColors[projectDetails.status])}>
                      {projectDetails.status.replace("_", " ")}
                    </span>
                    <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize", healthColors[projectDetails.health])}>
                      {projectDetails.health.replace("_", " ")}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{projectDetails.title}</h2>
                    {projectDetails.description ? (
                      <p className="text-sm text-muted mt-3 whitespace-pre-wrap leading-relaxed">
                        {projectDetails.description}
                      </p>
                    ) : (
                      <p className="text-sm text-muted mt-3 italic">No description provided.</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between text-sm font-medium mb-1.5">
                      <span className="text-muted">Completion Progress</span>
                      <span>{projectDetails.completion_percentage}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-card-border overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${projectDetails.completion_percentage}%` }}
                      />
                    </div>
                  </div>
                </Card>

                {/* Milestones Card */}
                <Card>
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-primary">
                    <Award className="h-5 w-5" /> Project Milestones
                  </h3>
                  {!projectDetails.milestones || projectDetails.milestones.length === 0 ? (
                    <p className="text-xs text-muted py-4 text-center">No milestones added yet.</p>
                  ) : (
                    <div className="space-y-4 relative border-l border-card-border pl-5 ml-2.5">
                      {projectDetails.milestones.map((m) => (
                        <div key={m.id} className="relative">
                          {/* Dot status icon */}
                          <span className={cn(
                            "absolute -left-[30px] top-0.5 rounded-full p-0.5 border bg-card",
                            m.is_completed ? "text-success border-success/30" : "text-muted border-card-border"
                          )}>
                            <CheckSquare className="h-4 w-4" />
                          </span>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={cn("font-medium text-sm", m.is_completed ? "line-through text-muted" : "text-foreground")}>
                                {m.title}
                              </p>
                              {m.is_completed && (
                                <span className="text-[10px] bg-success/15 text-success font-semibold px-2 py-0.5 rounded-full">
                                  Completed
                                </span>
                              )}
                            </div>
                            {m.description && <p className="text-xs text-muted mt-1">{m.description}</p>}
                            {m.due_date && (
                              <p className="text-[10px] text-muted mt-1.5 flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" /> Due: {m.due_date}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                <Card className="space-y-4">
                  <h3 className="font-semibold text-sm border-b border-card-border pb-2">Details</h3>
                  
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted flex items-center gap-1.5"><User className="h-4 w-4" /> Lead/Owner</span>
                      <span className="font-medium text-foreground">
                        {projectDetails.owner_detail ? `${projectDetails.owner_detail.first_name} ${projectDetails.owner_detail.last_name}` : "Admin"}
                      </span>
                    </div>

                    {projectDetails.department_detail && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted flex items-center gap-1.5"><Layers className="h-4 w-4" /> Department</span>
                        <span className="font-medium text-foreground">{projectDetails.department_detail.name}</span>
                      </div>
                    )}

                    {projectDetails.team_detail && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted flex items-center gap-1.5"><Users className="h-4 w-4" /> Team</span>
                        <span className="font-medium text-foreground">{projectDetails.team_detail.name}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-muted flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Timeline</span>
                      <span className="font-medium text-foreground">
                        {projectDetails.start_date ? formatDate(projectDetails.start_date) : "—"} to {projectDetails.end_date ? formatDate(projectDetails.end_date) : "—"}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Team Members List */}
                <Card>
                  <h3 className="font-semibold text-sm border-b border-card-border pb-2 flex items-center gap-1.5 mb-3">
                    <Users className="h-4 w-4 text-primary" /> Members ({(projectDetails.members_detail ?? []).length})
                  </h3>
                  {!projectDetails.members_detail || projectDetails.members_detail.length === 0 ? (
                    <p className="text-xs text-muted text-center py-2">No team members assigned.</p>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {projectDetails.members_detail.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 text-xs">
                          <div className="rounded-full bg-primary/10 p-1.5"><User className="h-3.5 w-3.5 text-primary" /></div>
                          <div className="truncate">
                            <p className="font-medium text-foreground">{m.first_name} {m.last_name}</p>
                            <p className="text-[10px] text-muted">{m.role?.name || "Member"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Projects" />
      <div className="p-6">
        {listLoading ? (
          <p className="text-muted">Loading projects...</p>
        ) : projects.length === 0 ? (
          <Card>
            <p className="text-muted text-center py-8">No projects yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => setSelectedSlug(project.slug)}
                className="cursor-pointer group"
              >
                <Card className="hover:border-primary/50 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">{project.title}</h3>
                    <span className={cn("text-[10px] font-semibold border capitalize px-2 py-0.5 rounded-full", statusColors[project.status])}>
                      {project.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-muted">Progress</span>
                      <span>{project.completion_percentage}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-card-border overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${project.completion_percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className={cn("text-[10px] font-semibold capitalize px-2 py-0.5 rounded-full border", healthColors[project.health])}>
                        {project.health.replace("_", " ")}
                      </span>
                      {project.task_count !== undefined && (
                        <span className="text-[10px] text-muted">{project.task_count} tasks</span>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
