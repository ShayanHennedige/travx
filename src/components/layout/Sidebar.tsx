"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/ThemeContext";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: DashboardIcon },
  { name: "Inquiries", href: "/inquiries", icon: InquiriesIcon },
  { name: "Itineraries", href: "/itineraries", icon: ItinerariesIcon },
  { name: "Operations", href: "/operations", icon: OperationsIcon },
  { name: "Vouchers", href: "/vouchers", icon: VouchersIcon },
  { name: "Drivers", href: "/drivers", icon: DriversIcon },
  { name: "Tour Guides", href: "/tour-guides", icon: TourGuideIcon },
  { name: "Analytics", href: "/analytics", icon: AnalyticsIcon },
  { name: "P&L", href: "/pnl", icon: PnlIcon },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [companyName, setCompanyName] = useState("TraveX");
  const [logoUrl, setLogoUrl] = useState(process.env.NEXT_PUBLIC_LOGO_URL || "/Serendia.png");
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    // Load saved settings from localStorage
    const savedCompanyName = localStorage.getItem("companyName");
    const savedLogoUrl = localStorage.getItem("logoUrl");
    if (savedCompanyName) {
      setCompanyName(savedCompanyName);
    }
    if (savedLogoUrl) {
      setLogoUrl(savedLogoUrl);
    }

    // Listen for storage changes to update when profile page saves
    const handleStorageChange = () => {
      const savedCompanyName = localStorage.getItem("companyName");
      const savedLogoUrl = localStorage.getItem("logoUrl");
      if (savedCompanyName) {
        setCompanyName(savedCompanyName);
      }
      if (savedLogoUrl) {
        setLogoUrl(savedLogoUrl);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // Also listen for custom events (same-tab updates)
    window.addEventListener("companySettingsUpdated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("companySettingsUpdated", handleStorageChange);
    };
  }, []);

  const handleSignOut = async () => {
    const { sessionManager } = await import("@/lib/auth/session-manager");

    // Clear session tracking
    sessionManager.clearSession();

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Redirect to login
    router.push("/login");
    router.refresh();
  };

  const copyInquiryLink = () => {
    const link = `${window.location.origin}/inquiry`;
    navigator.clipboard.writeText(link);
    alert("Inquiry form link copied to clipboard!");
  };

  const copyFeedbackLink = () => {
    const link = `${window.location.origin}/feedback`;
    navigator.clipboard.writeText(link);
    alert("Feedback form link copied to clipboard!");
  };

  const copyHotelRatesLink = () => {
    const link = `${window.location.origin}/hotel-rates`;
    navigator.clipboard.writeText(link);
    alert("Hotel rates form link copied to clipboard!");
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-surface-950/70 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-64 bg-surface-900 text-white shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-surface-800 ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex h-full flex-col relative">
          {/* Close button - mobile only */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-lg bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700 transition-colors lg:hidden"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Logo */}
          <div className="flex h-20 items-center gap-3 px-4 border-b border-surface-800 bg-surface-950">
            <div className="relative w-11 h-11 shrink-0 rounded-lg overflow-hidden ring-1 ring-accent-700/40">
              <Image
                src={logoUrl}
                alt={`${companyName} Logo`}
                fill
                className="object-contain"
                priority
                unoptimized={logoUrl.startsWith("data:")}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-base font-bold tracking-tight truncate">{companyName}</h1>
              <p className="text-surface-400 text-xs font-medium">Travel Management</p>
            </div>
            {/* Desktop Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="hidden lg:flex p-1.5 rounded-lg text-surface-500 hover:text-accent-400 hover:bg-surface-800 transition-all duration-200"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
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

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${isActive
                    ? "bg-accent-500 text-black shadow-lg shadow-accent-500/20"
                    : "text-surface-400 hover:bg-surface-800 hover:text-white"
                    }`}
                >
                  <item.icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${isActive ? "text-black" : "text-surface-500 group-hover:text-white"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Form Links */}
          <div className="px-3 pb-3 space-y-1.5 border-t border-surface-800 pt-3">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-surface-600 mb-2">Quick Links</p>
            <button
              onClick={copyInquiryLink}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-surface-500 hover:bg-surface-800 hover:text-accent-400 transition-all duration-200 border border-dashed border-surface-700 hover:border-accent-700"
            >
              <LinkIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Inquiry Link</span>
            </button>
            <button
              onClick={copyFeedbackLink}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-surface-500 hover:bg-surface-800 hover:text-accent-400 transition-all duration-200 border border-dashed border-surface-700 hover:border-accent-700"
            >
              <LinkIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Feedback Link</span>
            </button>
            <button
              onClick={copyHotelRatesLink}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-surface-500 hover:bg-surface-800 hover:text-accent-400 transition-all duration-200 border border-dashed border-surface-700 hover:border-accent-700"
            >
              <LinkIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Hotel Rates Link</span>
            </button>
          </div>

          {/* Profile & Sign out */}
          <div className="p-3 border-t border-surface-800 space-y-0.5">
            <Link
              href="/profile"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${pathname === "/profile" || pathname.startsWith("/profile/")
                ? "bg-accent-500 text-black shadow-lg shadow-accent-500/20"
                : "text-surface-400 hover:bg-surface-800 hover:text-white"
                }`}
            >
              <ProfileIcon className={`h-4 w-4 shrink-0 ${pathname === "/profile" || pathname.startsWith("/profile/") ? "text-black" : "text-surface-500"}`} />
              Profile
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-surface-400 hover:bg-accent-500/10 hover:text-accent-400 transition-all duration-200"
            >
              <LogoutIcon className="h-4 w-4 shrink-0 text-surface-500" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function InquiriesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function ItinerariesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  );
}

function VouchersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
    </svg>
  );
}

function DriversIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function AnalyticsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function OperationsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function PnlIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

function TourGuideIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  );
}
