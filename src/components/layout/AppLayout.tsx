"use client";

import { Sidebar } from "./Sidebar";
import { PageTransition } from "@/components/ui/PageTransition";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>
      <Sidebar />
      <main className="ml-64">
        <div className="p-8">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
