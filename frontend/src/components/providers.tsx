"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { notificationsApi, getStoredTokens } from "@/lib/api";
import { toast } from "sonner";

function NotificationPoller() {
  const lastCount = useRef<number | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const tokens = getStoredTokens();
      if (!tokens?.access) return;
      try {
        const res = await notificationsApi.list();
        const unread = res.filter((n: any) => !n.is_read);
        
        if (lastCount.current !== null && unread.length > lastCount.current) {
          // Play sound
          const audio = new Audio("https://actions.google.com/sounds/v1/cartoon/pop.ogg");
          audio.volume = 0.5;
          audio.play().catch(() => {});
          
          // Toast the latest one
          const latest = unread[0]; // Assuming list is sorted by newest first
          if (latest) {
            toast(latest.title, {
              description: latest.message,
              action: latest.link ? { label: "View", onClick: () => window.location.href = latest.link } : undefined
            });
          }
        }
        lastCount.current = unread.length;
      } catch (e) {}
    }, 5000); // Poll every 5 seconds for responsiveness

    return () => clearInterval(interval);
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationPoller />
      {children}
    </QueryClientProvider>
  );
}
