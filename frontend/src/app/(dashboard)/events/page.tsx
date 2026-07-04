"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { eventsApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { PartyPopper } from "lucide-react";

export default function EventsPage() {
  const qc = useQueryClient();
  const { data: events, isLoading } = useQuery({ queryKey: ["events"], queryFn: eventsApi.list });

  const registerMutation = useMutation({
    mutationFn: eventsApi.register,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  return (
    <>
      <TopBar title="Events & Workshops" />
      <div className="p-6 space-y-4">
        {isLoading ? (
          <p className="text-muted">Loading events...</p>
        ) : !events?.length ? (
          <Card><p className="text-muted text-center py-8">No events scheduled.</p></Card>
        ) : (
          events.map((ev) => (
            <Card key={ev.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <PartyPopper className="h-6 w-6 text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{ev.title}</p>
                    <p className="text-xs capitalize text-primary mt-0.5">{ev.event_type}</p>
                    <p className="text-sm text-muted mt-2 line-clamp-2">{ev.description}</p>
                    <p className="text-xs text-muted mt-2">{formatDate(ev.start_time)} · {ev.location || "Online"}</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => registerMutation.mutate(ev.slug)} disabled={registerMutation.isPending}>
                  Register
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
