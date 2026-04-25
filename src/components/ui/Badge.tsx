"use client";

import { InquiryStatus } from "@/types/database";

// Generic Badge component
interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "blue" | "purple" | "green" | "yellow" | "red" | "orange";
  className?: string;
}

const variantClasses: Record<string, string> = {
  primary: "bg-[#E04344] bg-opacity-10 text-[#E04344]",
  secondary: "bg-surface-100 text-surface-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  green: "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-700",
  red: "bg-red-200 text-red-900",
  orange: "bg-orange-100 text-orange-700",
};

export function Badge({ children, variant = "secondary", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
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
