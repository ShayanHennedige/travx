"use client";

import { InquiryStatus, InquiryPriority } from "@/types/database";

// Generic Badge component
interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "blue" | "purple" | "green" | "yellow" | "red" | "orange";
  className?: string;
}

const variantClasses: Record<string, string> = {
  primary: "bg-primary-100 text-primary-700",
  secondary: "bg-surface-100 text-surface-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  green: "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-700",
  red: "bg-red-100 text-red-700",
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
