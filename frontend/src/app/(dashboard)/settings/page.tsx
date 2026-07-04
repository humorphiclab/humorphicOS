"use client";

import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { authApi, getStoredUser } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const user = getStoredUser();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: authApi.me });
  const profile = me || user;

  return (
    <>
      <TopBar title="Settings" />
      <div className="p-6 max-w-2xl space-y-6">
        <Card>
          <h3 className="font-semibold mb-4">Profile</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Name</dt><dd>{profile?.first_name} {profile?.last_name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Email</dt><dd>{profile?.email}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Role</dt><dd>{profile?.role?.name || "Member"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">College</dt><dd>{profile?.college || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Branch</dt><dd>{profile?.branch || "—"}</dd></div>
          </dl>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Integrations</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span>Google OAuth</span>
              <span className="text-xs text-muted">Configure GOOGLE_CLIENT_ID in .env</span>
            </div>
            <div className="flex justify-between items-center">
              <span>OpenAI (AI Assistant)</span>
              <span className="text-xs text-muted">Configure OPENAI_API_KEY in .env</span>
            </div>
            <div className="flex justify-between items-center">
              <span>WhatsApp (Future)</span>
              <span className="text-xs text-warning">Phase 3</span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Security</h3>
          <Button variant="secondary" size="sm">Change Password</Button>
        </Card>
      </div>
    </>
  );
}
