"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/lib/ThemeContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(process.env.NEXT_PUBLIC_LOGO_URL || "/Serendia.png");
  const [companyName, setCompanyName] = useState("TraveX");
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const savedLogo = localStorage.getItem("logoUrl");
    const savedName = localStorage.getItem("companyName");
    if (savedLogo) setLogoUrl(savedLogo);
    if (savedName) setCompanyName(savedName);

    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isSidebarOpen]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-surface-900 text-white border-b border-surface-800 sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <span className="font-bold text-sm tracking-tight text-white">{companyName}</span>
        </div>
        {/* Mobile Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-surface-800 text-surface-400 hover:text-accent-400 hover:bg-surface-700 transition-all duration-200"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
