"use client";

import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar />
      <main className="ml-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
