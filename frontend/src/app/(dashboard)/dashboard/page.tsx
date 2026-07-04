"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CheckSquare,
  Clock,
  Calendar,
  AlertCircle,
  Megaphone,
} from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/components/layout/sidebar";
import { StatCard, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: authApi.dashboard,
  });

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="p-6 space-y-6">
        {!stats?.has_daily_update_today && (
          <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
            <AlertCircle className="h-5 w-5 text-warning shrink-0" />
            <p className="text-sm flex-1">
              You haven&apos;t submitted today&apos;s daily update yet.
            </p>
            <Link href="/daily-updates">
              <Button size="sm">Submit now</Button>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Today's Tasks"
            value={isLoading ? "—" : stats?.today_tasks ?? 0}
            icon={<Clock className="h-5 w-5" />}
            accent="warning"
          />
          <StatCard
            title="Pending Tasks"
            value={isLoading ? "—" : stats?.pending_tasks ?? 0}
            icon={<CheckSquare className="h-5 w-5" />}
            accent="primary"
          />
          <StatCard
            title="Completed"
            value={isLoading ? "—" : stats?.completed_tasks ?? 0}
            icon={<CheckSquare className="h-5 w-5" />}
            accent="success"
          />
          <StatCard
            title="Upcoming Meetings"
            value={isLoading ? "—" : stats?.upcoming_meetings?.length ?? 0}
            icon={<Calendar className="h-5 w-5" />}
            accent="accent"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Upcoming Meetings
            </h3>
            {stats?.upcoming_meetings?.length ? (
              <ul className="space-y-3">
                {stats.upcoming_meetings.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-card-border px-3 py-2.5"
                  >
                    <span className="text-sm font-medium">{m.title}</span>
                    <span className="text-xs text-muted">{formatDate(m.start_time)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No upcoming meetings</p>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              Announcements
            </h3>
            {stats?.announcements?.length ? (
              <ul className="space-y-3">
                {stats.announcements.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-card-border px-3 py-2.5"
                  >
                    <p className="text-sm font-medium">{a.title}</p>
                    <span className="text-xs text-muted capitalize">{a.priority}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No announcements</p>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/tasks", label: "View Tasks" },
            { href: "/projects", label: "Projects" },
            { href: "/daily-updates", label: "Daily Update" },
            { href: "/meetings", label: "Meetings" },
          ].map(({ href, label }) => (
            <Link key={href} href={href}>
              <Button variant="secondary" className="w-full">
                {label}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
