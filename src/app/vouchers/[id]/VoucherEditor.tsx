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
    room_rate_qtpl?: number;
    rooms_sgl?: number;
    rooms_dbl?: number;
    rooms_tpl?: number;
    rooms_qtpl?: number;
    confirmed_by?: string;
    confirmed_date?: string;
    booked_by?: string;
    booked_date?: string;
    remarks?: string;
    status: string;
    is_amendment?: boolean;
    amendment_number?: number;
    original_voucher_id?: string;
  };
  originalVoucher?: {
    id: string;
    voucher_number: string;
    hotel_name: string;
    status: string;
    created_at: string;
  } | null;
}

const roomCategoryOptions = [
  { value: "Standard", label: "Standard" },
  { value: "Deluxe", label: "Deluxe" },
  { value: "Superior", label: "Superior" },
  { value: "Super Deluxe", label: "Super Deluxe" },
  { value: "Luxury", label: "Luxury" },
  { value: "Suite", label: "Suite" },
  { value: "Junior Suite", label: "Junior Suite" },
  { value: "Executive", label: "Executive" },
  { value: "Family", label: "Family" },
  { value: "Villa", label: "Villa" },
  { value: "Bungalow", label: "Bungalow" },
  { value: "Cabana", label: "Cabana" },
  { value: "Chalet", label: "Chalet" },
  { value: "Tent", label: "Tent" },
  { value: "Apartment", label: "Apartment" },
  { value: "Studio", label: "Studio" },
  { value: "Penthouse", label: "Penthouse" },
  { value: "Connecting", label: "Connecting" },
  { value: "Economy", label: "Economy" },
  { value: "Budget", label: "Budget" },
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

const ROOM_TYPES = [
  { key: "sgl", label: "Single (SGL)", countField: "rooms_sgl" as const, rateField: "room_rate_sgl" as const },
  { key: "dbl", label: "Double (DBL)", countField: "rooms_dbl" as const, rateField: "room_rate_dbl" as const },
  { key: "tpl", label: "Triple (TPL)", countField: "rooms_tpl" as const, rateField: "room_rate_tpl" as const },
  { key: "qtpl", label: "Quadruple (QTPL)", countField: "rooms_qtpl" as const, rateField: "room_rate_qtpl" as const },
];

export function VoucherEditor({ voucher, originalVoucher }: VoucherEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isAmending, setIsAmending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [amendConfirmedBy, setAmendConfirmedBy] = useState("");

  const [formData, setFormData] = useState({
    hotel_name: voucher.hotel_name,
    guest_name: voucher.guest_name,
    nationality: voucher.nationality || "",
    pax_adults: voucher.pax_adults,
    pax_children: voucher.pax_children,
    pax_infants: voucher.pax_infants,
    room_category: voucher.room_category,
    meal_plan: voucher.meal_plan,
    check_in_date: voucher.check_in_date,
    check_out_date: voucher.check_out_date,
    no_of_nights: voucher.no_of_nights,
    arrival_time: voucher.arrival_time || "",
    departure_time: voucher.departure_time || "",
    room_rate_currency: voucher.room_rate_currency || "USD",
    rooms_sgl: voucher.rooms_sgl ?? 0,
    rooms_dbl: voucher.rooms_dbl ?? 0,
    rooms_tpl: voucher.rooms_tpl ?? 0,
    rooms_qtpl: voucher.rooms_qtpl ?? 0,
    room_rate_sgl: voucher.room_rate_sgl ?? 0,
    room_rate_dbl: voucher.room_rate_dbl ?? 0,
    room_rate_tpl: voucher.room_rate_tpl ?? 0,
    room_rate_qtpl: voucher.room_rate_qtpl ?? 0,
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

  const totalRooms =
    Number(formData.rooms_sgl) +
    Number(formData.rooms_dbl) +
    Number(formData.rooms_tpl) +
    Number(formData.rooms_qtpl);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/vouchers/${voucher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          no_of_rooms: totalRooms || voucher.no_of_rooms,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      router.refresh();
      alert("Voucher saved successfully!");
      router.push("/vouchers");
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
      const toNum = (v: unknown) =>
        v === "" || v === null || v === undefined ? null : Number(v);
      const toInt = (v: unknown) =>
        v === "" || v === null || v === undefined ? 0 : parseInt(String(v), 10) || 0;

      const sanitised = {
        ...formData,
        pax_adults: toInt(formData.pax_adults),
        pax_children: toInt(formData.pax_children),
        pax_infants: toInt(formData.pax_infants),
        no_of_rooms: totalRooms || voucher.no_of_rooms,
        no_of_nights: toInt(formData.no_of_nights),
        rooms_sgl: toInt(formData.rooms_sgl),
        rooms_dbl: toInt(formData.rooms_dbl),
        rooms_tpl: toInt(formData.rooms_tpl),
        rooms_qtpl: toInt(formData.rooms_qtpl),
        room_rate_sgl: toNum(formData.room_rate_sgl),
        room_rate_dbl: toNum(formData.room_rate_dbl),
        room_rate_tpl: toNum(formData.room_rate_tpl),
        room_rate_qtpl: toNum(formData.room_rate_qtpl),
        confirmed_date: formData.confirmed_date || null,
        booked_date: formData.booked_date || null,
        amendment_confirmed_by: amendConfirmedBy,
      };

      const response = await fetch(`/api/vouchers/${voucher.id}/amend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitised),
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

      const safeVoucherNumber = (voucher.voucher_number && voucher.voucher_number !== "null")
        ? voucher.voucher_number
        : `V-${voucher.id.slice(0, 8).toUpperCase()}`;

      a.download = `${safeVoucherNumber}.pdf`;
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
      {/* Amendment Banner */}
      {voucher.is_amendment && (
        <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-orange-900">
                This is Amendment #{voucher.amendment_number}
                {originalVoucher ? (
                  <> of voucher <span className="text-orange-700">{originalVoucher.voucher_number}</span></>
                ) : null}
              </p>
              <p className="text-xs text-orange-600 mt-0.5">
                The original voucher has been preserved and can be viewed from the sidebar.
              </p>
            </div>
          </div>
          {originalVoucher && (
            <a
              href={`/vouchers/${originalVoucher.id}`}
              className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-bold rounded-lg transition-colors flex-shrink-0"
            >
              View Original →
            </a>
          )}
        </div>
      )}

      {/* Action Buttons — two clearly separated operations */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-0">
            {/* Edit operation */}
            <div className="flex flex-col items-start pr-5">
              <Button onClick={handleSave} loading={isSaving} disabled={isSaving}>
                Save Changes
              </Button>
              <p className="text-[10px] text-surface-400 mt-1.5 leading-tight">
                Quick edit — updates fields in-place
              </p>
            </div>

            {/* Visual separator */}
            <div className="self-stretch border-l border-surface-200 mx-1" />

            {/* Amendment operation */}
            <div className="flex flex-col items-start pl-5">
              <Button
                variant="secondary"
                onClick={() => setShowAmendModal(true)}
                className="border-orange-200 text-orange-700 hover:bg-orange-50"
              >
                Create Amendment
              </Button>
              <p className="text-[10px] text-surface-400 mt-1.5 leading-tight">
                Formal change — preserves original voucher
              </p>
            </div>
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
            disabled
          />
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
            disabled
          />
          <Input
            label="Nationality"
            name="nationality"
            value={formData.nationality}
            onChange={handleChange}
            disabled
          />
          <Input
            label="Adults"
            name="pax_adults"
            type="number"
            min="0"
            value={formData.pax_adults}
            onChange={handleChange}
            disabled
          />
          <Input
            label="Children"
            name="pax_children"
            type="number"
            min="0"
            value={formData.pax_children}
            onChange={handleChange}
            disabled
          />
          <Input
            label="Infants"
            name="pax_infants"
            type="number"
            min="0"
            value={formData.pax_infants}
            onChange={handleChange}
            disabled
          />
        </div>
      </div>

      {/* Room Details — multi-type breakdown */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-surface-900">Room Details</h3>
          {totalRooms > 0 && (
            <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full">
              {totalRooms} room{totalRooms !== 1 ? "s" : ""} total
            </span>
          )}
        </div>
        <p className="text-xs text-surface-500 mb-5">
          Set the room count and nightly rate for each room type included in this booking.
        </p>

        {/* Category and meal plan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Select
            label="Room Category"
            name="room_category"
            value={formData.room_category}
            onChange={handleChange}
            options={roomCategoryOptions}
            placeholder="Select a category"
          />
          <Select
            label="Meal Plan"
            name="meal_plan"
            value={formData.meal_plan}
            onChange={handleChange}
            options={mealPlanOptions}
          />
        </div>

        {/* Per-room-type rows */}
        <div className="space-y-3">
          {ROOM_TYPES.map(({ key, label, countField, rateField }) => {
            const count = Number(formData[countField]);
            const isActive = count > 0;
            return (
              <div
                key={key}
                className={`rounded-xl border p-4 transition-colors ${
                  isActive
                    ? "border-primary-200 bg-primary-50"
                    : "border-surface-200 bg-surface-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-bold uppercase tracking-wide ${isActive ? "text-primary-700" : "text-surface-500"}`}>
                    {label}
                  </span>
                  {isActive && (
                    <span className="text-[10px] font-bold text-primary-600 bg-primary-100 px-1.5 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="No. of Rooms"
                    name={countField}
                    type="number"
                    min="0"
                    max="50"
                    value={formData[countField]}
                    onChange={handleChange}
                  />
                  <Input
                    label={`Rate (${formData.room_rate_currency}/night)`}
                    name={rateField}
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData[rateField]}
                    onChange={handleChange}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Currency */}
        <div className="mt-4 max-w-[160px]">
          <Input
            label="Currency"
            name="room_rate_currency"
            value={formData.room_rate_currency}
            onChange={handleChange}
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

            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                The current voucher will be marked as <strong>Amended</strong> and a new voucher will be
                created with your current changes. The original is permanently preserved for audit purposes.
              </p>
            </div>

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
                Confirm Amendment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
