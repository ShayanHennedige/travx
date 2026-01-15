"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { InquiryStatus } from "@/types/database";

const statusOptions: { value: InquiryStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "quoted", label: "Quoted" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
];

interface GroupInquiryStatusUpdateProps {
  inquiryId: string;
  currentStatus: InquiryStatus;
}

export function GroupInquiryStatusUpdate({ inquiryId, currentStatus }: GroupInquiryStatusUpdateProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: InquiryStatus) => {
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("group_inquiries")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", inquiryId);

    if (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update status");
    } else {
      router.refresh();
    }

    setIsUpdating(false);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
      >
        {isUpdating ? "Updating..." : "Update Status"}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-surface-200 z-20">
            <div className="py-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-surface-50 transition-colors ${
                    option.value === currentStatus
                      ? "bg-primary-50 text-primary-700 font-medium"
                      : "text-surface-700"
                  }`}
                >
                  {option.label}
                  {option.value === currentStatus && (
                    <span className="float-right text-primary-600">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
