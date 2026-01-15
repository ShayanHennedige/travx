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
    <header className="mb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-surface-900">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-surface-500">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {action}
          {profile && (
            <div className="flex items-center gap-3 pl-4 border-l border-surface-200">
              <div className="text-right">
                <p className="text-sm font-medium text-surface-900">
                  {profile.full_name || profile.email}
                </p>
                <p className="text-xs text-surface-500 capitalize">
                  {profile.role}
                </p>
              </div>
              <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700">
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
