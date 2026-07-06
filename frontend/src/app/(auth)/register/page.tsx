"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Upload, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { authApi, setStoredTokens, setStoredUser } from "@/lib/api";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const BRANCHES = ["CS AI", "CS", "Mechanical", "Civil", "Electrical"];

export default function RegisterPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState({
    email: "",
    phone: "",
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    enrollment_number: "",
    college: "",
    branch: "CS AI",
    start_year: "",
    end_year: "",
    skills: "",
    linkedin: "",
    github: "",
  });
  
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Calculate year and semester dynamically
  const calculateAcademicStatus = () => {
    if (!form.start_year) return null;
    const startYear = parseInt(form.start_year);
    if (isNaN(startYear)) return null;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11 (Aug is 7)
    
    // Assuming academic year starts in August (7)
    const monthsElapsed = (currentYear - startYear) * 12 + (currentMonth - 7);
    
    let year = 1;
    let sem = 1;

    if (monthsElapsed >= 0) {
      sem = Math.floor(monthsElapsed / 6) + 1; // roughly 6 months per sem
      year = Math.floor((sem - 1) / 2) + 1;
    }
    
    if (year > 5) return { year: "Graduated", sem: "-" };
    
    return { year, sem };
  };

  const academicStatus = calculateAcademicStatus();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  };

  const handleGoogle = async (idToken: string) => {
    setError("");
    setLoading(true);
    try {
      const { tokens, user } = await authApi.googleLogin(idToken);
      setStoredTokens(tokens);
      setStoredUser(user as Parameters<typeof setStoredUser>[0]);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avatar) {
      setError("Please select an avatar.");
      return;
    }
    if (!form.start_year || !form.end_year) {
      setError("Start year and End year are required.");
      return;
    }
    
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === "skills") {
           const skillsArray = value.split(",").map(s => s.trim()).filter(Boolean);
           formData.append(key, JSON.stringify(skillsArray));
        } else if (key === "github" && value) {
           formData.append(key, `https://github.com/${value}`);
        } else if (key === "linkedin" && value) {
           formData.append(key, `https://linkedin.com/in/${value}`);
        } else if (key !== "start_year" && key !== "end_year") {
           formData.append(key, value);
        }
      });
      // Handle batch
      formData.append("batch", `${form.start_year}-${form.end_year}`);
      formData.append("avatar", avatar);
      
      await authApi.register(formData);
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background font-sans">
      {/* Left Pane - Image & Brand */}
      <div className="hidden lg:flex w-1/2 relative bg-primary/10 flex-col justify-between overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-60" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=2000&auto=format&fit=crop')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
        
        <div className="relative z-10 p-12 flex items-center gap-3">
          <div className="inline-flex rounded-xl bg-primary p-2">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-foreground">HumorphicOS</span>
        </div>

        <div className="relative z-10 p-12 mt-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-foreground">
            Build the future of robotics.
          </h1>
          <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
            Join our community of innovators, builders, and thinkers. Create your account to access club resources, projects, and events.
          </p>
        </div>
      </div>

      {/* Right Pane - Form */}
      <div className="w-full lg:w-1/2 flex items-start justify-center p-6 sm:p-12 overflow-y-auto max-h-screen">
        <div className="w-full max-w-md space-y-8 my-auto">
          <div className="flex flex-col space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Create an account</h2>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Log in
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/15 border border-destructive/30 px-4 py-3 text-sm text-destructive font-medium">
                {error}
              </div>
            )}

            {/* Avatar Upload */}
            <div className="flex flex-col items-center justify-center pt-2 pb-4">
              <div 
                className="relative h-24 w-24 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer overflow-hidden group hover:border-primary/50 transition-colors bg-muted/30"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground/50 group-hover:text-primary/50 transition-colors" />
                )}
                
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Plus className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 font-medium">Upload Profile Picture</p>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={(e) => update("first_name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={(e) => update("last_name", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => update("username", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="enrollment_number">Enrollment No.</Label>
                <Input
                  id="enrollment_number"
                  value={form.enrollment_number}
                  onChange={(e) => update("enrollment_number", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="college">College</Label>
                <Input
                  id="college"
                  value={form.college}
                  onChange={(e) => update("college", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 flex flex-col justify-end">
                <Label htmlFor="branch">Branch</Label>
                <select
                  id="branch"
                  value={form.branch}
                  onChange={(e) => update("branch", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  {BRANCHES.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_year">Start Year</Label>
                <Input
                  id="start_year"
                  type="number"
                  placeholder="e.g. 2024"
                  min="2010"
                  max="2040"
                  value={form.start_year}
                  onChange={(e) => update("start_year", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_year">End Year</Label>
                <Input
                  id="end_year"
                  type="number"
                  placeholder="e.g. 2028"
                  min="2010"
                  max="2040"
                  value={form.end_year}
                  onChange={(e) => update("end_year", e.target.value)}
                  required
                />
              </div>
            </div>
            
            {academicStatus && (
              <p className="text-xs text-primary font-medium px-1">
                Detected: Year {academicStatus.year}, Semester {academicStatus.sem}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="skills">Skills</Label>
              <Input
                id="skills"
                placeholder="e.g. Python, React, CAD (comma separated)"
                value={form.skills}
                onChange={(e) => update("skills", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="github">GitHub</Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-muted-foreground text-sm font-medium">@</span>
                  <Input
                    id="github"
                    placeholder="username"
                    className="pl-8"
                    value={form.github}
                    onChange={(e) => update("github", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-muted-foreground text-sm font-medium">@</span>
                  <Input
                    id="linkedin"
                    placeholder="username"
                    className="pl-8"
                    value={form.linkedin}
                    onChange={(e) => update("linkedin", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-4 text-muted-foreground">Or register with</span>
              </div>
            </div>

            <div className="grid grid-cols-1 pb-8">
              {GOOGLE_CLIENT_ID ? (
                <div className="flex items-center justify-center overflow-hidden h-11">
                  <GoogleSignIn clientId={GOOGLE_CLIENT_ID} onSuccess={handleGoogle} onError={() => setError("Google sign-in failed")} />
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full h-11" onClick={() => alert("Please configure NEXT_PUBLIC_GOOGLE_CLIENT_ID")}>
                  Google
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
