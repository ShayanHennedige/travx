"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSessionTimeout } from "./use-session-timeout";

export function SessionProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // List of public paths that don't need session tracking
    const publicPaths = ["/inquiry", "/feedback", "/login", "/auth", "/hotel-rates"];
    const isPublicPath = publicPaths.some(
        (path) => pathname === path || pathname.startsWith(path + "/")
    );

    // Only enable session timeout on protected pages
    useSessionTimeout();

    // Don't render session tracking UI on public pages
    if (isPublicPath) {
        return <>{children}</>;
    }

    return <>{children}</>;
}
