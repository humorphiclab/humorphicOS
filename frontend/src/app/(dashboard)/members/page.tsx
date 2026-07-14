"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, chatApi, membersApi, getStoredUser, User, getImageUrl } from "@/lib/api";
import {
  UserPlus,
  UserCheck,
  Clock,
  Check,
  X,
  MessageSquare,
  Search,
  AlertCircle,
  Inbox,
  Trash2,
  Plus,
  Crown,
  User as UserIcon
} from "lucide-react";
import Link from "next/link";

export default function MembersPage() {
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getStoredUser>>(null);

  useEffect(() => {
    setMounted(true);
    setCurrentUser(getStoredUser());
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "",
    phone: "",
    enrollment_number: "",
    college: "",
    branch: "",
    batch: "",
  });

  const showFeedback = (text: string, type: "success" | "error") => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Queries
  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ["members"],
    queryFn: () => membersApi.list(),
  });

  const { data: friendRequests } = useQuery({
    queryKey: ["friend-requests"],
    queryFn: () => chatApi.friendRequests(),
    enabled: !!currentUser,
  });

  // Fetch all roles for user creation dropdown
  const canManageUsers = mounted && !!(
    currentUser?.is_superuser ||
    (currentUser?.role && ["founder", "super_admin", "president"].includes(currentUser.role.slug))
  );

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => authApi.roles(),
    enabled: canManageUsers,
  });

  // Filter roles allowed to be assigned by this user
  const getAllowedRolesToAssign = (): any[] => {
    if (!Array.isArray(roles)) return [];
    if (currentUser?.is_superuser) return roles;
    const creatorSlug = currentUser?.role?.slug;
    
    return roles.filter((role: any) => {
      if (creatorSlug === "founder") {
        return role.priority < 110;
      }
      if (creatorSlug === "super_admin") {
        return role.priority < 100;
      }
      if (creatorSlug === "president") {
        // President can assign Founder (110) or roles below President (< 90)
        return role.slug === "founder" || role.priority < 90;
      }
      return false;
    });
  };

  // Mutations
  const createMemberMutation = useMutation({
    mutationFn: (data: any) => membersApi.create(data),
    onSuccess: () => {
      showFeedback("Member created successfully!", "success");
      setShowCreateModal(false);
      setFormData({
        email: "",
        username: "",
        password: "",
        first_name: "",
        last_name: "",
        role: "",
        phone: "",
        enrollment_number: "",
        college: "",
        branch: "",
        batch: "",
      });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err: any) => {
      showFeedback(err.message || "Failed to create member", "error");
    }
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (id: number) => membersApi.delete(id),
    onSuccess: () => {
      showFeedback("Member deleted successfully!", "success");
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err: any) => {
      showFeedback(err.message || "Failed to delete member", "error");
    }
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: (receiverId: number) => chatApi.sendFriendRequest(receiverId),
    onSuccess: () => {
      showFeedback("Friend request sent successfully!", "success");
      qc.invalidateQueries({ queryKey: ["friend-requests"] });
    },
    onError: (err: any) => {
      showFeedback(err.message || "Failed to send friend request", "error");
    }
  });

  const respondFriendRequestMutation = useMutation({
    mutationFn: ({ requestId, action }: { requestId: number; action: "accept" | "reject" }) =>
      chatApi.respondFriendRequest(requestId, action),
    onSuccess: (_, variables) => {
      showFeedback(
        `Friend request ${variables.action === "accept" ? "accepted" : "rejected"}!`,
        "success"
      );
      qc.invalidateQueries({ queryKey: ["friend-requests"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (err: any) => {
      showFeedback(err.message || "Failed to respond to request", "error");
    }
  });

  // Helpers
  const isAdminOrSuperuser = (user: User | null | undefined) => {
    if (!user) return false;
    return !!(user.is_superuser || (user.role && ["founder", "super_admin", "president"].includes(user.role.slug)));
  };

  const getFriendshipState = (otherUser: User) => {
    if (!friendRequests || !currentUser) return { status: null, request: null, isSender: false };
    const req = friendRequests.find(
      (r) =>
        (r.sender === currentUser.id && r.receiver === otherUser.id) ||
        (r.receiver === currentUser.id && r.sender === otherUser.id)
    );
    if (!req) return { status: null, request: null, isSender: false };
    return {
      status: req.status,
      request: req,
      isSender: req.sender === currentUser.id,
    };
  };

  // Determine if logged in user can delete this target member
  const canDeleteMember = (targetMember: User) => {
    if (!currentUser) return false;
    
    // NO ONE can delete a Founder (even superuser)
    if (targetMember.role?.slug === "founder") return false;

    if (currentUser.is_superuser) return true;

    const requestRole = currentUser.role;
    if (!requestRole || !["founder", "super_admin", "president"].includes(requestRole.slug)) {
      return false;
    }

    const requestPriority = requestRole.priority;
    const targetPriority = targetMember.role?.priority || 0;

    // Only delete ranks below theirs
    return requestPriority > targetPriority;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.username || !formData.password || !formData.role) {
      showFeedback("Email, username, password and role are required.", "error");
      return;
    }
    createMemberMutation.mutate({
      ...formData,
      role: Number(formData.role),
    });
  };

  // Filter members based on search
  const filteredMembers = (members ?? []).filter((m) => {
    const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return (
      fullName.includes(query) ||
      m.email.toLowerCase().includes(query) ||
      m.branch?.toLowerCase().includes(query) ||
      m.college?.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <TopBar title="Members Directory" />

      {/* Toast feedback */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
          feedback.type === "success" 
            ? "bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]" 
            : "bg-[#f43f5e]/10 border-[#f43f5e]/30 text-[#f43f5e]"
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-xs font-semibold">{feedback.text}</span>
        </div>
      )}

      <div className="p-6 space-y-6">
        
        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted/65" />
            <Input
              placeholder="Search members by name, email, branch or college..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-card-border/60 bg-muted/15 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-muted/60 hover:text-foreground text-xs font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {canManageUsers && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="h-10 px-4 bg-primary hover:bg-primary/95 text-white gap-2 flex items-center shrink-0 font-bold rounded-xl"
            >
              <Plus size={16} /> Add Member
            </Button>
          )}
        </div>

        {isLoadingMembers ? (
          <p className="text-muted animate-pulse">Loading members directory...</p>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-16 max-w-md mx-auto">
            <Inbox className="h-10 w-10 text-muted/30 mx-auto mb-3" />
            <p className="text-sm text-muted">No members match your search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMembers.map((member) => {
              const { status: friendshipStatus, request, isSender } = getFriendshipState(member);
              const isDirectAllowed = isAdminOrSuperuser(currentUser) || isAdminOrSuperuser(member);
              const isSelf = currentUser?.id === member.id;
              const allowedToDelete = canDeleteMember(member);

              return (
                <Card 
                  key={member.id} 
                  className="flex flex-col justify-between p-5 border border-card-border/60 hover:border-primary/30 bg-[#0c0c0e]/60 hover:bg-[#0c0c0e]/95 transition-all shadow-sm hover:shadow-md relative overflow-hidden"
                >
                  {/* Decorative indicator for high-priority leadership roles */}
                  {member.role && ["founder", "super_admin", "president", "vice_president"].includes(member.role.slug) && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
                  )}

                  <div className="flex items-start gap-4">
                    {/* Link Avatar and Name for detail view */}
                    <Link href={`/members/${member.id}`} className="shrink-0 group">
                      {member.avatar ? (
                        <img 
                          src={getImageUrl(member.avatar) as string} 
                          alt="Avatar" 
                          className="h-12 w-12 rounded-full object-cover border border-primary/20 shadow-sm transition-transform group-hover:scale-105" 
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm transition-transform group-hover:scale-105 select-none">
                          {member.first_name?.[0]}
                          {member.last_name?.[0]}
                        </div>
                      )}
                    </Link>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Link href={`/members/${member.id}`} className="hover:underline min-w-0">
                          <p className="font-bold text-sm truncate text-foreground leading-none">
                            {member.first_name} {member.last_name}
                          </p>
                        </Link>
                        {member.role?.slug === "founder" && <Crown size={12} className="text-amber-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-muted truncate mt-1">{member.email}</p>
                      <p className="text-[11px] text-primary font-bold mt-1">
                        {member.role?.name || "Member"}
                      </p>
                    </div>
                  </div>

                  {/* Branch and College Info */}
                  {(member.branch || member.college) && (
                    <p className="text-xs text-muted/80 mt-3 truncate border-t border-card-border/20 pt-3">
                      {[member.branch, member.college].filter(Boolean).join(" · ")}
                    </p>
                  )}

                  {/* Friendship and Direct Messaging Actions */}
                  <div className="mt-4 pt-3 border-t border-card-border/30 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {isSelf 
                        ? "Me" 
                        : isDirectAllowed 
                          ? "Direct Line" 
                          : friendshipStatus 
                            ? `Status: ${friendshipStatus}` 
                            : "Not Connected"
                      }
                    </span>

                    <div className="flex items-center gap-2">
                      {allowedToDelete && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${member.first_name} ${member.last_name}?`)) {
                              deleteMemberMutation.mutate(member.id);
                            }
                          }}
                          disabled={deleteMemberMutation.isPending}
                          className="h-8 w-8 p-0 border-rose-500/20 text-rose-400 hover:bg-rose-500/10 shrink-0"
                          title="Delete Member"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}

                      {!isSelf && (
                        <>
                          {isDirectAllowed || friendshipStatus === "accepted" ? (
                            <Link href={`/chat?user=${member.id}`}>
                              <Button
                                size="sm"
                                className="h-8 px-3 bg-primary hover:bg-primary/90 text-white font-semibold text-xs gap-1.5 shrink-0"
                              >
                                <MessageSquare className="h-3.5 w-3.5" /> Message
                              </Button>
                            </Link>
                          ) : friendshipStatus === "pending" ? (
                            isSender ? (
                              <div className="flex items-center gap-1 text-[11px] text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded font-semibold border border-amber-500/20 select-none">
                                <Clock className="h-3 w-3" /> Sent
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    respondFriendRequestMutation.mutate({
                                      requestId: request!.id,
                                      action: "accept",
                                    })
                                  }
                                  className="h-7 px-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-none shadow-none font-bold text-[10px]"
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    respondFriendRequestMutation.mutate({
                                      requestId: request!.id,
                                      action: "reject",
                                    })
                                  }
                                  className="h-7 px-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border-none shadow-none font-bold text-[10px]"
                                >
                                  Decline
                                </Button>
                              </div>
                            )
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => sendFriendRequestMutation.mutate(member.id)}
                              disabled={sendFriendRequestMutation.isPending}
                              className="h-8 px-3 bg-primary text-white font-semibold text-xs gap-1.5"
                            >
                              <UserPlus className="h-3.5 w-3.5" /> Add Friend
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Elegant Add Member Glassmorphism Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e] border border-card-border/80 w-full max-w-lg rounded-2xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-card-border/60 bg-[#121215]">
              <div className="flex items-center gap-2">
                <UserIcon className="text-primary h-5 w-5" />
                <h2 className="text-base font-bold text-white">Add New Club Member</h2>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-muted hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[80vh]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted">First Name</label>
                  <Input
                    placeholder="E.g. John"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="h-10 border-card-border/60 bg-muted/10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted">Last Name</label>
                  <Input
                    placeholder="E.g. Doe"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="h-10 border-card-border/60 bg-muted/10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted">Email *</label>
                <Input
                  type="email"
                  placeholder="E.g. member@humorphic.club"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-10 border-card-border/60 bg-muted/10 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted">Username *</label>
                  <Input
                    placeholder="E.g. johndoe"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="h-10 border-card-border/60 bg-muted/10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted">Password *</label>
                  <Input
                    type="password"
                    placeholder="Min 8 characters"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="h-10 border-card-border/60 bg-muted/10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted">Role *</label>
                <select
                  value={formData.role}
                  required
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-card-border/60 bg-[#0d0d0f] text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Select Role --</option>
                  {getAllowedRolesToAssign().map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Priority {r.priority})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted">Phone Number</label>
                  <Input
                    placeholder="E.g. +919876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-10 border-card-border/60 bg-muted/10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted">Enrollment Number</label>
                  <Input
                    placeholder="E.g. 0612IA240001"
                    maxLength={12}
                    value={formData.enrollment_number}
                    onChange={(e) => setFormData({ ...formData, enrollment_number: e.target.value })}
                    className="h-10 border-card-border/60 bg-muted/10 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted">College</label>
                  <Input
                    placeholder="College"
                    value={formData.college}
                    onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                    className="h-10 border-card-border/60 bg-muted/10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted">Branch</label>
                  <Input
                    placeholder="Branch"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="h-10 border-card-border/60 bg-muted/10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted">Batch</label>
                  <Input
                    placeholder="Batch"
                    value={formData.batch}
                    onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                    className="h-10 border-card-border/60 bg-muted/10 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-card-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="h-10 border-card-border text-muted hover:bg-muted/10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMemberMutation.isPending}
                  className="h-10 text-white bg-primary hover:bg-primary/90 font-bold"
                >
                  {createMemberMutation.isPending ? "Creating..." : "Create Member"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
