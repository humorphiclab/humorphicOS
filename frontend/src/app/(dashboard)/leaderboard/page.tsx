"use client";

import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { gamificationApi } from "@/lib/api";
import { Trophy, Star } from "lucide-react";

export default function LeaderboardPage() {
  const { data: leaderboard, isLoading } = useQuery({ queryKey: ["leaderboard"], queryFn: gamificationApi.leaderboard });
  const { data: myProfile } = useQuery({ queryKey: ["my-gamification"], queryFn: gamificationApi.me });
  const { data: badges } = useQuery({ queryKey: ["badges"], queryFn: gamificationApi.badges });

  return (
    <>
      <TopBar title="Leaderboard & Gamification" />
      <div className="p-6 space-y-6">
        {myProfile && (
          <Card className="flex items-center gap-4">
            <div className="rounded-full bg-primary/20 p-4"><Trophy className="h-8 w-8 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">Level {myProfile.level}</p>
              <p className="text-muted">{myProfile.xp} XP · {myProfile.tasks_completed} tasks completed</p>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Trophy className="h-4 w-4 text-warning" /> Top Members</h3>
            {isLoading ? <p className="text-muted text-sm">Loading...</p> : (
              <ol className="space-y-2">
                {(leaderboard ?? []).map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 text-sm">
                    <span className="w-6 text-center font-bold text-muted">{i + 1}</span>
                    <span className="flex-1">{p.user_detail?.first_name} {p.user_detail?.last_name}</span>
                    <span className="text-primary font-medium">{p.xp} XP</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Star className="h-4 w-4 text-accent" /> Badges</h3>
            <div className="grid grid-cols-2 gap-2">
              {(badges ?? []).map((b) => (
                <div key={b.id} className="rounded-lg border border-card-border p-3 text-center">
                  <p className="font-medium text-sm">{b.name}</p>
                  <p className="text-xs text-muted mt-1">{b.xp_required} XP required</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
