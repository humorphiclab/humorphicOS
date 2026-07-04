"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatApi } from "@/lib/api";

export default function ChatPage() {
  const qc = useQueryClient();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const { data: channels } = useQuery({ queryKey: ["channels"], queryFn: chatApi.channels });
  const { data: messages } = useQuery({
    queryKey: ["channel-messages", selectedChannel],
    queryFn: () => chatApi.channelMessages(selectedChannel!),
    enabled: !!selectedChannel,
  });

  const sendMutation = useMutation({
    mutationFn: () => chatApi.sendChannelMessage(selectedChannel!, message),
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["channel-messages", selectedChannel] });
    },
  });

  return (
    <>
      <TopBar title="Team Chat" />
      <div className="p-6 flex gap-4 h-[calc(100vh-4rem)]">
        <Card className="w-56 shrink-0 p-3 space-y-1">
          <p className="text-xs font-semibold text-muted uppercase px-2 mb-2">Channels</p>
          {(channels ?? []).map((ch) => (
            <button
              key={ch.id}
              onClick={() => setSelectedChannel(ch.slug)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${selectedChannel === ch.slug ? "bg-primary/15 text-primary" : "hover:bg-card-border/30 text-muted"}`}
            >
              # {ch.name}
            </button>
          ))}
          {!channels?.length && <p className="text-xs text-muted px-2">No channels yet</p>}
        </Card>

        <Card className="flex-1 flex flex-col p-0 overflow-hidden">
          {selectedChannel ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(messages ?? []).map((m) => (
                  <div key={m.id} className="text-sm">
                    <span className="font-medium text-primary">{m.author_detail?.first_name}: </span>
                    {m.content}
                  </div>
                ))}
              </div>
              <div className="border-t border-card-border p-3 flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && message && sendMutation.mutate()}
                />
                <Button onClick={() => sendMutation.mutate()} disabled={!message || sendMutation.isPending}>Send</Button>
              </div>
            </>
          ) : (
            <p className="text-muted text-sm m-auto">Select a channel to start chatting</p>
          )}
        </Card>
      </div>
    </>
  );
}
