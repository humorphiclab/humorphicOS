"use client";

import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { meetingsApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export default function MeetingsPage() {
  const { data: meetings, isLoading } = useQuery({
    queryKey: ["meetings-upcoming"],
    queryFn: meetingsApi.upcoming,
  });

  return (
    <>
      <TopBar title="Meetings" />
      <div className="p-6">
        {isLoading ? (
          <p className="text-muted">Loading meetings...</p>
        ) : !meetings?.length ? (
          <Card>
            <p className="text-muted text-center py-8">No upcoming meetings scheduled.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <Card key={meeting.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{meeting.title}</h3>
                    <p className="text-sm text-muted mt-1">
                      {formatDate(meeting.start_time)} — {formatDate(meeting.end_time)}
                    </p>
                    {meeting.agenda && (
                      <p className="text-sm mt-3 text-muted">{meeting.agenda}</p>
                    )}
                  </div>
                  {meeting.meet_link && (
                    <a
                      href={meeting.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline shrink-0"
                    >
                      Join <ExternalLink className="h-3.5 w-3.5" />
                    </a>
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
