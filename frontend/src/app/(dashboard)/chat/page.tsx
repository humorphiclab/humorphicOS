"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatApi, getStoredUser, User } from "@/lib/api";
import { MessageSquare, Users, Send } from "lucide-react";

export default function ChatPage() {
  const qc = useQueryClient();
  const currentUser = getStoredUser();

  const [mode, setMode] = useState<"channels" | "dms">("channels");
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");

  const { data: channels } = useQuery({
    queryKey: ["channels"],
    queryFn: chatApi.channels,
    enabled: mode === "channels",
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: chatApi.dmContacts,
    enabled: mode === "dms",
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

  const sendChannelMessageMutation = useMutation({
    mutationFn: () => chatApi.sendChannelMessage(selectedChannel!, message),
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["channel-messages", selectedChannel] });
    },
  });

  const sendDMMessageMutation = useMutation({
    mutationFn: () => chatApi.sendDM(selectedUser!.id, message),
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["dm-messages", selectedUser?.id] });
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    if (mode === "channels" && selectedChannel) {
      sendChannelMessageMutation.mutate();
    } else if (mode === "dms" && selectedUser) {
      sendDMMessageMutation.mutate();
    }
  };

  const activeMessages = mode === "channels" ? channelMessages : dmMessages;
  const isSendPending = sendChannelMessageMutation.isPending || sendDMMessageMutation.isPending;

  return (
    <>
      <TopBar title="Communications Hub" />
      <div className="p-6 flex gap-4 h-[calc(100vh-8rem)] max-w-6xl">
        {/* Navigation Sidebar */}
        <Card className="w-64 shrink-0 p-3 flex flex-col space-y-3 overflow-hidden">
          {/* Mode Switcher */}
          <div className="flex bg-muted/40 p-1 rounded-lg border border-card-border/50">
            <button
              onClick={() => {
                setMode("channels");
                setSelectedUser(null);
              }}
              className={`flex-1 text-center py-1 text-xs font-semibold rounded transition-colors ${
                mode === "channels" ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              Channels
            </button>
            <button
              onClick={() => {
                setMode("dms");
                setSelectedChannel(null);
              }}
              className={`flex-1 text-center py-1 text-xs font-semibold rounded transition-colors ${
                mode === "dms" ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              Direct Messages
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {mode === "channels" ? (
              <>
                <p className="text-[10px] font-semibold text-muted uppercase px-2 mb-2 tracking-wider">Channels</p>
                {(channels ?? []).map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChannel(ch.slug)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                      selectedChannel === ch.slug
                        ? "bg-primary/15 text-primary font-medium"
                        : "hover:bg-card-border/30 text-muted hover:text-foreground"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="truncate"># {ch.name}</span>
                  </button>
                ))}
                {!channels?.length && <p className="text-xs text-muted px-2 py-4">No channels joined</p>}
              </>
            ) : (
              <>
                <p className="text-[10px] font-semibold text-muted uppercase px-2 mb-2 tracking-wider">Contacts</p>
                {(contacts ?? [])
                  .filter((u) => u.id !== currentUser?.id)
                  .map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                        selectedUser?.id === u.id
                          ? "bg-primary/15 text-primary font-medium"
                          : "hover:bg-card-border/30 text-muted hover:text-foreground"
                      }`}
                    >
                      <Users className="h-4 w-4 shrink-0" />
                      <div className="truncate">
                        <p className="font-medium text-xs leading-none">{u.first_name} {u.last_name}</p>
                        <p className="text-[10px] text-muted leading-none mt-1">{u.role?.name || "Member"}</p>
                      </div>
                    </button>
                  ))}
                {!contacts?.length && <p className="text-xs text-muted px-2 py-4">No contacts found</p>}
              </>
            )}
          </div>
        </Card>

        {/* Message Area */}
        <Card className="flex-1 flex flex-col p-0 overflow-hidden">
          {(mode === "channels" && selectedChannel) || (mode === "dms" && selectedUser) ? (
            <>
              {/* Active Conversation Header */}
              <div className="border-b border-card-border px-4 py-3 bg-muted/10">
                <p className="font-semibold text-sm">
                  {mode === "channels"
                    ? `# ${channels?.find((c) => c.slug === selectedChannel)?.name ?? selectedChannel}`
                    : `${selectedUser?.first_name} ${selectedUser?.last_name}`}
                </p>
                <p className="text-xs text-muted">
                  {mode === "channels"
                    ? channels?.find((c) => c.slug === selectedChannel)?.description ?? "Channel discussion"
                    : selectedUser?.role?.name || "Member"}
                </p>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!activeMessages || activeMessages.length === 0 ? (
                  <p className="text-muted text-xs text-center py-8">No messages yet. Say hello!</p>
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
                      <div key={m.id} className={`flex flex-col text-sm ${isMe ? "items-end" : "items-start"}`}>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs font-semibold text-muted">{authorName}</span>
                          <span className="text-[10px] text-muted">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div
                          className={`rounded-xl px-4 py-2 max-w-lg break-words ${
                            isMe ? "bg-primary text-white" : "bg-card-border/20 text-foreground"
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
              <div className="border-t border-card-border p-3 flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <Button onClick={handleSend} disabled={!message.trim() || isSendPending} className="gap-1">
                  <Send className="h-4 w-4" /> Send
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-muted p-8">
              <MessageSquare className="h-10 w-10 text-muted/50 mb-3" />
              <p className="text-sm">Select a channel or a contact to start chatting</p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
