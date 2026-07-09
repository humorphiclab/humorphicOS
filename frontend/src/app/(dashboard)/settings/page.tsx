"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { authApi, getStoredUser, apiFetch, notificationsApi, NotificationPreference } from "@/lib/api";


export default function SettingsPage() {
  const user = getStoredUser();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: authApi.me });
  const profile = me || user;

  const queryClient = useQueryClient();
  const { data: prefs, isLoading: prefsLoading } = useQuery({
    queryKey: ["notificationPreferences"],
    queryFn: notificationsApi.getPreferences,
  });

  const updatePrefMutation = useMutation({
    mutationFn: (newPrefs: Partial<NotificationPreference>) => notificationsApi.updatePreferences(newPrefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationPreferences"] });
    },
  });

  const handleToggle = (key: keyof NotificationPreference) => {
    if (!prefs) return;
    updatePrefMutation.mutate({ [key]: !prefs[key] });
  };

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

        <Card className="p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-lg">Notification Preferences</h3>
            <p className="text-sm text-muted">Configure how and where you receive notifications.</p>
          </div>
          {prefsLoading ? (
            <p className="text-sm text-muted">Loading preferences...</p>
          ) : !prefs ? (
            <p className="text-sm text-warning">Could not load notification preferences.</p>
          ) : (
            <div className="space-y-6">
              {/* Category: Tasks */}
              <div>
                <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Tasks</h4>
                <div className="divide-y divide-border border rounded-lg overflow-hidden bg-card text-sm">
                  {[
                    { key: "task_assigned", title: "Task Assigned", desc: "When a task is assigned to you" },
                    { key: "task_review", title: "Task Review", desc: "When a task is sent or received for review" },
                    { key: "task_completed", title: "Task Completed", desc: "When a task is completed" },
                    { key: "task_needs_changes", title: "Revision Request", desc: "When a task needs revisions" },
                  ].map((item) => (
                    <div key={item.key} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                      <div>
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted mt-0.5">{item.desc}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted">In-App</span>
                          <Switch
                            checked={!!prefs[`in_app_${item.key}` as keyof NotificationPreference]}
                            onChange={() => handleToggle(`in_app_${item.key}` as keyof NotificationPreference)}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted">Email</span>
                          <Switch
                            checked={!!prefs[`email_${item.key}` as keyof NotificationPreference]}
                            onChange={() => handleToggle(`email_${item.key}` as keyof NotificationPreference)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category: Messages */}
              <div>
                <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Messages & Mentions</h4>
                <div className="divide-y divide-border border rounded-lg overflow-hidden bg-card text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                    <div>
                      <p className="font-medium text-foreground">Direct Messages & Channel Mentions</p>
                      <p className="text-xs text-muted mt-0.5">When someone messages you directly or mentions you in a channel</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">In-App</span>
                        <Switch
                          checked={!!prefs.in_app_messages}
                          onChange={() => handleToggle("in_app_messages")}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">Email</span>
                        <Switch
                          checked={!!prefs.email_messages}
                          onChange={() => handleToggle("email_messages")}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category: Meetings */}
              <div>
                <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Meetings</h4>
                <div className="divide-y divide-border border rounded-lg overflow-hidden bg-card text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                    <div>
                      <p className="font-medium text-foreground">Meeting Updates</p>
                      <p className="text-xs text-muted mt-0.5">When a meeting is scheduled, updated, or cancelled</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">In-App</span>
                        <Switch
                          checked={!!prefs.in_app_meetings}
                          onChange={() => handleToggle("in_app_meetings")}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">Email</span>
                        <Switch
                          checked={!!prefs.email_meetings}
                          onChange={() => handleToggle("email_meetings")}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
    </label>
  );
}
