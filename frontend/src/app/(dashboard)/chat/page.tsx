"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatApi, getStoredUser, User, apiFetch, FriendRequest } from "@/lib/api";
import {
  MessageSquare,
  Users,
  Send,
  Search,
  UserPlus,
  UserCheck,
  Clock,
  Check,
  X,
  Inbox,
  AlertCircle,
  Sparkles
} from "lucide-react";

export default function ChatPage() {
  const qc = useQueryClient();
  const currentUser = getStoredUser();
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get("user");

  const [mode, setMode] = useState<"channels" | "dms">("channels");
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dmSubTab, setDmSubTab] = useState<"contacts" | "requests">("contacts");
  
  // Notification / Inline feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showFeedback = (text: string, type: "success" | "error") => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Queries
  const { data: channels } = useQuery({
    queryKey: ["channels"],
    queryFn: () => chatApi.channels(),
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => chatApi.dmContacts(),
    enabled: mode === "dms" || !!initialUserId,
  });

  useEffect(() => {
    if (initialUserId) {
      const uid = parseInt(initialUserId);
      const existing = contacts?.find((c: User) => c.id === uid);
      if (existing) {
        setSelectedUser(existing);
        setMode("dms");
      } else {
        apiFetch<User>(`/auth/users/${uid}/`)
          .then((u) => {
            setSelectedUser(u);
            setMode("dms");
          })
          .catch(() => {});
      }
    }
  }, [initialUserId, contacts]);

  const { data: friendRequests } = useQuery({
    queryKey: ["friend-requests"],
    queryFn: () => chatApi.friendRequests(),
    enabled: mode === "dms" || !!currentUser,
  });

  const { data: searchResults, isPending: isSearching } = useQuery({
    queryKey: ["search-users", searchQuery],
    queryFn: async () => {
      const res = await apiFetch<any>(`/auth/users/?search=${encodeURIComponent(searchQuery)}`);
      return Array.isArray(res) ? res : res.results ?? [];
    },
    enabled: mode === "dms" && searchQuery.trim().length > 0,
  });

  const { data: channelMessages } = useQuery({
    queryKey: ["channel-messages", selectedChannel],
    queryFn: () => chatApi.channelMessages(selectedChannel!),
    enabled: mode === "channels" && !!selectedChannel,
  });

  const { data: dmMessages } = useQuery({
    queryKey: ["dm-messages", selectedUser?.id],
    queryFn: () => chatApi.dmConversation(selectedUser!.id),
    enabled: mode === "dms" && !!selectedUser,
  });

  // Mutations
  const sendChannelMessageMutation = useMutation({
    mutationFn: () => chatApi.sendChannelMessage(selectedChannel!, message),
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["channel-messages", selectedChannel] });
    },
    onError: (err: any) => {
      showFeedback(err.message || "Failed to send message", "error");
    }
  });

  const sendDMMessageMutation = useMutation({
    mutationFn: () => chatApi.sendDM(selectedUser!.id, message),
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["dm-messages", selectedUser?.id] });
    },
    onError: (err: any) => {
      showFeedback(err.message || "Failed to send message", "error");
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

  // Handlers
  const handleSend = () => {
    if (!message.trim()) return;
    if (mode === "channels" && selectedChannel) {
      sendChannelMessageMutation.mutate();
    } else if (mode === "dms" && selectedUser) {
      sendDMMessageMutation.mutate();
    }
  };

  // Check if a user is admin or superuser
  const isAdminOrSuperuser = (user: User | null) => {
    if (!user) return false;
    return !!(user.is_superuser || (user.role && ["super_admin", "president"].includes(user.role.slug)));
  };

  // Helper to determine friendship status of a user
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

  const activeMessages = mode === "channels" ? channelMessages : dmMessages;
  const isSendPending = sendChannelMessageMutation.isPending || sendDMMessageMutation.isPending;

  // Filter incoming pending requests
  const pendingIncomingRequests = (friendRequests ?? []).filter(
    (r) => r.receiver === currentUser?.id && r.status === "pending"
  );

  return (
    <>
      <TopBar title="Communications Hub" />
      
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

      <div className="p-6 flex gap-4 h-[calc(100vh-8rem)] max-w-6xl">
        {/* Navigation Sidebar */}
        <Card className="w-80 shrink-0 p-3 flex flex-col space-y-3 overflow-hidden border border-card-border/60 shadow-lg bg-card/45 backdrop-blur-md">
          {/* Mode Switcher */}
          <div className="flex bg-muted/40 p-1 rounded-lg border border-card-border/50">
            <button
              onClick={() => {
                setMode("channels");
                setSelectedUser(null);
              }}
              className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === "channels" 
                  ? "bg-card text-foreground shadow-sm scale-102" 
                  : "text-muted hover:text-foreground"
              }`}
            >
              Channels
            </button>
            <button
              onClick={() => {
                setMode("dms");
                setSelectedChannel(null);
              }}
              className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === "dms" 
                  ? "bg-card text-foreground shadow-sm scale-102" 
                  : "text-muted hover:text-foreground"
              }`}
            >
              Direct Messages
            </button>
          </div>

          {/* DMs Sub-Tab Switcher (Only in DMs mode) */}
          {mode === "dms" && (
            <div className="flex justify-between border-b border-card-border/40 pb-1 text-xs">
              <button
                onClick={() => setDmSubTab("contacts")}
                className={`pb-1 font-semibold transition-all border-b-2 px-2 ${
                  dmSubTab === "contacts" 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Chats
              </button>
              <button
                onClick={() => setDmSubTab("requests")}
                className={`pb-1 font-semibold transition-all border-b-2 px-2 flex items-center gap-1.5 ${
                  dmSubTab === "requests" 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Requests
                {pendingIncomingRequests.length > 0 && (
                  <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                    {pendingIncomingRequests.length}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Sidebar Main List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {mode === "channels" ? (
              <>
                <p className="text-[10px] font-bold text-muted uppercase px-2 mb-2 tracking-wider">Club Discussion</p>
                {(channels ?? []).map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChannel(ch.slug)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-all flex items-center gap-2 hover:translate-x-0.5 duration-150 ${
                      selectedChannel === ch.slug
                        ? "bg-primary/15 text-primary font-semibold border-l-2 border-primary"
                        : "hover:bg-card-border/30 text-muted hover:text-foreground"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
                    <span className="truncate"># {ch.name}</span>
                  </button>
                ))}
                {!channels?.length && (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 text-muted/30 mx-auto mb-2" />
                    <p className="text-xs text-muted">No channels found</p>
                  </div>
                )}
              </>
            ) : dmSubTab === "contacts" ? (
              <>
                {/* Search club members */}
                <div className="relative mb-3 px-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted/65" />
                  <Input
                    placeholder="Search club members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-8 border-card-border/60 bg-muted/20"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2 h-4 w-4 text-muted/60 hover:text-foreground text-xs"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {searchQuery ? (
                  // Search results list
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted uppercase px-2 tracking-wider">Search Results</p>
                    {isSearching ? (
                      <p className="text-xs text-muted px-2 py-4">Searching...</p>
                    ) : !searchResults?.length ? (
                      <p className="text-xs text-muted px-2 py-4">No members found</p>
                    ) : (
                      searchResults
                        .filter((u: User) => u.id !== currentUser?.id)
                        .map((u: User) => {
                          const { status: friendshipStatus, request, isSender } = getFriendshipState(u);
                          const isDirectAllowed = isAdminOrSuperuser(currentUser) || isAdminOrSuperuser(u);

                          return (
                            <div
                              key={u.id}
                              className="rounded-lg p-2.5 border border-card-border/30 bg-muted/10 flex flex-col space-y-2 hover:bg-muted/25 transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                  {u.first_name[0]}{u.last_name[0]}
                                </div>
                                <div className="truncate flex-1">
                                  <p className="font-semibold text-xs leading-none text-foreground">
                                    {u.first_name} {u.last_name}
                                  </p>
                                  <p className="text-[10px] text-muted leading-none mt-1">
                                    {u.role?.name || "Member"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-card-border/20">
                                <span className="text-[10px] text-muted-foreground">
                                  {isDirectAllowed ? "Admin Bypass" : friendshipStatus ? `Status: ${friendshipStatus}` : "Not Connected"}
                                </span>

                                {isDirectAllowed || friendshipStatus === "accepted" ? (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(u);
                                      setSearchQuery("");
                                    }}
                                    className="text-[10px] h-6 px-2.5 py-0 bg-primary/20 hover:bg-primary/30 text-primary border-none shadow-none font-bold"
                                  >
                                    Chat
                                  </Button>
                                ) : friendshipStatus === "pending" ? (
                                  isSender ? (
                                    <div className="flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded font-semibold border border-amber-500/20">
                                      <Clock className="h-3 w-3" /> Pending
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
                                        className="h-6 w-6 p-0 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-none shadow-none"
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          respondFriendRequestMutation.mutate({
                                            requestId: request!.id,
                                            action: "reject",
                                          })
                                        }
                                        className="h-6 w-6 p-0 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border-none shadow-none"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => sendFriendRequestMutation.mutate(u.id)}
                                    disabled={sendFriendRequestMutation.isPending}
                                    className="text-[10px] h-6 px-2.5 py-0 bg-primary/80 text-white font-bold"
                                  >
                                    <UserPlus className="h-3 w-3 mr-1" /> Add
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                ) : (
                  // Normal Contacts List
                  <>
                    <p className="text-[10px] font-bold text-muted uppercase px-2 mb-2 tracking-wider">Active Conversations</p>
                    {(contacts ?? [])
                      .filter((u) => u.id !== currentUser?.id)
                      .map((u) => (
                        <button
                          key={u.id}
                          onClick={() => setSelectedUser(u)}
                          className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-all flex items-center gap-2 hover:translate-x-0.5 duration-150 ${
                            selectedUser?.id === u.id
                              ? "bg-primary/15 text-primary font-semibold border-l-2 border-primary"
                              : "hover:bg-card-border/30 text-muted hover:text-foreground"
                          }`}
                        >
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {u.first_name[0]}{u.last_name[0]}
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-xs leading-none text-foreground">{u.first_name} {u.last_name}</p>
                            <p className="text-[10px] text-muted leading-none mt-1">{u.role?.name || "Member"}</p>
                          </div>
                        </button>
                      ))}
                    {!contacts?.length && (
                      <div className="text-center py-8">
                        <Users className="h-8 w-8 text-muted/30 mx-auto mb-2" />
                        <p className="text-xs text-muted">No active contacts.<br />Search club members to add friends!</p>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              // Requests Sub-Tab
              <>
                <p className="text-[10px] font-bold text-muted uppercase px-2 mb-2 tracking-wider">Pending Friend Requests</p>
                {pendingIncomingRequests.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-lg p-2.5 border border-card-border/30 bg-muted/10 flex items-center justify-between gap-2 hover:bg-muted/20 transition-all mb-2"
                  >
                    <div className="truncate flex-1">
                      <p className="font-semibold text-xs leading-none text-foreground">
                        {r.sender_detail?.first_name} {r.sender_detail?.last_name}
                      </p>
                      <p className="text-[10px] text-muted leading-none mt-1">
                        {r.sender_detail?.role?.name || "Member"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        onClick={() =>
                          respondFriendRequestMutation.mutate({
                            requestId: r.id,
                            action: "accept",
                          })
                        }
                        className="h-7 px-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-none shadow-none font-bold text-[10px]"
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          respondFriendRequestMutation.mutate({
                            requestId: r.id,
                            action: "reject",
                          })
                        }
                        className="h-7 px-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border-none shadow-none font-bold text-[10px]"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingIncomingRequests.length === 0 && (
                  <div className="text-center py-8">
                    <Inbox className="h-8 w-8 text-muted/30 mx-auto mb-2" />
                    <p className="text-xs text-muted">No pending requests</p>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Message Area */}
        <Card className="flex-1 flex flex-col p-0 overflow-hidden border border-card-border/60 shadow-lg bg-card/65 backdrop-blur-md">
          {(mode === "channels" && selectedChannel) || (mode === "dms" && selectedUser) ? (
            <>
              {/* Active Conversation Header */}
              <div className="border-b border-card-border px-5 py-4 bg-muted/15 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    {mode === "channels"
                      ? `# ${channels?.find((c) => c.slug === selectedChannel)?.name ?? selectedChannel}`
                      : `${selectedUser?.first_name} ${selectedUser?.last_name}`}
                    {mode === "dms" && isAdminOrSuperuser(selectedUser) && (
                      <span className="text-[10px] bg-primary/20 text-primary font-bold px-1.5 py-0.5 rounded">
                        Leadership
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {mode === "channels"
                      ? channels?.find((c) => c.slug === selectedChannel)?.description ?? "Channel discussion"
                      : selectedUser?.role?.name || "Member"}
                  </p>
                </div>
                
                {mode === "dms" && (
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-[11px]">Direct Line</span>
                  </div>
                )}
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-transparent to-muted/5">
                {!activeMessages || activeMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted py-12">
                    <Sparkles className="h-8 w-8 text-primary/30 mb-2 animate-bounce" />
                    <p className="text-xs">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  (activeMessages as any[]).map((m) => {
                    const isMe =
                      mode === "channels"
                        ? m.author_detail?.id === currentUser?.id
                        : m.sender_detail?.id === currentUser?.id;
                    const authorName =
                      mode === "channels"
                        ? `${m.author_detail?.first_name} ${m.author_detail?.last_name}`
                        : `${m.sender_detail?.first_name} ${m.sender_detail?.last_name}`;

                    return (
                      <div key={m.id} className={`flex flex-col text-sm ${isMe ? "items-end" : "items-start"} transition-all`}>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-[11px] font-bold text-muted-foreground">{authorName}</span>
                          <span className="text-[9px] text-muted">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div
                          className={`rounded-2xl px-4 py-2.5 max-w-lg break-words shadow-sm ${
                            isMe 
                              ? "bg-primary text-white font-medium" 
                              : "bg-card-border/25 text-foreground border border-card-border/10"
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input Box */}
              <div className="border-t border-card-border p-4 bg-muted/10 flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="bg-card border-card-border/80 shadow-inner h-10"
                />
                <Button 
                  onClick={handleSend} 
                  disabled={!message.trim() || isSendPending} 
                  className="gap-1.5 h-10 px-5 bg-primary text-white font-bold transition-all shadow-md active:scale-95 shrink-0"
                >
                  <Send className="h-4 w-4" /> Send
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-muted p-8">
              <div className="h-14 w-14 rounded-full bg-primary/5 flex items-center justify-center mb-4 border border-primary/10">
                <MessageSquare className="h-6 w-6 text-primary/60" />
              </div>
              <h3 className="text-foreground font-bold text-sm">Select a Conversation</h3>
              <p className="text-xs text-muted mt-1 text-center max-w-xs">
                Choose a channel or click on Direct Messages and search for a club member to start chatting.
              </p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
