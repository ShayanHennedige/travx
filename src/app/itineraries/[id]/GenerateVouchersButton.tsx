"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

interface Hotel {
  hotel_name: string;
  check_in_date: string;
  check_out_date: string;
  no_of_nights: number;
  location: string;
}

interface GenerateVouchersButtonProps {
  itineraryId: string;
  inquiryId?: string | null;
  groupInquiryId?: string | null;
  guestName: string;
  nationality?: string;
  paxAdults: number;
  paxChildren: number;
  hotels: Hotel[];
  existingVouchersCount: number;
}

export function GenerateVouchersButton({
  itineraryId,
  inquiryId,
  groupInquiryId,
  guestName,
  nationality,
  paxAdults,
  paxChildren,
  hotels,
  existingVouchersCount,
}: GenerateVouchersButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generate_from_itinerary: true,
          itinerary_id: itineraryId,
          inquiry_id: inquiryId,
          group_inquiry_id: groupInquiryId,
          guest_name: guestName,
          nationality: nationality || "",
          pax_adults: paxAdults,
          pax_children: paxChildren,
          hotels: hotels.map((h) => ({
            hotel_name: h.hotel_name,
            check_in_date: h.check_in_date,
            check_out_date: h.check_out_date,
            no_of_nights: h.no_of_nights,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to generate vouchers");

      const data = await response.json();
      setShowModal(false);
      router.push("/vouchers");
    } catch (error) {
      console.error("Generation error:", error);
      alert("Failed to generate vouchers");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setShowModal(true)}
      >
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
        </svg>
        Generate Vouchers
        {existingVouchersCount > 0 && (
          <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">
            {existingVouchersCount} existing
          </span>
        )}
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-surface-900">Generate Hotel Vouchers</h3>
                <p className="text-sm text-surface-500">Create vouchers for each hotel in the itinerary</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-surface-600 mb-4">
                This will create <strong>{hotels.length} hotel voucher{hotels.length !== 1 ? "s" : ""}</strong> for:
              </p>
              <div className="bg-surface-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                <ul className="space-y-2">
                  {hotels.map((hotel, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="font-medium text-surface-900">{hotel.hotel_name}</span>
                      <span className="text-surface-500">({hotel.no_of_nights} nights)</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-yellow-700">
                <strong>Guest:</strong> {guestName} ({paxAdults} adults{paxChildren > 0 ? `, ${paxChildren} children` : ""})
              </p>
            </div>

            {existingVouchersCount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-blue-700">
                  ⓘ There are already {existingVouchersCount} vouchers for this itinerary. New vouchers will be added.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowModal(false)} disabled={isGenerating}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} loading={isGenerating} disabled={isGenerating}>
                Generate {hotels.length} Voucher{hotels.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
