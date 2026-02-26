"use client";

import { InquiryStatus, InquiryPriority } from "@/types/database";

// Generic Badge component
interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "blue" | "purple" | "green" | "yellow" | "red" | "orange";
  className?: string;
}

const variantClasses: Record<string, string> = {
  primary: "bg-primary-900/50 light:bg-primary-100 text-primary-300 light:text-primary-800 border border-primary-700/50 light:border-primary-200",
  secondary: "bg-surface-800 light:bg-surface-200 text-surface-300 light:text-surface-700 border border-surface-600 light:border-surface-300",
  blue: "bg-primary-900/50 light:bg-primary-100 text-primary-300 light:text-primary-800 border border-primary-700/50 light:border-primary-200",
  purple: "bg-purple-900/50 light:bg-purple-100 text-purple-300 light:text-purple-800 border border-purple-700/50 light:border-purple-200",
  green: "bg-green-900/50 light:bg-green-100 text-green-300 light:text-green-800 border border-green-700/50 light:border-green-200",
  yellow: "bg-accent-900/50 light:bg-accent-100 text-accent-300 light:text-accent-800 border border-accent-700/50 light:border-accent-200",
  red: "bg-red-900/50 light:bg-red-100 text-red-300 light:text-red-800 border border-red-700/50 light:border-red-200",
  orange: "bg-orange-900/50 light:bg-orange-100 text-orange-300 light:text-orange-800 border border-orange-700/50 light:border-orange-200",
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

interface PriorityBadgeProps {
  priority: InquiryPriority;
}

const priorityLabels: Record<InquiryPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const priorityClasses: Record<InquiryPriority, string> = {
  low: "priority-low",
  medium: "priority-medium",
  high: "priority-high",
  urgent: "priority-urgent",
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span className={`badge ${priorityClasses[priority]}`}>
      {priorityLabels[priority]}
    </span>
  );
}
