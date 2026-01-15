"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

interface FinalizeTourButtonProps {
  itineraryId: string;
  inquiryId: string | null;
  groupInquiryId: string | null;
  clientName: string;
  startDate: string;
  endDate: string;
  paxAdults: number;
  paxChildren: number;
  existingTourId?: string | null;
}

export function FinalizeTourButton({
  itineraryId,
  inquiryId,
  groupInquiryId,
  clientName,
  startDate,
  endDate,
  paxAdults,
  paxChildren,
  existingTourId,
}: FinalizeTourButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleFinalize = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/tours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itinerary_id: itineraryId,
          inquiry_id: inquiryId,
          group_inquiry_id: groupInquiryId,
          client_name: clientName,
          start_date: startDate,
          end_date: endDate,
          pax_adults: paxAdults,
          pax_children: paxChildren,
        }),
      });

      if (!response.ok) throw new Error("Failed to create tour");

      const data = await response.json();
      setShowConfirm(false);
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Error creating tour:", error);
      alert("Failed to finalize tour");
    } finally {
      setIsLoading(false);
    }
  };

  // If tour already exists, show link to tracker
  if (existingTourId) {
    return (
      <Button
        variant="secondary"
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Tour Finalized
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Finalize Tour
      </Button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-surface-900">Finalize Tour</h3>
                <p className="text-sm text-surface-500">Add to Tour Tracker</p>
              </div>
            </div>

            <div className="bg-surface-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Client</span>
                <span className="font-medium text-surface-900">{clientName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Dates</span>
                <span className="font-medium text-surface-900">
                  {new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Travelers</span>
                <span className="font-medium text-surface-900">
                  {paxAdults} adults{paxChildren > 0 && `, ${paxChildren} children`}
                </span>
              </div>
            </div>

            <p className="text-surface-600 mb-6">
              This will add the tour to the Tour Tracker where you can assign a driver and monitor the trip.
            </p>

            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowConfirm(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleFinalize} loading={isLoading} className="bg-green-600 hover:bg-green-700">
                {isLoading ? "Creating..." : "Confirm & Add to Tracker"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
