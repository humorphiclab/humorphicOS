"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { chatApi, membersApi, getStoredUser, User } from "@/lib/api";
import {
  UserPlus,
  UserCheck,
  Clock,
  Check,
  X,
  MessageSquare,
  ArrowLeft,
  GraduationCap,
  Mail,
  AlertCircle,
  Phone,
  Hash,
  Calendar,
  UserCircle,
  Code,
  Briefcase,
  Sparkles
} from "lucide-react";
import Link from "next/link";

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  useEffect(() => setCurrentUser(getStoredUser()), []);
  const userId = parseInt(params.id as string);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showFeedback = (text: string, type: "success" | "error") => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Queries
  const { data: member, isLoading: isLoadingMember, error: memberError } = useQuery({
    queryKey: ["member", userId],
    queryFn: () => membersApi.get(userId),
    enabled: !!userId,
  });

  const { data: friendRequests } = useQuery({
    queryKey: ["friend-requests"],
    queryFn: () => chatApi.friendRequests(),
    enabled: !!currentUser,
  });

  // Mutations
  const sendFriendRequestMutation = useMutation({
    mutationFn: () => chatApi.sendFriendRequest(userId),
    onSuccess: () => {
      showFeedback("Friend request sent successfully!", "success");
      qc.invalidateQueries({ queryKey: ["friend-requests"] });
    },
    onError: (err: any) => {
      showFeedback(err.message || "Failed to send friend request", "error");
    }
  });

  const respondFriendRequestMutation = useMutation({
    mutationFn: (action: "accept" | "reject") => {
      const req = friendRequests?.find(
        (r) =>
          (r.sender === currentUser?.id && r.receiver === userId) ||
          (r.receiver === currentUser?.id && r.sender === userId)
      );
      if (!req) throw new Error("Friend request not found");
      return chatApi.respondFriendRequest(req.id, action);
    },
    onSuccess: (_, action) => {
      showFeedback(
        `Friend request ${action === "accept" ? "accepted" : "rejected"}!`,
        "success"
      );
      qc.invalidateQueries({ queryKey: ["friend-requests"] });
    },
    onError: (err: any) => {
      showFeedback(err.message || "Failed to respond to request", "error");
    }
  });

  // Helpers
  const isAdminOrSuperuser = (u: User | null | undefined) => {
    if (!u) return false;
    return !!(u.is_superuser || (u.role && ["super_admin", "president"].includes(u.role.slug)));
  };

  const getFriendshipState = () => {
    if (!friendRequests || !currentUser || !member) return { status: null, isSender: false };
    const req = friendRequests.find(
      (r) =>
        (r.sender === currentUser.id && r.receiver === member.id) ||
        (r.receiver === currentUser.id && r.sender === member.id)
    );
    if (!req) return { status: null, isSender: false };
    return {
      status: req.status,
      isSender: req.sender === currentUser.id,
    };
  };

  if (isLoadingMember) {
    return (
      <>
        <TopBar title="Member Profile" />
        <div className="p-6 flex items-center justify-center min-h-[300px]">
          <p className="text-muted animate-pulse">Loading profile details...</p>
        </div>
      </>
    );
  }

  if (memberError || !member) {
    return (
      <>
        <TopBar title="Member Profile" />
        <div className="p-6 max-w-xl mx-auto mt-10">
          <Card className="border-rose-500/20 bg-rose-500/5 text-center p-8">
            <AlertCircle className="h-10 w-10 text-rose-400 mx-auto mb-4" />
            <h3 className="text-foreground font-bold text-base">Profile Not Found</h3>
            <p className="text-xs text-muted mt-2">
              The member profile could not be loaded. They may not exist or you lack permission to view their details.
            </p>
            <Link href="/members">
              <Button className="mt-6 bg-muted hover:bg-muted/80 text-foreground font-semibold flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Directory
              </Button>
            </Link>
          </Card>
        </div>
      </>
    );
  }

  const { status: friendshipStatus, isSender } = getFriendshipState();
  const isDirectAllowed = isAdminOrSuperuser(currentUser) || isAdminOrSuperuser(member);
  const isSelf = currentUser?.id === member.id;

  return (
    <>
      <TopBar title={`${member.first_name}'s Profile`} />

      {/* Toast feedback */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
          feedback.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
            : "bg-rose-500/10 border-rose-500/30 text-rose-400"
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-xs font-semibold">{feedback.text}</span>
        </div>
      )}

      <div className="p-6 max-w-4xl mx-auto">
        {/* Back Link */}
        <Link 
          href="/members" 
          className="inline-flex items-center gap-2 text-xs text-muted hover:text-foreground font-semibold mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Members Directory
        </Link>

        {/* Profile Card */}
        <Card className="overflow-hidden border border-card-border/60 bg-gradient-to-b from-card to-muted/15 shadow-xl relative backdrop-blur-md p-0">
          
          {/* Header Banner */}
          <div className="h-32 bg-gradient-to-r from-primary/10 via-accent/5 to-transparent border-b border-card-border/40 relative">
            <Sparkles className="absolute right-6 bottom-4 h-6 w-6 text-primary/20 animate-pulse" />
          </div>

          <div className="px-8 pb-8 relative flex flex-col md:flex-row gap-6 items-start">
            
            {/* Large Avatar */}
            {member.avatar ? (
              <img src={member.avatar} alt="Avatar" className="h-24 w-24 rounded-full border-4 border-card shadow-md -mt-12 shrink-0 object-cover bg-card" />
            ) : (
              <div className="h-24 w-24 rounded-full bg-primary/20 text-primary border-4 border-card flex items-center justify-center text-3xl font-bold shadow-md -mt-12 shrink-0 select-none">
                {member.first_name?.[0]}{member.last_name?.[0]}
              </div>
            )}

            {/* Profile Info Details */}
            <div className="flex-1 -mt-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-foreground">
                  {member.first_name} {member.last_name}
                </h1>
                
                {isAdminOrSuperuser(member) && (
                  <span className="text-[10px] bg-primary/20 text-primary font-bold px-2 py-0.5 rounded border border-primary/20">
                    Leadership
                  </span>
                )}
              </div>
              <p className="text-xs text-primary font-medium mt-1">
                {member.role?.name || "Member"}
              </p>

              {/* Grid of info details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 border-t border-card-border/40 pt-6">
                <div className="flex items-center gap-3 text-muted">
                  <Mail className="h-4 w-4 text-muted/80 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/60 leading-none">Email Address</p>
                    <p className="text-xs mt-1 text-foreground truncate">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted">
                  <Phone className="h-4 w-4 text-muted/80 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/60 leading-none">Contact Number</p>
                    <p className="text-xs mt-1 text-foreground truncate">{member.phone || <span className="text-muted-foreground/40 italic">Not provided</span>}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted">
                  <UserCircle className="h-4 w-4 text-muted/80 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/60 leading-none">Username</p>
                    <p className="text-xs mt-1 text-foreground truncate">{member.username ? `@${member.username}` : <span className="text-muted-foreground/40 italic">Not provided</span>}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted">
                  <Hash className="h-4 w-4 text-muted/80 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/60 leading-none">Enrollment Number</p>
                    <p className="text-xs mt-1 text-foreground truncate">{member.enrollment_number || <span className="text-muted-foreground/40 italic">Not provided</span>}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted">
                  <GraduationCap className="h-4 w-4 text-muted/80 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/60 leading-none">Education</p>
                    <p className="text-xs mt-1 text-foreground truncate">
                      {[member.branch, member.batch, member.college].filter(Boolean).join(" · ") || <span className="text-muted-foreground/40 italic">Not provided</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted">
                  <Code className="h-4 w-4 text-muted/80 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/60 leading-none">GitHub</p>
                    <p className="text-xs mt-1 text-foreground truncate">
                      {member.github ? (
                        <a href={member.github.startsWith("http") ? member.github : `https://${member.github}`} target="_blank" rel="noreferrer" className="hover:underline">{member.github}</a>
                      ) : <span className="text-muted-foreground/40 italic">Not provided</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted">
                  <Briefcase className="h-4 w-4 text-muted/80 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/60 leading-none">LinkedIn</p>
                    <p className="text-xs mt-1 text-foreground truncate">
                      {member.linkedin ? (
                        <a href={member.linkedin.startsWith("http") ? member.linkedin : `https://${member.linkedin}`} target="_blank" rel="noreferrer" className="hover:underline">View Profile</a>
                      ) : <span className="text-muted-foreground/40 italic">Not provided</span>}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-card-border/40">
                <p className="text-[10px] uppercase font-bold text-muted-foreground/60 leading-none mb-2">Bio</p>
                {member.bio ? (
                  <p className="text-sm text-foreground/80">{member.bio}</p>
                ) : (
                  <p className="text-sm text-muted-foreground/40 italic">No bio provided</p>
                )}
              </div>
            </div>

            {/* Connection Actions Container */}
            <div className="w-full md:w-auto md:self-end mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-card-border/40 flex flex-col gap-3 shrink-0">
              
              {!isSelf && (
                <div className="rounded-xl border border-card-border bg-card/60 p-4 min-w-[200px] shadow-sm flex flex-col space-y-3">
                  <div className="text-center pb-2 border-b border-card-border/30">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Club Connection</p>
                    <p className="text-xs font-semibold mt-1">
                      {isDirectAllowed ? "Direct Messaging Allowed" : friendshipStatus ? `Status: ${friendshipStatus}` : "Not Connected"}
                    </p>
                  </div>

                  {isDirectAllowed || friendshipStatus === "accepted" ? (
                    <Link href={`/chat?user=${member.id}`}>
                      <Button 
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold gap-2 text-xs h-9"
                      >
                        <MessageSquare className="h-4 w-4" /> Message
                      </Button>
                    </Link>
                  ) : friendshipStatus === "pending" ? (
                    isSender ? (
                      <div className="w-full flex items-center justify-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 py-2 rounded-lg font-semibold border border-amber-500/20">
                        <Clock className="h-4 w-4" /> Request Sent
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => respondFriendRequestMutation.mutate("accept")}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 text-xs h-9"
                        >
                          <Check className="h-4 w-4" /> Accept
                        </Button>
                        <Button
                          onClick={() => respondFriendRequestMutation.mutate("reject")}
                          className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold gap-1 text-xs h-9"
                        >
                          <X className="h-4 w-4" /> Decline
                        </Button>
                      </div>
                    )
                  ) : (
                    <Button
                      onClick={() => sendFriendRequestMutation.mutate()}
                      disabled={sendFriendRequestMutation.isPending}
                      className="w-full bg-primary text-white font-bold gap-2 text-xs h-9"
                    >
                      <UserPlus className="h-4 w-4" /> Add Friend
                    </Button>
                  )}
                </div>
              )}

              {isSelf && (
                <div className="rounded-xl border border-card-border bg-card/60 p-4 text-center min-w-[200px] shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">My Profile</p>
                  <p className="text-xs font-semibold mt-1">This is your public card</p>
                  <Link href="/settings/profile">
                    <Button className="w-full mt-3 bg-primary hover:bg-primary/90 text-white font-semibold text-xs h-9">
                      Edit Profile Settings
                    </Button>
                  </Link>
                </div>
              )}

            </div>

          </div>

        </Card>
      </div>
    </>
  );
}
