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

  const handleDownload = async (type: "standard" | "with_rates", action: "view" | "download") => {
    setIsDownloading(true);
    setDownloadType(type);
    setShowDropdown(false);

    try {
      const url = type === "with_rates"
        ? `/api/itinerary/${itineraryId}/pdf?include_rates=true`
        : `/api/itinerary/${itineraryId}/pdf`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create download link
      const blobUrl = window.URL.createObjectURL(blob);
      
      if (action === "view") {
        window.open(blobUrl, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = blobUrl;
        const suffix = type === "with_rates" ? "-Rates" : "";
        a.download = inquiryNumber
          ? `${inquiryNumber}-Itinerary${suffix}.pdf`
          : `TravX-Itinerary${suffix}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // Cleanup
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      alert("Failed to generate PDF. Please try again.");
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
          {/* PREVIEW STANDARD */}
          <button
            onClick={() => handleDownload("standard", "view")}
            className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center gap-3 group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Preview Standard PDF</p>
              <p className="text-xs text-slate-500">View itinerary in browser</p>
            </div>
          </button>

          {/* DOWNLOAD STANDARD */}
          <button
            onClick={() => handleDownload("standard", "download")}
            className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center gap-3 group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Download Standard PDF</p>
              <p className="text-xs text-slate-500">Save to your computer</p>
            </div>
          </button>

          <div className="h-px bg-slate-100 my-1 mx-3" />

          {/* PREVIEW WITH RATES */}
          <button
            onClick={() => canDownloadWithRates && handleDownload("with_rates", "view")}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <p className={`text-sm font-bold ${canDownloadWithRates ? "text-slate-900" : "text-slate-400"}`}>Preview PDF with Rates</p>
              <p className="text-xs text-slate-500">
                {canDownloadWithRates
                  ? "View in browser with pricing"
                  : "Finalize costing sheet first"}
              </p>
            </div>
          </button>

          {/* DOWNLOAD WITH RATES */}
          <button
            onClick={() => canDownloadWithRates && handleDownload("with_rates", "download")}
            disabled={!canDownloadWithRates}
            className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 group ${canDownloadWithRates
                ? "hover:bg-slate-50 cursor-pointer"
                : "opacity-50 cursor-not-allowed"
              }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${canDownloadWithRates
                ? "bg-slate-50 group-hover:bg-slate-100"
                : "bg-slate-100"
              }`}>
              <svg className={`w-4 h-4 ${canDownloadWithRates ? "text-slate-600" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div>
              <p className={`text-sm font-bold ${canDownloadWithRates ? "text-slate-900" : "text-slate-400"}`}>Download PDF with Rates</p>
              <p className="text-xs text-slate-500">
                {canDownloadWithRates
                  ? "Save document with pricing"
                  : "Finalize costing sheet first"}
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
