"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { InquiryStatus } from "@/types/database";

const statusOptions: { value: InquiryStatus; label: string; dot: string }[] = [
  { value: "new", label: "New", dot: "bg-blue-500" },
  { value: "in_progress", label: "In Progress", dot: "bg-amber-500" },
  { value: "quoted", label: "Quoted", dot: "bg-purple-500" },
  { value: "confirmed", label: "Confirmed", dot: "bg-green-500" },
  { value: "cancelled", label: "Cancelled", dot: "bg-red-500" },
  { value: "completed", label: "Completed", dot: "bg-slate-500" },
];

interface InquiryStatusUpdateProps {
  inquiryId: string;
  currentStatus: InquiryStatus;
}

export function InquiryStatusUpdate({ inquiryId, currentStatus }: InquiryStatusUpdateProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: InquiryStatus) => {
    if (newStatus === currentStatus) { setIsOpen(false); return; }
    setIsUpdating(true);
    setErrorMsg(null);

    const res = await fetch(`/api/inquiries/${inquiryId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error || "Failed to update status");
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
        onClick={() => { setIsOpen(!isOpen); setErrorMsg(null); }}
        disabled={isUpdating}
        className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm transition-all"
      >
        {isUpdating ? (
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Updating...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Update Status
          </span>
        )}
      </Button>

      {errorMsg && (
        <p className="absolute top-full mt-1 right-0 text-xs text-red-300 bg-slate-800 px-3 py-1.5 rounded-lg whitespace-nowrap z-30 shadow-lg border border-red-500/30">
          ⚠ {errorMsg}
        </p>
      )}

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-slate-100 z-20 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Change Status</p>
            </div>
            <div className="py-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between gap-3 ${
                    option.value === currentStatus
                      ? "bg-primary-50 font-bold text-primary-700"
                      : "font-medium text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${option.dot}`} />
                    {option.label}
                  </span>
                  {option.value === currentStatus && (
                    <svg className="w-4 h-4 text-primary-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
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
