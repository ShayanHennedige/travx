"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Select } from "@/components/ui";
import { InquiryStatus } from "@/types/database";
import { inquiryStatuses } from "@/lib/validations/inquiry";

interface InquiryStatusUpdateProps {
  inquiryId: string;
  currentStatus: InquiryStatus;
}

const statusOptions = inquiryStatuses.map((status) => ({
  value: status,
  label: status.charAt(0).toUpperCase() + status.slice(1).replace("_", " "),
}));

export function InquiryStatusUpdate({
  inquiryId,
  currentStatus,
}: InquiryStatusUpdateProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<InquiryStatus>(currentStatus);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (status === currentStatus) {
      setIsEditing(false);
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("inquiries")
        .update({ status })
        .eq("id", inquiryId);

      if (error) throw error;

      // Log activity
      if (user) {
        await supabase.from("inquiry_activities").insert({
          inquiry_id: inquiryId,
          user_id: user.id,
          action: "status_changed",
          details: { from: currentStatus, to: status },
        });
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isEditing) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
        Update Status
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={status}
        onChange={(e) => setStatus(e.target.value as InquiryStatus)}
        options={statusOptions}
        className="w-40"
      />
      <Button
        variant="primary"
        size="sm"
        onClick={handleUpdate}
        loading={loading}
      >
        Save
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setStatus(currentStatus);
          setIsEditing(false);
        }}
      >
        Cancel
      </Button>
    </div>
  );
}
