"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { organizationsApi, eventsApi } from "@/lib/api";
import { Bot, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PublicPortalPage() {
  const { data: orgs } = useQuery({ queryKey: ["public-orgs"], queryFn: organizationsApi.public });
  const { data: events } = useQuery({
    queryKey: ["public-events"],
    queryFn: eventsApi.publicList,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-card-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary p-2"><Bot className="h-5 w-5 text-white" /></div>
          <span className="font-bold">HumorphicOS</span>
        </div>
        <Link href="/login"><Button size="sm">Sign In</Button></Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl font-bold mb-4">Humorphic Robotics Club</h1>
        <p className="text-muted text-lg mb-8 max-w-2xl mx-auto">
          AI-powered platform for robotics clubs — manage projects, tasks, events, and member operations in one place.
        </p>
        <Link href="/register"><Button size="lg" className="gap-2">Join the Club <ArrowRight className="h-4 w-4" /></Button></Link>
        <p className="mt-4 text-sm text-muted">
          <Link href="/verify" className="text-primary hover:underline">Verify a certificate</Link>
        </p>
      </main>

      <section className="max-w-4xl mx-auto px-6 pb-16 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="font-semibold mb-4">Organizations</h2>
          <div className="space-y-3">
            {(orgs ?? []).map((org) => (
              <div key={org.id} className="rounded-xl border border-card-border bg-card p-4">
                <p className="font-medium">{org.name}</p>
                <p className="text-sm text-muted mt-1">{org.description}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-4">Upcoming Events</h2>
          <div className="space-y-3">
            {(events ?? []).filter((e) => e.is_public).slice(0, 5).map((ev) => (
              <div key={ev.id} className="rounded-xl border border-card-border bg-card p-4">
                <p className="font-medium">{ev.title}</p>
                <p className="text-xs capitalize text-primary mt-1">{ev.event_type}</p>
                <p className="text-sm text-muted mt-1">{ev.location}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
