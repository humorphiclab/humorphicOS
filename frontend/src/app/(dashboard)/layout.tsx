"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredTokens } from "@/lib/api";
import { Sidebar, TopBar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!getStoredTokens()) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 min-h-screen">{children}</main>
    </div>
  );
}

export { TopBar };
