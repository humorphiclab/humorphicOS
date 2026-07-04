"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { dailyUpdatesApi } from "@/lib/api";

export default function DailyUpdatesPage() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: existing, isLoading } = useQuery({
    queryKey: ["daily-update-today"],
    queryFn: dailyUpdatesApi.today,
  });

  const [form, setForm] = useState({
    work_done: "",
    hours_worked: "2",
    challenges: "",
    learning: "",
    tomorrow_plan: "",
    need_help: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      dailyUpdatesApi.create({
        date: today,
        work_done: form.work_done,
        hours_worked: parseFloat(form.hours_worked),
        challenges: form.challenges,
        learning: form.learning,
        tomorrow_plan: form.tomorrow_plan,
        need_help: form.need_help,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-update-today"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (isLoading) {
    return (
      <>
        <TopBar title="Daily Update" />
        <div className="p-6 text-muted">Loading...</div>
      </>
    );
  }

  if (existing) {
    return (
      <>
        <TopBar title="Daily Update" />
        <div className="p-6 max-w-2xl">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Today&apos;s Update Submitted</h3>
              <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-full">
                Complete
              </span>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted mb-1">Work Done</p>
                <p>{existing.work_done}</p>
              </div>
              <div>
                <p className="text-muted mb-1">Hours Worked</p>
                <p>{existing.hours_worked}h</p>
              </div>
              {existing.challenges && (
                <div>
                  <p className="text-muted mb-1">Challenges</p>
                  <p>{existing.challenges}</p>
                </div>
              )}
              {existing.tomorrow_plan && (
                <div>
                  <p className="text-muted mb-1">Tomorrow&apos;s Plan</p>
                  <p>{existing.tomorrow_plan}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Daily Update" />
      <div className="p-6 max-w-2xl">
        <Card>
          <h3 className="font-semibold mb-4">Submit Daily Work Update</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="work_done">Today&apos;s Work *</Label>
              <Textarea
                id="work_done"
                value={form.work_done}
                onChange={(e) => update("work_done", e.target.value)}
                placeholder="What did you work on today?"
                required
              />
            </div>

            <div>
              <Label htmlFor="hours">Hours Worked</Label>
              <Input
                id="hours"
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={form.hours_worked}
                onChange={(e) => update("hours_worked", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="challenges">Challenges</Label>
              <Textarea
                id="challenges"
                value={form.challenges}
                onChange={(e) => update("challenges", e.target.value)}
                placeholder="Any blockers or challenges?"
              />
            </div>

            <div>
              <Label htmlFor="learning">Learning</Label>
              <Textarea
                id="learning"
                value={form.learning}
                onChange={(e) => update("learning", e.target.value)}
                placeholder="What did you learn?"
              />
            </div>

            <div>
              <Label htmlFor="tomorrow">Tomorrow&apos;s Plan</Label>
              <Textarea
                id="tomorrow"
                value={form.tomorrow_plan}
                onChange={(e) => update("tomorrow_plan", e.target.value)}
                placeholder="What will you work on tomorrow?"
              />
            </div>

            <div>
              <Label htmlFor="help">Need Help</Label>
              <Textarea
                id="help"
                value={form.need_help}
                onChange={(e) => update("need_help", e.target.value)}
                placeholder="Anything you need help with?"
              />
            </div>

            {mutation.isError && (
              <p className="text-sm text-danger">
                {mutation.error instanceof Error ? mutation.error.message : "Failed to submit"}
              </p>
            )}

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting..." : "Submit Update"}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
