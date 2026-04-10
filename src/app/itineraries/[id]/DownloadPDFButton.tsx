"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui";

interface DownloadPDFButtonProps {
  itineraryId: string;
  inquiryNumber?: string;
  size?: "sm" | "md" | "lg";
  costingSheetStatus?: string | null;
}

export function DownloadPDFButton({ itineraryId, inquiryNumber, size = "md", costingSheetStatus }: DownloadPDFButtonProps) {
  const canDownloadWithRates = costingSheetStatus === "finalized" || costingSheetStatus === "approved";
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadType, setDownloadType] = useState<"standard" | "with_rates" | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDownload = async (type: "standard" | "with_rates") => {
    setIsDownloading(true);
    setDownloadType(type);
    setShowDropdown(false);

    try {
      const url = type === "with_rates"
        ? `/api/itinerary/${itineraryId}/pdf?include_rates=true`
        : `/api/itinerary/${itineraryId}/pdf`;

      const response = await fetch(url);

      if (!response.ok) {
        let errorMsg = `Server returned ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          // response wasn't JSON
        }
        throw new Error(errorMsg);
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create download link
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const suffix = type === "with_rates" ? "-Rates" : "";
      a.download = inquiryNumber
        ? `${inquiryNumber}-Itinerary${suffix}.pdf`
        : `TraveX-Itinerary${suffix}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error("Failed to download PDF:", error);
      alert(`Failed to generate PDF: ${error?.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsDownloading(false);
      setDownloadType(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isDownloading}
        variant="secondary"
        size={size}
        className="rounded-xl"
      >
        {isDownloading ? (
          <>
            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {downloadType === "with_rates" ? "Generating with Rates..." : "Generating..."}
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Itinerary PDF
            <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </Button>

      {/* Dropdown Menu */}
      {showDropdown && !isDownloading && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            onClick={() => handleDownload("standard")}
            className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center gap-3 group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Standard PDF</p>
              <p className="text-xs text-slate-500">Itinerary without pricing</p>
            </div>
          </button>

          <div className="h-px bg-slate-100 my-1 mx-3" />

          <button
            onClick={() => canDownloadWithRates && handleDownload("with_rates")}
            disabled={!canDownloadWithRates}
            className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 group ${canDownloadWithRates
                ? "hover:bg-slate-50 cursor-pointer"
                : "opacity-50 cursor-not-allowed"
              }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${canDownloadWithRates
                ? "bg-emerald-50 group-hover:bg-emerald-100"
                : "bg-slate-100"
              }`}>
              <svg className={`w-4 h-4 ${canDownloadWithRates ? "text-emerald-600" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className={`text-sm font-bold ${canDownloadWithRates ? "text-slate-900" : "text-slate-400"}`}>PDF with Rates & T&C</p>
              <p className="text-xs text-slate-500">
                {canDownloadWithRates
                  ? "Include pricing and terms"
                  : "Finalize costing sheet first"}
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
