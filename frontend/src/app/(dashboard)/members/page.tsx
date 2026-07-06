"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatApi, membersApi, getStoredUser, User } from "@/lib/api";
import {
  UserPlus,
  UserCheck,
  Clock,
  Check,
  X,
  MessageSquare,
  Search,
  AlertCircle,
  Inbox
} from "lucide-react";
import Link from "next/link";

export default function MembersPage() {
  const qc = useQueryClient();
  const currentUser = getStoredUser();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  // Mutations
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
    return !!(user.is_superuser || (user.role && ["super_admin", "president"].includes(user.role.slug)));
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
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
            : "bg-rose-500/10 border-rose-500/30 text-rose-400"
        }`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-xs font-semibold">{feedback.text}</span>
        </div>
      )}

      <div className="p-6">
        
        {/* Search & Filter Bar */}
        <div className="relative mb-6 max-w-md">
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

              return (
                <Card 
                  key={member.id} 
                  className="flex flex-col justify-between border border-card-border/60 hover:border-primary/30 bg-card hover:bg-card/90 transition-all shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    {/* Link Avatar and Name for detail view */}
                    <Link href={`/members/${member.id}`} className="shrink-0 group">
                      <div className="h-12 w-12 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm transition-transform group-hover:scale-105 select-none">
                        {member.first_name?.[0]}
                        {member.last_name?.[0]}
                      </div>
                    </Link>
                    
                    <div className="min-w-0 flex-1">
                      <Link href={`/members/${member.id}`} className="hover:underline">
                        <p className="font-semibold text-sm truncate text-foreground leading-none">
                          {member.first_name} {member.last_name}
                        </p>
                      </Link>
                      <p className="text-xs text-muted truncate mt-1">{member.email}</p>
                      <p className="text-[11px] text-primary font-medium mt-1">
                        {member.role?.name || "Member"}
                      </p>
                    </div>
                  </div>

                  {/* Branch and College Info */}
                  {(member.branch || member.college) && (
                    <p className="text-xs text-muted-foreground mt-3 truncate border-t border-card-border/20 pt-3">
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

                    {!isSelf && (
                      <div className="flex items-center gap-2">
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
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
