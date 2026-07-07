"use client";

import { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Upload, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { authApi, setStoredTokens, setStoredUser } from "@/lib/api";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const BRANCHES = ["CS AI", "CS", "Mechanical", "Civil", "Electrical"];

/**
 * India academic calendar: Sep–Mar = odd sem, Apr–Aug = even sem.
 * Returns "Graduated" if the batch end year has already passed.
 */
function getAcademicStatus(sy: number, ey: number): { year: number | string; sem: number | string } | null {
  const now = new Date();
  const m = now.getMonth();          // 0=Jan … 11=Dec
  const cy = now.getFullYear();
  const sepYr = m >= 8 ? cy : cy - 1;   // calendar year of last September

  if (sepYr >= ey) return { year: "Graduated", sem: "-" };
  if (sepYr < sy) return null;          // batch not started

  const year = sepYr - sy + 1;
  const sem = 2 * (year - 1) + (m >= 8 || m <= 2 ? 1 : 2);
  return { year, sem };
}

export default function RegisterPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    email: "", phone: "", username: "", password: "",
    first_name: "", last_name: "",
    enrollment_number: "", college: "",
    branch: "CS AI", start_year: "", end_year: "",
    skills: "", linkedin: "", github: "",
  });

  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gMode, setGMode] = useState(false); // Google one-tap mode

  const status = useMemo(() => {
    const sy = parseInt(form.start_year, 10);
    const ey = parseInt(form.end_year, 10);
    if (isNaN(sy) || form.start_year.length !== 4) return null;
    return getAcademicStatus(sy, isNaN(ey) ? 9999 : ey);
  }, [form.start_year, form.end_year]);

  const up = (patch: Partial<typeof form>) => setForm(p => ({ ...p, ...patch }));

  const onStartYear = (v: string) => {
    const n = parseInt(v, 10);
    up({ start_year: v, ...(v.length === 4 && !isNaN(n) ? { end_year: String(n + 4) } : {}) });
  };
  const onEndYear = (v: string) => {
    const n = parseInt(v, 10);
    up({ end_year: v, ...(v.length === 4 && !isNaN(n) ? { start_year: String(n - 4) } : {}) });
  };

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setAvatar(f); setPreview(URL.createObjectURL(f)); }
  };

  const onGoogle = async (idToken: string) => {
    setError(""); setLoading(true);
    try {
      const { tokens, user } = await authApi.googleLogin(idToken);
      setStoredTokens(tokens);
      setStoredUser(user as Parameters<typeof setStoredUser>[0]);
      setGMode(true);
      up({
        email: (user as any).email || "",
        first_name: (user as any).first_name || "",
        last_name: (user as any).last_name || "",
        username: (user as any).username || "",
        password: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally { setLoading(false); }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avatar && !gMode) { setError("Please upload a profile picture."); return; }
    if (!form.start_year || !form.end_year) { setError("Batch years are required."); return; }
    setError(""); setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (gMode && (k === "password" || k === "email")) return;
        if (k === "skills") fd.append(k, JSON.stringify(v.split(",").map(s => s.trim()).filter(Boolean)));
        else if (k === "github" && v) fd.append(k, `https://github.com/${v}`);
        else if (k === "linkedin" && v) fd.append(k, `https://linkedin.com/in/${v}`);
        else if (k !== "start_year" && k !== "end_year") fd.append(k, v);
      });
      fd.append("batch", `${form.start_year}-${form.end_year}`);
      if (avatar) fd.append("avatar", avatar);

      if (gMode) { await authApi.updateMe(fd); router.push("/dashboard"); }
      else { await authApi.register(fd); router.push("/login"); }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally { setLoading(false); }
  };

  const sel = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  /* ── badge colours ── */
  const isGrad = status?.year === "Graduated";
  const badgeCls = status
    ? isGrad
      ? "bg-amber-500/10 border-amber-500/25 text-amber-500"
      : "bg-primary/10 border-primary/25 text-primary"
    : "bg-muted/30 border-border text-muted-foreground";
  const dotCls = status
    ? isGrad ? "bg-amber-500" : "bg-primary animate-pulse"
    : "bg-muted-foreground/40";

  return (
    <div className="h-screen overflow-hidden flex w-full bg-background">

      {/* ════ LEFT IMAGE PANE ════ */}
      <aside className="hidden lg:flex w-[45%] shrink-0 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=2000&auto=format&fit=crop')" }} />
        <div className="absolute inset-0 bg-linear-to-br from-black/85 via-black/55 to-primary/40" />

        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-xl bg-primary p-2.5"><Bot className="h-7 w-7 text-white" /></div>
            <span className="font-bold text-xl tracking-tight text-white">HumorphicOS</span>
          </div>
        </div>

        <div className="relative z-10 p-10 pb-14">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">Build the future<br />of robotics.</h2>
          <p className="text-white/65 text-base leading-relaxed max-w-sm">
            Join our community of innovators, engineers and thinkers. Access club projects, resources and events.
          </p>
          <div className="flex gap-2 mt-8">
            <span className="h-2 w-8 rounded-full bg-primary" />
            <span className="h-2 w-2 rounded-full bg-white/30" />
            <span className="h-2 w-2 rounded-full bg-white/30" />
          </div>
        </div>
      </aside>

      {/* ════ RIGHT FORM PANE ════ */}
      <main className="flex-1 flex flex-col px-8 xl:px-14 py-7 overflow-hidden">

        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-4 shrink-0">
          <div className="inline-flex rounded-xl bg-primary p-2"><Bot className="h-5 w-5 text-white" /></div>
          <span className="font-bold text-base">HumorphicOS</span>
        </div>

        {/* Header */}
        <div className="shrink-0 mb-4">
          <h1 className="text-2xl font-bold">{gMode ? "Complete your profile" : "Create an account"}</h1>
          {!gMode && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">Log in</Link>
            </p>
          )}
          {gMode && (
            <div className="mt-2 flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-500 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              Google account linked — fill the remaining details to complete setup.
            </div>
          )}
          {error && (
            <div className="mt-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive font-medium">
              {error}
            </div>
          )}
        </div>

        {/* ── Form ── */}
        <form onSubmit={onSubmit} className="flex-1 min-h-0 flex flex-col gap-4">

          {/* ── Two-column field grid ── */}
          <div className="flex-1 min-h-0 grid grid-cols-2 gap-x-10 items-start">

            {/* ════ LEFT COLUMN ════ */}
            <div className="flex flex-col gap-3.5">

              {/* Avatar inline with label */}
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="relative h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden group hover:border-primary/60 transition-colors bg-muted/20 shrink-0 cursor-pointer">
                  {preview
                    ? <img src={preview} alt="avatar" className="h-full w-full object-cover" />
                    : <Upload className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary/60 transition-colors" />}
                  <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Plus className="h-4 w-4 text-white" />
                  </span>
                </button>
                <div>
                  <p className="text-xs font-semibold">Profile Photo <span className="text-destructive">*</span></p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{avatar ? avatar.name : "Click circle to upload"}</p>
                </div>
                <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={onAvatarChange} />
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs">First name</Label>
                  <Input className="h-9 text-sm" value={form.first_name} onChange={e => up({ first_name: e.target.value })} disabled={gMode} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Last name</Label>
                  <Input className="h-9 text-sm" value={form.last_name} onChange={e => up({ last_name: e.target.value })} disabled={gMode} required />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <Label className="text-xs">Email address</Label>
                <Input className="h-9 text-sm" type="email" value={form.email} onChange={e => up({ email: e.target.value })} disabled={gMode} required />
              </div>

              {/* Username + Password (hidden in Google mode) */}
              {!gMode && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-xs">Username</Label>
                    <Input className="h-9 text-sm" value={form.username} onChange={e => up({ username: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Password</Label>
                    <Input className="h-9 text-sm" type="password" value={form.password} onChange={e => up({ password: e.target.value })} minLength={8} required />
                  </div>
                </div>
              )}

              {/* Phone + Enrollment */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs">Phone number</Label>
                  <Input className="h-9 text-sm" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => up({ phone: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Enrollment No.</Label>
                  <Input className="h-9 text-sm" value={form.enrollment_number} onChange={e => up({ enrollment_number: e.target.value })} required />
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-1">
                <Label className="text-xs">Skills <span className="text-muted-foreground font-normal">(comma separated)</span></Label>
                <Input className="h-9 text-sm" placeholder="Python, React, CAD, ROS" value={form.skills} onChange={e => up({ skills: e.target.value })} required />
              </div>

            </div>

            {/* ════ RIGHT COLUMN ════ */}
            <div className="flex flex-col gap-3.5">

              {/* College + Branch */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs">College</Label>
                  <Input className="h-9 text-sm" value={form.college} onChange={e => up({ college: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Branch</Label>
                  <select value={form.branch} onChange={e => up({ branch: e.target.value })} className={sel} required>
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              {/* Batch years */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs">Batch Start Year</Label>
                  <Input className="h-9 text-sm" type="number" placeholder="2024" min={2010} max={2040}
                    value={form.start_year} onChange={e => onStartYear(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Batch End Year</Label>
                  <Input className="h-9 text-sm" type="number" placeholder="2028" min={2010} max={2040}
                    value={form.end_year} onChange={e => onEndYear(e.target.value)} required />
                </div>
              </div>

              {/* Academic status badge */}
              <div className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 border text-xs transition-all ${badgeCls}`}>
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotCls}`} />
                {status ? (
                  isGrad
                    ? <strong>Graduated 🎓</strong>
                    : <span>Currently in <strong>Year {status.year}</strong> · <strong>Semester {status.sem}</strong></span>
                ) : form.start_year.length === 4
                  ? "Batch hasn't started yet."
                  : "Enter start year to detect your year & semester."}
              </div>

              {/* GitHub + LinkedIn */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs">GitHub <span className="text-muted-foreground font-normal text-[10px]">(optional)</span></Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs select-none">@</span>
                    <Input className="h-9 text-sm pl-6" placeholder="username" value={form.github} onChange={e => up({ github: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">LinkedIn <span className="text-muted-foreground font-normal text-[10px]">(optional)</span></Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs select-none">@</span>
                    <Input className="h-9 text-sm pl-6" placeholder="username" value={form.linkedin} onChange={e => up({ linkedin: e.target.value })} />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ── Full-width bottom buttons ── */}
          <div className="shrink-0 pb-2">
            {gMode ? (
              <Button type="submit" className="w-full h-10 text-sm bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
                {loading ? "Saving…" : "Complete Profile →"}
              </Button>
            ) : (
              <>
                <Button type="submit" className="w-full h-10 text-sm" disabled={loading}>
                  {loading ? "Creating account…" : "Create account"}
                </Button>
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-[10px]">
                    <span className="bg-background px-3 text-muted-foreground">Or register with</span>
                  </div>
                </div>
                {GOOGLE_CLIENT_ID ? (
                  <div className="flex items-center justify-center overflow-hidden h-10">
                    <GoogleSignIn clientId={GOOGLE_CLIENT_ID} onSuccess={onGoogle} onError={() => setError("Google sign-in failed")} />
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="w-full h-10 text-sm"
                    onClick={() => alert("Configure NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google Sign-In.")}>
                    Sign in with Google
                  </Button>
                )}
              </>
            )}
          </div>

        </form>
      </main>
    </div>
  );
}
