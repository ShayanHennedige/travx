"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types/database";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Header({ title, subtitle, action }: HeaderProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const supabase = createClient();

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
    <header className="mb-8 md:mb-10">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight text-surface-100 light:text-surface-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm md:text-base text-surface-400 light:text-surface-500 font-medium">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          {action && <div className="flex-1 sm:flex-none">{action}</div>}
          {profile && (
            <div className="flex items-center gap-3 pl-4 border-l border-surface-700 light:border-surface-200">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-surface-100 light:text-surface-900 truncate max-w-37.5">
                  {profile.full_name || profile.email}
                </p>
                <p className="text-xs text-surface-400 light:text-surface-500 font-medium capitalize">
                  {profile.role}
                </p>
              </div>
              <div className="h-9 w-9 shrink-0 rounded-full bg-primary-900/60 light:bg-primary-100 border border-primary-700/50 light:border-primary-200 flex items-center justify-center ring-2 ring-accent-500/20">
                <span className="text-sm font-bold text-primary-300 light:text-primary-700">
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

