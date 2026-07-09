"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, getStoredUser, User, setStoredUser, getImageUrl } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Camera, UserCircle, Save, Mail, Phone, Hash, GraduationCap, Code, Briefcase, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function EditProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState<Partial<User>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  
  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
  });

  // Initialize form when me is loaded
  useEffect(() => {
    if (me && !form.email) {
      setForm({
        email: me.email || "",
        first_name: me.first_name || "",
        last_name: me.last_name || "",
        username: me.username || "",
        phone: me.phone || "",
        college: me.college || "",
        branch: me.branch || "",
        batch: me.batch || "",
        enrollment_number: me.enrollment_number || "",
        linkedin: me.linkedin || "",
        github: me.github || "",
        portfolio: me.portfolio || "",
        bio: me.bio || "",
      });
      if (me.avatar) {
        setPreviewUrl(getImageUrl(me.avatar));
      }
      if (me.batch) {
        const parts = me.batch.split("-");
        if (parts.length === 2) {
          setStartYear(parts[0]);
          setEndYear(parts[1]);
        }
      }
    }
  }, [me, form.email]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => authApi.updateProfile(data),
    onSuccess: (updatedUser) => {
      setStoredUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["member", updatedUser.id] });
      toast.success("Profile updated successfully!");
      router.push(`/members/${updatedUser.id}`);
    },
    onError: (err: any) => {
      toast.error("Error updating profile: " + err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    Object.keys(form).forEach(key => {
      if (key !== "batch" && form[key as keyof User] !== null && form[key as keyof User] !== undefined) {
        fd.append(key, form[key as keyof User] as string);
      }
    });
    if (startYear && endYear) {
      fd.append("batch", `${startYear}-${endYear}`);
    }
    if (avatarFile) {
      fd.append("avatar", avatarFile);
    }
    mutation.mutate(fd);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleStartYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setStartYear(v);
    const n = parseInt(v, 10);
    if (v.length === 4 && !isNaN(n)) {
      setEndYear(String(n + 4));
    }
  };

  const handleEndYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setEndYear(v);
    const n = parseInt(v, 10);
    if (v.length === 4 && !isNaN(n)) {
      setStartYear(String(n - 4));
    }
  };

  if (isLoading) return <div className="p-6 text-muted">Loading profile data...</div>;

  return (
    <>
      <TopBar title="Edit Profile" />
      <div className="p-6 max-w-4xl mx-auto">
        <Link 
          href={me ? `/members/${me.id}` : "/members"} 
          className="inline-flex items-center gap-2 text-xs text-muted hover:text-foreground font-semibold mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to My Profile
        </Link>

        <Card className="overflow-hidden border border-card-border/60 bg-linear-to-b from-card to-muted/15 shadow-xl relative backdrop-blur-md p-0">
          
          {/* Header Cover */}
          <div className="relative">
            <div className="h-48 w-full bg-linear-to-r from-blue-600/80 to-indigo-700/80 overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
              <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/60" />
            </div>

            <div className="px-8 pb-8 relative flex flex-col items-center sm:items-start">
              
              {/* Editable Avatar */}
              <div className="relative -mt-16 group cursor-pointer mb-6" onClick={() => fileInputRef.current?.click()}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/gif,image/webp" 
                />
                
                {previewUrl ? (
                  <img src={previewUrl} alt="Avatar" className="h-32 w-32 rounded-full border-4 border-card shadow-md object-cover bg-card transition-all group-hover:opacity-75" />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-primary/20 text-primary border-4 border-card flex items-center justify-center text-4xl font-bold shadow-md select-none transition-all group-hover:bg-primary/30">
                    {me?.first_name?.[0]}{me?.last_name?.[0]}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/40">
                  <Camera className="text-white h-8 w-8" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-full shadow-lg border-2 border-card">
                  <Camera size={16} />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="w-full space-y-8">
                
                {/* Names Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">First Name</label>
                    <Input name="first_name" value={form.first_name || ""} onChange={handleChange} required className="bg-black/20 border-white/10" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Last Name</label>
                    <Input name="last_name" value={form.last_name || ""} onChange={handleChange} required className="bg-black/20 border-white/10" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-card-border/40">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <UserCircle className="text-indigo-400 h-4 w-4" /> Personal Details
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted/80 shrink-0" />
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Email Address (Read Only)</label>
                          <Input value={me?.email || ""} disabled className="bg-black/20 border-white/10 text-muted" />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <UserCircle className="h-4 w-4 text-muted/80 shrink-0" />
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Username</label>
                          <Input name="username" value={form.username || ""} onChange={handleChange} required className="bg-black/20 border-white/10" />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted/80 shrink-0" />
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Contact Number</label>
                          <Input name="phone" value={form.phone || ""} onChange={handleChange} className="bg-black/20 border-white/10" />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Hash className="h-4 w-4 text-muted/80 shrink-0" />
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Enrollment Number</label>
                          <Input name="enrollment_number" value={form.enrollment_number || ""} onChange={handleChange} minLength={12} maxLength={12} className="bg-black/20 border-white/10" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <GraduationCap className="text-indigo-400 h-4 w-4" /> Academic & Socials
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 pl-7">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">College</label>
                          <Input name="college" value={form.college || ""} onChange={handleChange} className="bg-black/20 border-white/10" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Branch</label>
                          <Input name="branch" value={form.branch || ""} onChange={handleChange} className="bg-black/20 border-white/10" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pl-7">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Batch Start Year</label>
                          <Input type="number" min={2010} max={2040} value={startYear} onChange={handleStartYearChange} className="bg-black/20 border-white/10" required />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Batch End Year</label>
                          <Input type="number" min={2010} max={2040} value={endYear} onChange={handleEndYearChange} className="bg-black/20 border-white/10" required />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-6">
                        <Code className="h-4 w-4 text-muted/80 shrink-0" />
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">GitHub Profile URL</label>
                          <Input name="github" value={form.github || ""} onChange={handleChange} className="bg-black/20 border-white/10" />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Briefcase className="h-4 w-4 text-muted/80 shrink-0" />
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">LinkedIn Profile URL</label>
                          <Input name="linkedin" value={form.linkedin || ""} onChange={handleChange} className="bg-black/20 border-white/10" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Full Width Bio */}
                <div className="pt-4 border-t border-card-border/40 space-y-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Biography / About Me</label>
                  <textarea 
                    name="bio" 
                    value={form.bio || ""} 
                    onChange={handleChange} 
                    rows={4}
                    placeholder="Tell us about yourself..."
                    className="flex w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y" 
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={mutation.isPending} className="font-bold flex items-center gap-2">
                    <Save size={16} />
                    {mutation.isPending ? "Saving changes..." : "Save Profile"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
