"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { departmentsApi, membersApi, getStoredUser } from "@/lib/api";
import { Users, Pencil, X, Crown, UserMinus, UserPlus, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => { setCurrentUser(getStoredUser()); }, []);
  const canManage = currentUser?.is_superuser || (currentUser?.role?.priority ?? 0) >= 80;

  const [selectedDept, setSelectedDept] = useState<any | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", head: "", color: "" });
  const [memberToAdd, setMemberToAdd] = useState("");

  const { data: depts = [], isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: departmentsApi.list,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: membersApi.list,
    enabled: canManage,
  });

  // When selecting a dept, populate edit form
  const openDept = (dept: any) => {
    setSelectedDept(dept);
    setEditing(false);
    setEditForm({
      name: dept.name ?? "",
      description: dept.description ?? "",
      head: dept.head ? String(dept.head) : "",
      color: dept.color ?? "#6366f1",
    });
  };

  const updateMutation = useMutation({
    mutationFn: (data: any) => departmentsApi.update(selectedDept.slug, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      setSelectedDept(updated);
      setEditing(false);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      name: editForm.name,
      description: editForm.description,
      head: editForm.head ? Number(editForm.head) : null,
      color: editForm.color,
    });
  };

  const addMemberMutation = useMutation({
    mutationFn: (userId: number) => {
      const current = selectedDept.members ?? [];
      return departmentsApi.update(selectedDept.slug, { members: [...current, userId] });
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      setSelectedDept(updated);
      setMemberToAdd("");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => {
      const current = (selectedDept.members ?? []).filter((id: number) => id !== userId);
      return departmentsApi.update(selectedDept.slug, { members: current });
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      setSelectedDept(updated);
    },
  });

  const eligibleToAdd = members.filter((m: any) => !(selectedDept?.members ?? []).includes(m.id));

  return (
    <>
      <TopBar title="Departments" />
      <div className="p-6 flex gap-6 h-[calc(100vh-112px)] overflow-hidden">

        {/* Left: Department Cards */}
        <div className={cn("flex flex-col gap-4 overflow-y-auto pr-1", selectedDept ? "w-5/12 xl:w-4/12" : "w-full max-w-6xl")}>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted text-sm py-8 justify-center">
              <Loader2 className="animate-spin h-4 w-4" /> Loading departments...
            </div>
          ) : (depts ?? []).map((d: any) => (
            <Card
              key={d.id}
              onClick={() => openDept(d)}
              className={cn(
                "p-5 cursor-pointer transition-all border hover:border-primary/50 hover:-translate-y-0.5",
                selectedDept?.id === d.id && "border-primary bg-primary/5 shadow-md shadow-primary/5"
              )}
              style={{ borderTop: `3px solid ${d.color || "#6366f1"}` }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0"
                  style={{ background: d.color || "#6366f1" }}
                >
                  {d.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm">{d.name}</p>
                  <p className="text-xs text-muted mt-0.5 line-clamp-1">{d.description || "No description"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted">{d.member_count ?? 0}</p>
                  <p className="text-[10px] text-muted">members</p>
                </div>
              </div>
              {d.head_detail && (
                <div className="mt-3 pt-3 border-t border-card-border flex items-center gap-2">
                  <Crown size={11} className="text-amber-400" />
                  <span className="text-[10px] text-amber-400 font-semibold">{d.head_detail.full_name}</span>
                  <span className="text-[10px] text-muted">· Head</span>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Right: Detail / Edit Panel */}
        {selectedDept && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <Card className="flex-1 flex flex-col overflow-hidden border-card-border shadow-2xl">
              {/* Panel Header */}
              <div className="p-5 border-b border-card-border flex justify-between items-center shrink-0 bg-[#0d0d0f]">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-black"
                    style={{ background: selectedDept.color || "#6366f1" }}
                  >
                    {selectedDept.name[0]}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">{selectedDept.name}</h2>
                    <p className="text-xs text-muted">Department</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && !editing && (
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-8 text-xs gap-1.5">
                      <Pencil size={12} /> Edit
                    </Button>
                  )}
                  <button onClick={() => setSelectedDept(null)} className="p-1.5 rounded-lg hover:bg-muted/20 text-muted hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {editing ? (
                  /* ── Edit Form ── */
                  <div className="space-y-4 max-w-lg animate-in fade-in duration-200">
                    <h3 className="text-sm font-bold text-white border-b border-card-border pb-2">Edit Department</h3>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted uppercase tracking-wider">Name</label>
                      <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted uppercase tracking-wider">Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                        rows={3}
                        className="w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        placeholder="Department description..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted uppercase tracking-wider">Department Head</label>
                        <select
                          value={editForm.head}
                          onChange={e => setEditForm({ ...editForm, head: e.target.value })}
                          className="w-full h-10 rounded-lg border border-card-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">— None —</option>
                          {members.map((m: any) => (
                            <option key={m.id} value={m.id}>{m.full_name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted uppercase tracking-wider">Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editForm.color}
                            onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                            className="h-10 w-16 rounded border border-card-border bg-card cursor-pointer"
                          />
                          <Input value={editForm.color} onChange={e => setEditForm({ ...editForm, color: e.target.value })} className="flex-1 font-mono text-xs" />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSave} disabled={updateMutation.isPending} className="text-white flex items-center gap-1.5">
                        {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {updateMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  /* ── Read-Only View ── */
                  <>
                    <div className="h-1 w-full rounded-full" style={{ background: selectedDept.color || "#6366f1" }} />
                    <p className="text-sm text-muted leading-relaxed">{selectedDept.description || "No description provided."}</p>

                    {selectedDept.head_detail && (
                      <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-400 font-black">
                          {selectedDept.head_detail.full_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{selectedDept.head_detail.full_name}</p>
                          <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Department Head</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Members Section — always shown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-card-border pb-2">
                    <div className="flex items-center gap-2">
                      <Users size={15} className="text-primary" />
                      <h3 className="text-sm font-bold text-white">Members</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                        {selectedDept.members_detail?.length ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Add Member — VP+ only */}
                  {canManage && (
                    <form
                      onSubmit={(e) => { e.preventDefault(); if (memberToAdd) addMemberMutation.mutate(Number(memberToAdd)); }}
                      className="flex gap-2"
                    >
                      <select
                        value={memberToAdd}
                        onChange={e => setMemberToAdd(e.target.value)}
                        className="flex-1 h-9 rounded-lg border border-card-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Add a member...</option>
                        {eligibleToAdd.map((m: any) => (
                          <option key={m.id} value={m.id}>{m.full_name} — {m.role?.name ?? "Member"}</option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" disabled={!memberToAdd || addMemberMutation.isPending} className="h-9 text-white shrink-0 flex items-center gap-1">
                        {addMemberMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                        Add
                      </Button>
                    </form>
                  )}

                  <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                    {(selectedDept.members_detail ?? []).length === 0 ? (
                      <p className="text-xs text-muted italic">No members yet.</p>
                    ) : (
                      (selectedDept.members_detail ?? []).map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg border border-card-border hover:bg-muted/10 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {m.full_name?.[0]}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-white">{m.full_name}</p>
                              <p className="text-[10px] text-muted">{m.role?.name ?? "Member"}</p>
                            </div>
                          </div>
                          {canManage && (
                            <button
                              onClick={() => removeMemberMutation.mutate(m.id)}
                              disabled={removeMemberMutation.isPending}
                              className="p-1 rounded text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                              title="Remove from department"
                            >
                              <UserMinus size={13} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
