"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { AdminPinModal } from "@/components/AdminPinModal";

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
  hasCostingSheet: boolean;
  hasVouchers: boolean;
  hasInvoice: boolean;
  arrivalFlightNo?: string | null;
  arrivalTime?: string | null;
  departureFlightNo?: string | null;
  departureTime?: string | null;
  isDeclined?: boolean;
  declineReason?: string | null;
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
  hasCostingSheet,
  hasVouchers,
  hasInvoice,
  arrivalFlightNo,
  arrivalTime,
  departureFlightNo,
  departureTime,
  isDeclined = false,
  declineReason,
}: FinalizeTourButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [declineReasonInput, setDeclineReasonInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Centralized AdminPinModal state
  const [showPinModal, setShowPinModal] = useState(false);
  const pendingAction = useRef<"decline" | "reactivate" | null>(null);
  const verifiedPin = useRef<string>("");

  // Check if prerequisites are met
  const prerequisitesMet = hasCostingSheet && hasInvoice;
  const missingPrerequisites = [];
  if (!hasCostingSheet) missingPrerequisites.push("Costing Sheet");
  if (!hasInvoice) missingPrerequisites.push("Customer Invoice");


  const handleFinalize = async () => {
    setIsLoading(true);
    setError(null);

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
          arrival_flight_no: arrivalFlightNo,
          arrival_time: arrivalTime,
          departure_flight_no: departureFlightNo,
          departure_time: departureTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create tour");
        return;
      }

      setShowConfirm(false);
      router.refresh();
    } catch (error) {
      console.error("Error creating tour:", error);
      setError("Failed to finalize tour");
    } finally {
      setIsLoading(false);
    }
  };

  // Called when user clicks "Confirm Decline" from the decline modal
  const requestDeclinePin = () => {
    pendingAction.current = "decline";
    setShowDeclineModal(false);
    setShowPinModal(true);
  };

  // Called when user clicks "Reactivate" 
  const requestReactivatePin = () => {
    pendingAction.current = "reactivate";
    setShowPinModal(true);
  };

  // Called after AdminPinModal verifies successfully
  const handlePinAuthorized = (pin?: string) => {
    setShowPinModal(false);
    verifiedPin.current = pin || "";
    if (pendingAction.current === "decline") {
      executeDecline();
    } else if (pendingAction.current === "reactivate") {
      executeReactivate();
    }
    pendingAction.current = null;
  };

  const executeDecline = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the centralized verify-pin API to get a valid passcode for the backend
      const response = await fetch(`/api/itineraries/${itineraryId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          reason: declineReasonInput || null,
          passcode: verifiedPin.current
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to decline tour");
        return;
      }

      setDeclineReasonInput("");
      router.refresh();
    } catch (error) {
      console.error("Error declining tour:", error);
      setError("Failed to decline tour");
    } finally {
      setIsLoading(false);
    }
  };

  const executeReactivate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/itineraries/${itineraryId}/reactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: verifiedPin.current }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reactivate");
        return;
      }

      setShowReactivateModal(false);
      router.refresh();
    } catch (error) {
      console.error("Error reactivating tour:", error);
      setError("Failed to reactivate tour");
    } finally {
      setIsLoading(false);
    }
  };

  // If tour is declined, show declined state with reactivate option
  if (isDeclined) {
    return (
      <>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 bg-red-50 text-red-700 border-red-200 cursor-default"
            disabled
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Declined
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowReactivateModal(true)}
            className="flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reactivate
          </Button>
        </div>

        {/* Reactivate Info Modal */}
        {showReactivateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowReactivateModal(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-surface-900">Reactivate Tour</h3>
                  <p className="text-sm text-surface-500">This requires authorization</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800 mb-1 font-medium">Client: {clientName}</p>
                {declineReason && (
                  <p className="text-xs text-amber-700">
                    <span className="font-medium">Decline reason:</span> {declineReason}
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <Button variant="secondary" onClick={() => { setShowReactivateModal(false); setError(null); }} disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  onClick={requestReactivatePin}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Proceed to Reactivate
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Centralized PIN Modal */}
        <AdminPinModal
          isOpen={showPinModal}
          title={pendingAction.current === "reactivate" ? "Authorize Reactivation" : "Authorization Required"}
          description="Enter the admin PIN to proceed with this action."
          onAuthorized={handlePinAuthorized}
          onClose={() => {
            setShowPinModal(false);
            pendingAction.current = null;
          }}
        />
      </>
    );
  }

  // If tour already exists, show link to tracker
  if (existingTourId) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
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
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setShowConfirm(true)}
          disabled={!prerequisitesMet}
          size="sm"
          className={`flex items-center gap-2 ${prerequisitesMet ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
          title={!prerequisitesMet ? `Missing: ${missingPrerequisites.join(", ")}` : ""}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Finalize Tour
        </Button>

        {/* Decline Button — always available once costing exists */}
        {hasCostingSheet && (
          <Button
            onClick={() => setShowDeclineModal(true)}
            size="sm"
            variant="secondary"
            className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Decline
          </Button>
        )}
      </div>

      {/* Finalize Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
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

            {/* Prerequisites Checklist */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Prerequisites:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  {hasCostingSheet ? (
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className={hasCostingSheet ? "text-green-700" : "text-red-700"}>
                    Costing Sheet {hasCostingSheet ? "Created" : "Required"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {hasInvoice ? (
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className={hasInvoice ? "text-green-700" : "text-red-700"}>
                    Customer Invoice {hasInvoice ? "Confirmed" : "Required"}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

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

      {/* Decline Modal — collects reason, then triggers PIN verification */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowDeclineModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-surface-900">Decline Tour</h3>
                <p className="text-sm text-surface-500">Mark this tour as not proceeding</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                This will mark the tour for <span className="font-bold">{clientName}</span> as declined. 
                The inquiry will also be updated. You can reactivate it later with an approval passcode.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Reason for Decline <span className="text-surface-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={declineReasonInput}
                onChange={e => setDeclineReasonInput(e.target.value)}
                placeholder="e.g., Client found a cheaper option, Budget constraints, Changed travel dates..."
                rows={3}
                className="w-full px-4 py-2.5 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => { setShowDeclineModal(false); setError(null); }} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={requestDeclinePin}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Confirm Decline
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Centralized PIN Modal */}
      <AdminPinModal
        isOpen={showPinModal}
        title={pendingAction.current === "decline" ? "Authorize Decline" : "Authorization Required"}
        description="Enter the admin PIN to proceed with this action."
        onAuthorized={handlePinAuthorized}
        onClose={() => {
          setShowPinModal(false);
          // If closing PIN modal from decline flow, re-show decline modal
          if (pendingAction.current === "decline") {
            setShowDeclineModal(true);
          }
          pendingAction.current = null;
        }}
      />
    </>
  );
}
