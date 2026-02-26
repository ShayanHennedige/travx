"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: DashboardIcon },
  { name: "Inquiries", href: "/inquiries", icon: InquiriesIcon },
  { name: "Itineraries", href: "/itineraries", icon: ItinerariesIcon },
  { name: "Vouchers", href: "/vouchers", icon: VouchersIcon },
  { name: "Drivers", href: "/drivers", icon: DriversIcon },
  { name: "Analytics", href: "/analytics", icon: AnalyticsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [companyName, setCompanyName] = useState("TravX");
  const [logoUrl, setLogoUrl] = useState("/Travex_logo.png");

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
    await supabase.auth.signOut();
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
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-surface-900 light:bg-white text-white light:text-surface-900 border-r border-surface-700 light:border-surface-200">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-20 items-center justify-center border-b border-surface-700 light:border-surface-200 bg-surface-950/80 light:bg-surface-50">
          <div className="relative flex-1 h-full">
            <Image
              src={logoUrl}
              alt={`${companyName} Logo`}
              fill
              className="object-contain p-2"
              priority
              unoptimized={logoUrl.startsWith("data:")}
            />
          </div>
          <h1 className="text-white light:text-surface-900 text-xl font-bold tracking-tight text-left flex-[2]">{companyName}</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? "bg-accent-500 text-white light:text-black"
                    : "text-surface-400 light:text-surface-600 hover:bg-surface-800 light:hover:bg-surface-100 hover:text-white light:hover:text-surface-900"
                  }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Form Links */}
        <div className="px-3 pb-3 space-y-2">
          <button
            onClick={copyInquiryLink}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-surface-300 light:text-surface-600 hover:bg-surface-700 light:hover:bg-surface-100 hover:text-white light:hover:text-surface-900 transition-colors border border-dashed border-surface-600 light:border-surface-300 bg-surface-800/40 light:bg-surface-50"
          >
            <LinkIcon className="h-5 w-5 flex-shrink-0" />
            Copy Inquiry Form Link
          </button>
          <button
            onClick={copyFeedbackLink}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-surface-300 light:text-surface-600 hover:bg-surface-700 light:hover:bg-surface-100 hover:text-white light:hover:text-surface-900 transition-colors border border-dashed border-surface-600 light:border-surface-300 bg-surface-800/40 light:bg-surface-50"
          >
            <LinkIcon className="h-5 w-5 flex-shrink-0" />
            Copy Feedback Form Link
          </button>
          <button
            onClick={copyHotelRatesLink}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-surface-300 light:text-surface-600 hover:bg-surface-700 light:hover:bg-surface-100 hover:text-white light:hover:text-surface-900 transition-colors border border-dashed border-surface-600 light:border-surface-300 bg-surface-800/40 light:bg-surface-50"
          >
            <LinkIcon className="h-5 w-5 flex-shrink-0" />
            Copy Hotel Rates Link
          </button>
        </div>

        {/* Profile & Sign out */}
        <div className="p-3 border-t border-surface-800 light:border-surface-200 space-y-2">
          <Link
            href="/profile"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === "/profile" || pathname.startsWith("/profile/")
                ? "bg-accent-500 text-white light:text-black"
                : "text-surface-400 light:text-surface-600 hover:bg-surface-800 light:hover:bg-surface-100 hover:text-white light:hover:text-surface-900"
            }`}
          >
            <ProfileIcon className="h-5 w-5 flex-shrink-0" />
            Profile
          </Link>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-surface-400 light:text-surface-600 hover:bg-surface-800 light:hover:bg-surface-100 hover:text-white light:hover:text-surface-900 transition-colors"
          >
            <LogoutIcon className="h-5 w-5 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
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

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
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
