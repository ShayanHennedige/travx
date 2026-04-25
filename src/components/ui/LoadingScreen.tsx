"use client";

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({ message = "Loading...", fullScreen = true }: LoadingScreenProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-white z-50 ${
        fullScreen ? "fixed inset-0" : "w-full min-h-[400px]"
      }`}
    >
      {/* Outer glow ring + spinning arc */}
      <div className="relative w-32 h-32 mb-8">
        {/* Background circle */}
        <div className="absolute inset-0 rounded-full border-4 border-accent-100" />

        {/* Spinning progress arc */}
        <svg
          className="absolute inset-0 w-full h-full animate-spin"
          style={{ animationDuration: "1.4s" }}
          viewBox="0 0 128 128"
          fill="none"
        >
          <circle
            cx="64"
            cy="64"
            r="60"
            stroke="url(#serendia-gradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="280"
            strokeDashoffset="210"
          />
          <defs>
            <linearGradient id="serendia-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0c16c" stopOpacity="0" />
              <stop offset="60%" stopColor="#e0c16c" stopOpacity="1" />
              <stop offset="100%" stopColor="#c9a95a" stopOpacity="1" />
            </linearGradient>
          </defs>
        </svg>

        {/* Logo centred inside ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Serendia.png"
            alt="TravX"
            className="w-16 h-16 object-contain rounded-full"
          />
        </div>
      </div>

      {/* Text */}
      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">
        {message}
      </p>
      <p className="text-[11px] text-slate-300 font-medium mt-1 uppercase tracking-widest">
        TravX Travel Management
      </p>
    </div>
  );
}

/** Inline skeleton row — for table/list placeholders */
export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-6 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <div className="h-4 bg-slate-100 rounded-lg flex-1" style={{ opacity: 1 - i * 0.15 }} />
          <div className="h-4 bg-slate-100 rounded-lg w-24" style={{ opacity: 1 - i * 0.15 }} />
          <div className="h-4 bg-slate-100 rounded-lg w-16" style={{ opacity: 1 - i * 0.15 }} />
        </div>
      ))}
    </div>
  );
}
