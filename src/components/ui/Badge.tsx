"use client";

import { InquiryStatus } from "@/types/database";

// Generic Badge component
interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "blue" | "purple" | "green" | "yellow" | "red" | "orange";
  className?: string;
}

const variantClasses: Record<string, string> = {
  primary:   "bg-primary-900/50 text-primary-300 ring-1 ring-primary-700/50 light:bg-primary-100 light:text-primary-800 light:ring-primary-200",
  secondary: "bg-surface-700 text-surface-300 ring-1 ring-surface-600 light:bg-surface-100 light:text-surface-700 light:ring-surface-200",
  blue:      "bg-primary-900/60 text-primary-300 ring-1 ring-primary-700/50 light:bg-primary-100 light:text-primary-800 light:ring-primary-200",
  purple:    "bg-purple-900/50 text-purple-300 ring-1 ring-purple-700/50 light:bg-purple-100 light:text-purple-800 light:ring-purple-200",
  green:     "bg-green-900/50 text-green-300 ring-1 ring-green-700/50 light:bg-green-100 light:text-green-800 light:ring-green-200",
  yellow:    "bg-accent-900/50 text-accent-300 ring-1 ring-accent-700/50 light:bg-accent-100 light:text-accent-900 light:ring-accent-200",
  red:       "bg-accent-900/50 text-accent-300 ring-1 ring-accent-700/50 light:bg-accent-100 light:text-accent-800 light:ring-accent-200",
  orange:    "bg-orange-900/50 text-orange-300 ring-1 ring-orange-700/50 light:bg-orange-100 light:text-orange-800 light:ring-orange-200",
};

export function Badge({ children, variant = "secondary", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: InquiryStatus;
}

const statusLabels: Record<InquiryStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  quoted: "Quoted",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

const statusClasses: Record<InquiryStatus, string> = {
  new: "badge-new",
  in_progress: "badge-in-progress",
  quoted: "badge-quoted",
  confirmed: "badge-confirmed",
  cancelled: "badge-cancelled",
  completed: "badge-completed",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`badge ${statusClasses[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
