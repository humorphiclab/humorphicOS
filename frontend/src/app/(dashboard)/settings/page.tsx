"use client";

import { useState, useEffect } from "react";
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

  const [emailForm, setEmailForm] = useState({
    email_type: "primary" as "primary" | "secondary",
    recipient: profile?.email || "",
    subject: "SMTP Verification - HumorphicOS",
    body: "Hi! This is a test email sent from the HumorphicOS administration panel to confirm that SMTP connections are working properly.",
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.email && !emailForm.recipient) {
      setEmailForm((prev) => ({ ...prev, recipient: profile.email }));
    }
  }, [profile?.email]);

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailSuccess(null);
    setEmailError(null);
    try {
      const res = await notificationsApi.sendTestEmail(emailForm);
      setEmailSuccess(res.detail);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setEmailLoading(false);
    }
  };

  const isAuthorizedToTestEmail = profile?.is_superuser || (profile?.role && ["founder", "super_admin", "president"].includes(profile.role.slug));

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

        {isAuthorizedToTestEmail && (
          <Card className="p-6 border-primary/20 bg-card/50 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Connection Verification
            </h3>
            <p className="text-xs text-muted mb-4">
              Test and verify SMTP server settings for both primary and secondary mailing channels. (Only available to President & above)
            </p>

            <form onSubmit={handleSendTestEmail} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email_type">SMTP Connection</Label>
                  <select
                    id="email_type"
                    value={emailForm.email_type}
                    onChange={(e) => setEmailForm({ ...emailForm, email_type: e.target.value as "primary" | "secondary" })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="primary">Primary (Hotmail - humorphic.labs@hotmail.com)</option>
                    <option value="secondary">Secondary (Gmail - humorphic.labs@gmail.com)</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="recipient">Recipient Address</Label>
                  <Input
                    id="recipient"
                    type="email"
                    value={emailForm.recipient}
                    onChange={(e) => setEmailForm({ ...emailForm, recipient: e.target.value })}
                    placeholder="recipient@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="body">Message Body</Label>
                <textarea
                  id="body"
                  value={emailForm.body}
                  onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              </div>

              {emailSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{emailSuccess}</span>
                </div>
              )}

              {emailError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-semibold">SMTP Test Failed:</span>
                  </div>
                  <pre className="text-xs bg-black/40 p-2.5 rounded border border-white/5 overflow-x-auto font-mono max-h-36 select-text whitespace-pre-wrap">
                    {emailError}
                  </pre>
                </div>
              )}

              <Button type="submit" size="sm" className="w-full sm:w-auto" disabled={emailLoading}>
                {emailLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying connection...
                  </>
                ) : (
                  "Send Verification Email"
                )}
              </Button>
            </form>
          </Card>
        )}

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
