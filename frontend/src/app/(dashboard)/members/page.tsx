"use client";

import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { membersApi } from "@/lib/api";

export default function MembersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: membersApi.list,
  });

  const members = data?.results ?? [];

  return (
    <>
      <TopBar title="Members" />
      <div className="p-6">
        {isLoading ? (
          <p className="text-muted">Loading members...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {members.map((member) => (
              <Card key={member.id}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                    {member.first_name?.[0]}
                    {member.last_name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {member.first_name} {member.last_name}
                    </p>
                    <p className="text-xs text-muted truncate">{member.email}</p>
                    <p className="text-xs text-primary mt-0.5">
                      {member.role?.name || "Member"}
                    </p>
                  </div>
                </div>
                {(member.branch || member.college) && (
                  <p className="text-xs text-muted mt-3 truncate">
                    {[member.branch, member.college].filter(Boolean).join(" · ")}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
