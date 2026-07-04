"use client";

import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { calendarApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const typeLabels: Record<string, string> = {
  meeting: "Meeting", task: "Task", event: "Event", holiday: "Holiday", leave: "Leave",
};

export default function CalendarPage() {
  const { data, isLoading } = useQuery({ queryKey: ["calendar"], queryFn: () => calendarApi.events() });

  return (
    <>
      <TopBar title="Calendar" />
      <div className="p-6">
        {isLoading ? (
          <p className="text-muted">Loading calendar...</p>
        ) : !data?.events?.length ? (
          <Card><p className="text-muted text-center py-8">No events in this range.</p></Card>
        ) : (
          <div className="space-y-3">
            {data.events.map((ev) => (
              <Card key={ev.id} className="flex items-center gap-4">
                <div className="w-1 h-12 rounded-full" style={{ background: ev.color }} />
                <div className="flex-1">
                  <p className="font-medium">{ev.title}</p>
                  <p className="text-xs text-muted capitalize">{typeLabels[ev.type] || ev.type}</p>
                </div>
                <p className="text-sm text-muted">{String(ev.start).slice(0, 10)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
