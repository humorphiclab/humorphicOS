"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { authApi, getStoredUser, User, setStoredUser } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function EditProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<User>>({});
  
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
        avatar: me.avatar || "",
      });
    }
  }, [me, form.email]);

  const mutation = useMutation({
    mutationFn: (data: Partial<User>) => authApi.updateProfile(data),
    onSuccess: (updatedUser) => {
      setStoredUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["member", updatedUser.id] });
      alert("Profile updated successfully!");
      router.push(`/members/${updatedUser.id}`);
    },
    onError: (err: any) => {
      alert("Error updating profile: " + err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <>
      <TopBar title="Edit Profile" />
      <div className="p-6 max-w-2xl">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input name="first_name" value={form.first_name || ""} onChange={handleChange} required />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input name="last_name" value={form.last_name || ""} onChange={handleChange} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Username</Label>
                <Input name="username" value={form.username || ""} onChange={handleChange} required />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input name="phone" value={form.phone || ""} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Enrollment Number</Label>
                <Input name="enrollment_number" value={form.enrollment_number || ""} onChange={handleChange} minLength={12} maxLength={12} />
              </div>
              <div>
                <Label>Batch / Year</Label>
                <Input name="batch" value={form.batch || ""} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>College</Label>
                <Input name="college" value={form.college || ""} onChange={handleChange} />
              </div>
              <div>
                <Label>Branch</Label>
                <Input name="branch" value={form.branch || ""} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>GitHub URL</Label>
                <Input name="github" value={form.github || ""} onChange={handleChange} />
              </div>
              <div>
                <Label>LinkedIn URL</Label>
                <Input name="linkedin" value={form.linkedin || ""} onChange={handleChange} />
              </div>
            </div>
            <div>
              <Label>Avatar URL (DP)</Label>
              <Input name="avatar" value={form.avatar || ""} onChange={handleChange} placeholder="https://..." />
            </div>
            <div>
              <Label>Bio</Label>
              <textarea 
                name="bio" 
                value={form.bio || ""} 
                onChange={handleChange} 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
              />
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
