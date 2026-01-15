"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { format } from "date-fns";

interface VoucherEditorProps {
  voucher: {
    id: string;
    voucher_number: string;
    hotel_name: string;
    hotel_address?: string;
    hotel_contact?: string;
    guest_name: string;
    nationality?: string;
    pax_adults: number;
    pax_children: number;
    pax_infants: number;
    room_type: string;
    room_category: string;
    no_of_rooms: number;
    meal_plan: string;
    check_in_date: string;
    check_out_date: string;
    no_of_nights: number;
    arrival_time?: string;
    departure_time?: string;
    room_rate_currency?: string;
    room_rate_sgl?: number;
    room_rate_dbl?: number;
    room_rate_tpl?: number;
    confirmed_by?: string;
    confirmed_date?: string;
    booked_by?: string;
    booked_date?: string;
    remarks?: string;
    status: string;
  };
}

const roomTypeOptions = [
  { value: "SGL", label: "Single (SGL)" },
  { value: "DBL", label: "Double (DBL)" },
  { value: "TPL", label: "Triple (TPL)" },
  { value: "QTPL", label: "Quadruple (QTPL)" },
];

const mealPlanOptions = [
  { value: "BB", label: "Bed & Breakfast (BB)" },
  { value: "HB", label: "Half Board (HB)" },
  { value: "FB", label: "Full Board (FB)" },
  { value: "AI", label: "All Inclusive (AI)" },
  { value: "RO", label: "Room Only (RO)" },
];

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
];

export function VoucherEditor({ voucher }: VoucherEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isAmending, setIsAmending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [amendConfirmedBy, setAmendConfirmedBy] = useState("");

  const [formData, setFormData] = useState({
    hotel_name: voucher.hotel_name,
    hotel_address: voucher.hotel_address || "",
    hotel_contact: voucher.hotel_contact || "",
    guest_name: voucher.guest_name,
    nationality: voucher.nationality || "",
    pax_adults: voucher.pax_adults,
    pax_children: voucher.pax_children,
    pax_infants: voucher.pax_infants,
    room_type: voucher.room_type,
    room_category: voucher.room_category,
    no_of_rooms: voucher.no_of_rooms,
    meal_plan: voucher.meal_plan,
    check_in_date: voucher.check_in_date,
    check_out_date: voucher.check_out_date,
    no_of_nights: voucher.no_of_nights,
    arrival_time: voucher.arrival_time || "",
    departure_time: voucher.departure_time || "",
    room_rate_currency: voucher.room_rate_currency || "USD",
    room_rate_sgl: voucher.room_rate_sgl || 0,
    room_rate_dbl: voucher.room_rate_dbl || 0,
    room_rate_tpl: voucher.room_rate_tpl || 0,
    confirmed_by: voucher.confirmed_by || "",
    confirmed_date: voucher.confirmed_date || "",
    booked_by: voucher.booked_by || "",
    booked_date: voucher.booked_date || "",
    remarks: voucher.remarks || "",
    status: voucher.status,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/vouchers/${voucher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save");

      router.refresh();
      alert("Voucher saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save voucher");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAmend = async () => {
    if (!amendConfirmedBy) {
      alert("Please enter the name of who confirmed this amendment");
      return;
    }

    setIsAmending(true);
    try {
      const response = await fetch(`/api/vouchers/${voucher.id}/amend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amendment_confirmed_by: amendConfirmedBy,
        }),
      });

      if (!response.ok) throw new Error("Failed to create amendment");

      const data = await response.json();
      setShowAmendModal(false);
      router.push(`/vouchers/${data.voucher.id}`);
    } catch (error) {
      console.error("Amendment error:", error);
      alert("Failed to create amendment");
    } finally {
      setIsAmending(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/vouchers/${voucher.id}/pdf`);
      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${voucher.voucher_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download error:", error);
      alert("Failed to download PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            loading={isSaving}
            disabled={isSaving}
          >
            Save Changes
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowAmendModal(true)}
          >
            Create Amendment
          </Button>
        </div>
        <Button
          variant="secondary"
          onClick={handleDownloadPDF}
          loading={isDownloading}
          disabled={isDownloading}
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download PDF
        </Button>
      </div>

      {/* Hotel Information */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">Hotel Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Hotel Name"
            name="hotel_name"
            value={formData.hotel_name}
            onChange={handleChange}
            required
          />
          <Input
            label="Hotel Contact"
            name="hotel_contact"
            value={formData.hotel_contact}
            onChange={handleChange}
          />
          <div className="md:col-span-2">
            <Input
              label="Hotel Address"
              name="hotel_address"
              value={formData.hotel_address}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      {/* Guest Information */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">Guest Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Guest Name"
            name="guest_name"
            value={formData.guest_name}
            onChange={handleChange}
            required
          />
          <Input
            label="Nationality"
            name="nationality"
            value={formData.nationality}
            onChange={handleChange}
          />
          <Input
            label="Adults"
            name="pax_adults"
            type="number"
            min="0"
            value={formData.pax_adults}
            onChange={handleChange}
          />
          <Input
            label="Children"
            name="pax_children"
            type="number"
            min="0"
            value={formData.pax_children}
            onChange={handleChange}
          />
          <Input
            label="Infants"
            name="pax_infants"
            type="number"
            min="0"
            value={formData.pax_infants}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Room Details */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">Room Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Room Type"
            name="room_type"
            value={formData.room_type}
            onChange={handleChange}
            options={roomTypeOptions}
          />
          <Input
            label="Room Category"
            name="room_category"
            value={formData.room_category}
            onChange={handleChange}
            placeholder="e.g., Deluxe Room"
          />
          <Input
            label="Number of Rooms"
            name="no_of_rooms"
            type="number"
            min="1"
            value={formData.no_of_rooms}
            onChange={handleChange}
          />
          <Select
            label="Meal Plan"
            name="meal_plan"
            value={formData.meal_plan}
            onChange={handleChange}
            options={mealPlanOptions}
          />
        </div>
      </div>

      {/* Booking Details */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">Booking Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Check-in Date"
            name="check_in_date"
            type="date"
            value={formData.check_in_date}
            onChange={handleChange}
            required
          />
          <Input
            label="Check-out Date"
            name="check_out_date"
            type="date"
            value={formData.check_out_date}
            onChange={handleChange}
            required
          />
          <Input
            label="No. of Nights"
            name="no_of_nights"
            type="number"
            min="1"
            value={formData.no_of_nights}
            onChange={handleChange}
          />
          <Input
            label="Arrival Time"
            name="arrival_time"
            value={formData.arrival_time}
            onChange={handleChange}
            placeholder="e.g., Afternoon"
          />
          <Input
            label="Departure Time"
            name="departure_time"
            value={formData.departure_time}
            onChange={handleChange}
            placeholder="e.g., After Breakfast"
          />
        </div>
      </div>

      {/* Rates */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">Room Rates</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Input
            label="Currency"
            name="room_rate_currency"
            value={formData.room_rate_currency}
            onChange={handleChange}
          />
          <Input
            label="SGL Rate"
            name="room_rate_sgl"
            type="number"
            min="0"
            step="0.01"
            value={formData.room_rate_sgl}
            onChange={handleChange}
          />
          <Input
            label="DBL Rate"
            name="room_rate_dbl"
            type="number"
            min="0"
            step="0.01"
            value={formData.room_rate_dbl}
            onChange={handleChange}
          />
          <Input
            label="TPL Rate"
            name="room_rate_tpl"
            type="number"
            min="0"
            step="0.01"
            value={formData.room_rate_tpl}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Confirmation Details */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">Confirmation Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Confirmed By"
            name="confirmed_by"
            value={formData.confirmed_by}
            onChange={handleChange}
          />
          <Input
            label="Confirmed Date"
            name="confirmed_date"
            type="date"
            value={formData.confirmed_date}
            onChange={handleChange}
          />
          <Input
            label="Booked By"
            name="booked_by"
            value={formData.booked_by}
            onChange={handleChange}
          />
          <Input
            label="Booked Date"
            name="booked_date"
            type="date"
            value={formData.booked_date}
            onChange={handleChange}
          />
          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            options={statusOptions}
          />
        </div>
      </div>

      {/* Remarks */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">Booking Remarks</h3>
        <Textarea
          label="Remarks"
          name="remarks"
          value={formData.remarks}
          onChange={handleChange}
          rows={4}
          placeholder="Enter any special remarks or notes for this booking..."
        />
        <p className="text-xs text-surface-500 mt-2">
          These remarks will appear highlighted in yellow on the voucher PDF.
        </p>
      </div>

      {/* Amendment Modal */}
      {showAmendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-surface-900">Create Amendment</h3>
                <p className="text-sm text-surface-500">This will create a new amended voucher</p>
              </div>
            </div>
            
            <p className="text-surface-600 mb-4">
              Creating an amendment will mark the current voucher as &quot;Amended&quot; and create a new voucher with your changes.
            </p>

            <Input
              label="Amendment Confirmed By"
              value={amendConfirmedBy}
              onChange={(e) => setAmendConfirmedBy(e.target.value)}
              placeholder="Enter name"
              required
            />

            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowAmendModal(false)} disabled={isAmending}>
                Cancel
              </Button>
              <Button onClick={handleAmend} loading={isAmending} disabled={isAmending}>
                Create Amendment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
