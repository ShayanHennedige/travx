"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { sessionManager } from "./session-manager";
import { createClient } from "@/lib/supabase/client";

export function useSessionTimeout() {
    const router = useRouter();

    const handleSessionExpire = useCallback(() => {
        // Clear session data
        sessionManager.clearSession();

        // Sign out from Supabase
        const supabase = createClient();
        supabase.auth.signOut().then(() => {
            // Redirect to login
            router.push("/login?reason=session_expired");
        });
    }, [router]);

    const handleSessionWarning = useCallback(() => {
        // You can show a toast/notification here
        console.warn("Session will expire soon due to inactivity");
        // Optional: Show a modal or toast to the user
    }, []);

    useEffect(() => {
        // Start session tracking
        sessionManager.start(handleSessionExpire, handleSessionWarning);

        // Cleanup on unmount
        return () => {
            sessionManager.stop();
        };
    }, [handleSessionExpire, handleSessionWarning]);

    // Check if session is expired on mount
    useEffect(() => {
        if (sessionManager.isSessionExpired()) {
            handleSessionExpire();
        }
    }, [handleSessionExpire]);
}

export async function logout() {
    const supabase = createClient();

    // Clear session tracking
    sessionManager.clearSession();

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Redirect to login
    window.location.href = "/login";
}
