"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiApi } from "@/lib/api";
import { Brain, Sparkles } from "lucide-react";

export default function AiPage() {
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);

  const { data: insights } = useQuery({ queryKey: ["ai-insights"], queryFn: aiApi.insights });

  const chatMutation = useMutation({
    mutationFn: () => aiApi.chat(message, sessionId),
    onSuccess: (data) => {
      setSessionId(data.session_id);
      setChatHistory((h) => [...h, { role: "user", content: message }, { role: "assistant", content: data.reply }]);
      setMessage("");
    },
  });

  const summarizeMutation = useMutation({
    mutationFn: (type: string) => aiApi.summarize(type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-insights"] }),
  });

  return (
    <>
      <TopBar title="AI Assistant" />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 flex flex-col h-[calc(100vh-8rem)]">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">HumorphicOS AI Chat</h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {chatHistory.length === 0 && (
              <p className="text-muted text-sm">Ask about tasks, projects, meetings, or club operations.</p>
            )}
            {chatHistory.map((m, i) => (
              <div key={i} className={`text-sm rounded-lg px-3 py-2 ${m.role === "user" ? "bg-primary/10 ml-8" : "bg-card-border/30 mr-8"}`}>
                {m.content}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Ask anything..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && message && chatMutation.mutate()}
            />
            <Button onClick={() => chatMutation.mutate()} disabled={!message || chatMutation.isPending}>Send</Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Quick Summaries</h3>
            <div className="space-y-2">
              <Button variant="secondary" size="sm" className="w-full" onClick={() => summarizeMutation.mutate("daily")} disabled={summarizeMutation.isPending}>
                Summarize Daily Updates
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold mb-3">Recent Insights</h3>
            <div className="space-y-3">
              {(insights ?? []).slice(0, 5).map((ins) => (
                <div key={ins.id} className="text-sm">
                  <p className="font-medium">{ins.title}</p>
                  <p className="text-muted line-clamp-2 mt-1">{ins.content}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
