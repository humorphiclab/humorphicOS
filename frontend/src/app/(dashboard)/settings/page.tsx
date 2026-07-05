"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { authApi, getStoredUser, apiFetch } from "@/lib/api";

export default function SettingsPage() {
  const user = getStoredUser();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: authApi.me });
  const profile = me || user;

  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwLoading(true);
    setPwMsg("");
    try {
      await apiFetch("/auth/change-password/", {
        method: "POST",
        body: JSON.stringify(pwForm),
      });
      setPwMsg("Password updated successfully.");
      setPwForm({ old_password: "", new_password: "" });
    } catch (err) {
      setPwMsg(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setPwLoading(false);
    }
  };

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
          <h3 className="font-semibold mb-4">Change Password</h3>
          <form onSubmit={changePassword} className="space-y-3 max-w-sm">
            <div>
              <Label>Current Password</Label>
              <Input type="password" value={pwForm.old_password} onChange={(e) => setPwForm({ ...pwForm, old_password: e.target.value })} required />
            </div>
            <div>
              <Label>New Password</Label>
              <Input type="password" value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} minLength={8} required />
            </div>
            {pwMsg && <p className="text-sm text-muted">{pwMsg}</p>}
            <Button type="submit" size="sm" disabled={pwLoading}>{pwLoading ? "Saving..." : "Update Password"}</Button>
          </form>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Integrations</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span>Google OAuth</span>
              <span className="text-xs text-muted">{process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? "Configured" : "Set NEXT_PUBLIC_GOOGLE_CLIENT_ID"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>OpenAI (AI Assistant)</span>
              <span className="text-xs text-muted">Set OPENAI_API_KEY in backend .env</span>
            </div>
            <div className="flex justify-between items-center">
              <span>WhatsApp</span>
              <span className="text-xs text-warning">Configure WHATSAPP_API_URL</span>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
