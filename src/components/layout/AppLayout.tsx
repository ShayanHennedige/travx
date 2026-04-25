"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import Link from "next/link";
import Image from "next/image";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(process.env.NEXT_PUBLIC_LOGO_URL || "/Serendia.png");
  const [companyName, setCompanyName] = useState("TravX");

  useEffect(() => {
    const savedLogo = localStorage.getItem("logoUrl");
    const savedName = localStorage.getItem("companyName");
    if (savedLogo) setLogoUrl(savedLogo);
    if (savedName) setCompanyName(savedName);

    // Prevent scrolling when mobile sidebar is open
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isSidebarOpen]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-surface-900 text-surface-100 border-b border-surface-800 light:bg-white light:text-surface-900 light:border-surface-200 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg bg-white/5 text-surface-400 hover:text-surface-100 light:bg-surface-100 light:text-surface-600 light:hover:text-surface-900"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="relative w-8 h-8">
            <Image
              src={logoUrl}
              alt="Logo"
              fill
              className="object-contain"
              unoptimized={logoUrl.startsWith("data:")}
            />
          </div>
          <span className="font-bold text-sm tracking-tight">{companyName}</span>
        </div>
      </div>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
