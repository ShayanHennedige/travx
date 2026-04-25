"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface InquiryQuickEditProps {
  inquiryId: string;
  field: "notes" | "client_desires";
  label: string;
  initialValue: string | null;
}

export function InquiryQuickEdit({ inquiryId, field, label, initialValue }: InquiryQuickEditProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("inquiries")
      .update({ [field]: value.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", inquiryId);

    if (err) {
      setError("Failed to save. Please try again.");
    } else {
      setIsEditing(false);
      router.refresh();
    }
    setSaving(false);
  };

  if (!isEditing) {
    return (
      <div className="group relative">
        {initialValue ? (
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 italic text-slate-700 text-sm leading-relaxed">
            &ldquo;{initialValue}&rdquo;
          </div>
        ) : (
          <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm italic">
            No {label.toLowerCase()} recorded yet.
          </div>
        )}
        <button
          onClick={() => setIsEditing(true)}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white rounded-lg border border-slate-200 shadow-sm hover:bg-primary-50 hover:border-primary-200"
          title={`Edit ${label}`}
        >
          <svg className="w-3.5 h-3.5 text-slate-500 hover:text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        className="w-full px-4 py-3 text-sm text-slate-700 bg-white border border-primary-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none leading-relaxed"
        placeholder={`Enter ${label.toLowerCase()}...`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-xs font-bold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={() => { setValue(initialValue || ""); setIsEditing(false); setError(null); }}
          className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
