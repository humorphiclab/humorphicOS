"use client";

import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { organizationsApi } from "@/lib/api";
import { Globe } from "lucide-react";

export default function OrganizationsPage() {
  const { data: orgs, isLoading } = useQuery({ queryKey: ["organizations"], queryFn: organizationsApi.list });

  return (
    <>
      <TopBar title="Organizations" />
      <div className="p-6 space-y-4">
        <p className="text-sm text-muted">Multi-organization support for clubs, societies, startups, and labs.</p>
        {isLoading ? (
          <p className="text-muted">Loading...</p>
        ) : (orgs ?? []).map((org) => (
          <Card key={org.id}>
            <div className="flex items-center gap-3">
              <Globe className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold">{org.name}</p>
                <p className="text-sm text-muted mt-1">{org.description}</p>
                {org.website && <a href={org.website} className="text-xs text-primary hover:underline mt-1 block">{org.website}</a>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
