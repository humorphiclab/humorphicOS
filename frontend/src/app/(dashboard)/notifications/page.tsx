"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { notificationsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data: items, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: notificationsApi.list });

  const readAll = useMutation({
    mutationFn: notificationsApi.readAll,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <>
      <TopBar title="Notifications" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => readAll.mutate()}>Mark all read</Button>
        </div>
        {isLoading ? (
          <p className="text-muted">Loading...</p>
        ) : !items?.length ? (
          <Card><p className="text-muted text-center py-8">No notifications.</p></Card>
        ) : (
          items.map((n) => (
            <Card key={n.id} className={cn(!n.is_read && "border-primary/30")}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-muted mt-1">{n.message}</p>
                  <p className="text-xs text-muted mt-2 capitalize">{n.notification_type}</p>
                </div>
                {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
