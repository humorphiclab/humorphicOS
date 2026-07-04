"use client";

import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { announcementsApi } from "@/lib/api";
import { Megaphone, Pin } from "lucide-react";

export default function AnnouncementsPage() {
  const { data: items, isLoading } = useQuery({ queryKey: ["announcements"], queryFn: announcementsApi.list });

  return (
    <>
      <TopBar title="Announcements" />
      <div className="p-6 space-y-4">
        {isLoading ? (
          <p className="text-muted">Loading...</p>
        ) : !items?.length ? (
          <Card><p className="text-muted text-center py-8">No announcements.</p></Card>
        ) : (
          items.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start gap-3">
                {a.is_pinned ? <Pin className="h-4 w-4 text-warning shrink-0 mt-0.5" /> : <Megaphone className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{a.title}</p>
                    <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-primary/15 text-primary">{a.priority}</span>
                  </div>
                  <p className="text-sm text-muted mt-2">{a.content}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
