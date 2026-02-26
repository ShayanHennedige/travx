"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

interface GenerateFeedbackLinkButtonProps {
  inquiryId: string;
  itineraryId?: string | null;
  tourId?: string | null;
  groupInquiryId?: string | null;
}

export function GenerateFeedbackLinkButton({
  inquiryId,
  itineraryId,
  tourId,
  groupInquiryId,
}: GenerateFeedbackLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const generateFeedbackLink = (includeItinerary: boolean = false) => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    
    if (groupInquiryId) {
      params.append("group_inquiry_id", groupInquiryId);
    } else {
      params.append("inquiry_id", inquiryId);
    }
    
    if (includeItinerary && itineraryId) {
      params.append("itinerary_id", itineraryId);
    }
    
    if (tourId) {
      params.append("tour_id", tourId);
    }

    const feedbackUrl = `${baseUrl}/feedback?${params.toString()}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(feedbackUrl);
    setCopied(true);
    setShowOptions(false);
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="relative">
      <Button
        variant="secondary"
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        {copied ? "Copied!" : "Feedback Link"}
      </Button>

      {showOptions && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowOptions(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-surface-200 z-20 p-2">
            <button
              onClick={() => generateFeedbackLink(false)}
              className="w-full text-left px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 rounded transition-colors"
            >
              <div className="font-medium">Basic Link</div>
              <div className="text-xs text-surface-500 mt-0.5">Customer details only</div>
            </button>
            {itineraryId && (
              <button
                onClick={() => generateFeedbackLink(true)}
                className="w-full text-left px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 rounded transition-colors"
              >
                <div className="font-medium">With Hotels</div>
                <div className="text-xs text-surface-500 mt-0.5">Includes itinerary & hotels</div>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
