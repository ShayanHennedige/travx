"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types/database";
import { useTheme } from "@/lib/ThemeContext";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Header({ title, subtitle, action }: HeaderProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          // Silently fail if profiles table doesn't exist or row is missing - profile is optional.
          if (!error && data) {
            setProfile(data);
          }
        }
      } catch (err) {
        // Profiles table may not exist - that's okay, just don't show profile info
      }
    }

    loadProfile();
  }, []);

  return (
    <header className="mb-8 md:mb-12">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm md:text-base text-slate-500 font-medium">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto justify-between sm:justify-end">
          {action && <div className="flex-1 sm:flex-none">{action}</div>}
          <button
            type="button"
            onClick={toggleTheme}
            className="h-10 w-10 shrink-0 rounded-full border border-surface-200 bg-white text-surface-600 hover:bg-accent-500 hover:text-black hover:border-accent-500 transition-colors"
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? (
              <svg className="mx-auto h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414m11.314 0-1.414-1.414M7.05 7.05 5.636 5.636M12 7a5 5 0 100 10 5 5 0 000-10z" />
              </svg>
            ) : (
              <svg className="mx-auto h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
              </svg>
            )}
          </button>
          {profile && (
            <div className="flex items-center gap-3 md:gap-4 pl-4 md:pl-6 border-l border-slate-200">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-900 truncate max-w-37.5">
                  {profile.full_name || profile.email}
                </p>
                <p className="text-xs text-slate-500 font-medium capitalize">
                  {profile.role}
                </p>
              </div>
              <div className="h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center shadow-sm">
                <span className="text-sm font-bold text-primary-700">
                  {(profile.full_name || profile.email).charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

  );
}
