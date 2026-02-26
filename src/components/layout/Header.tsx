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
  const supabase = createClient();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (data) {
          setProfile(data);
        }
      }
    }

    loadProfile();
  }, [supabase]);

  return (
    <header className="mb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-surface-100 light:text-surface-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-surface-400 light:text-surface-500">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-ghost h-9 w-9 rounded-full border border-transparent hover:bg-accent-500 hover:text-black hover:border-accent-500"
            aria-label="Toggle theme"
          >
            <span className="text-xs font-medium">
              {theme === "dark" ? "D" : "L"}
            </span>
          </button>
          {action}
          {profile && (
            <div className="flex items-center gap-3 pl-4 border-l border-surface-700 light:border-surface-200">
              <div className="text-right">
                <p className="text-sm font-medium text-surface-100 light:text-surface-900">
                  {profile.full_name || profile.email}
                </p>
                <p className="text-xs text-surface-500 light:text-surface-500 capitalize">
                  {profile.role}
                </p>
              </div>
              <div className="h-9 w-9 rounded-full bg-primary-900/40 light:bg-primary-100 flex items-center justify-center">
                <span className="text-sm font-medium text-primary-300 light:text-primary-700">
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
