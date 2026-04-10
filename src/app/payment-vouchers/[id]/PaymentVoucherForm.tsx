"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { paymentModes, payeeTypes, voucherStatuses, formatAmountInWords } from "@/lib/validations/paymentVoucher";

interface PaymentVoucherFormProps {
    voucher: any;
    onSave?: () => void;
}

export function PaymentVoucherForm({ voucher, onSave }: PaymentVoucherFormProps) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        voucher_date: voucher.voucher_date || new Date().toISOString().split("T")[0],
        hotel_invoice_no: voucher.hotel_invoice_no || "",
        tour_reference: voucher.tour_reference || "",
        payee_type: voucher.payee_type || "Hotel",
        payee_name: voucher.payee_name || "",
        description: voucher.description || "",
        nights_count: voucher.nights_count || "",
        rate_usd: voucher.rate_usd || "",
        total_usd: voucher.total_usd || "",
        exchange_rate: voucher.exchange_rate || 300,
        total_lkr: voucher.total_lkr || "",
        payment_mode: voucher.payment_mode || "",
        cheque_ref_no: voucher.cheque_ref_no || "",
        bank_name: voucher.bank_name || "",
        remarks: voucher.remarks || "",
        prepared_by: voucher.prepared_by || "",
        checked_by: voucher.checked_by || "",
        authorized_by: voucher.authorized_by || "",
        bill_image_url: voucher.bill_image_url || "",
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };

            // Auto-calculate totals
            if (field === "rate_usd" || field === "nights_count") {
                const rate = parseFloat(field === "rate_usd" ? value : prev.rate_usd) || 0;
                const nights = parseFloat(field === "nights_count" ? value : prev.nights_count) || 0;
                updated.total_usd = rate * nights || "";
                updated.total_lkr = (updated.total_usd ? updated.total_usd * (parseFloat(prev.exchange_rate) || 300) : "");
            }

            if (field === "exchange_rate") {
                const totalUsd = parseFloat(prev.total_usd) || 0;
                updated.total_lkr = totalUsd * (parseFloat(value) || 300) || "";
            }

            if (field === "total_usd") {
                const totalUsd = parseFloat(value) || 0;
                updated.total_lkr = totalUsd * (parseFloat(prev.exchange_rate) || 300) || "";
            }

            return updated;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const amountInWords = formatAmountInWords(formData.total_usd);

            const response = await fetch("/api/payment-vouchers", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: voucher.id,
                    ...formData,
                    amount_in_words: amountInWords,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to save");
            }

            router.refresh();
            onSave?.();
            // Redirect back to payment vouchers list, preserving tour_id filter if present
            const returnUrl = voucher.tour_id
                ? `/payment-vouchers?tour_id=${voucher.tour_id}`
                : "/payment-vouchers";
            router.push(returnUrl);
        } catch (err) {
            console.error("Save error:", err);
            alert("Failed to save payment voucher");
        } finally {
            setSaving(false);
        }
    };



    const handleDownloadPDF = async () => {
        try {
            const response = await fetch(`/api/payment-vouchers/${voucher.id}/pdf`);
            if (!response.ok) throw new Error("Failed to download");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Payment_Voucher_${voucher.voucher_no}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download error:", err);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div className="card p-6 bg-linear-to-br from-primary-50 to-surface-50 border border-primary-100">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-primary-600 tracking-wider mb-1">Voucher Number</p>
                        <p className="text-2xl font-black text-surface-900">{voucher.voucher_no}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleDownloadPDF}>
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download PDF
                        </Button>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Reference Info */}
                <div className="card p-6 space-y-4">
                    <h3 className="text-sm font-bold text-surface-900 border-b border-surface-100 pb-2">Reference Information</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-surface-600 mb-1">Voucher Date</label>
                            <input
                                type="date"
                                value={formData.voucher_date}
                                onChange={(e) => handleChange("voucher_date", e.target.value)}
                                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    </div>
                    {/* Status field removed - not needed for payment proof documents */}

                    <div>
                        <label className="block text-xs font-medium text-surface-600 mb-1">Hotel Invoice No</label>
                        <input
                            type="text"
                            value={formData.hotel_invoice_no}
                            onChange={(e) => handleChange("hotel_invoice_no", e.target.value)}
                            placeholder="e.g., 2026/103"
                            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-surface-600 mb-1">Tour Reference</label>
                        <input
                            type="text"
                            value={formData.tour_reference}
                            onChange={(e) => handleChange("tour_reference", e.target.value)}
                            placeholder="e.g., RSA 103"
                            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-surface-50"
                            readOnly
                        />
                        <p className="text-[10px] text-surface-400 mt-1">Auto-filled from costing sheet</p>
                    </div>
                </div>

                {/* Right Column - Payee Info */}
                <div className="card p-6 space-y-4">
                    <h3 className="text-sm font-bold text-surface-900 border-b border-surface-100 pb-2">Payee Information</h3>

                    <div>
                        <label className="block text-xs font-medium text-surface-600 mb-1">Payee Type</label>
                        <select
                            value={formData.payee_type}
                            onChange={(e) => handleChange("payee_type", e.target.value)}
                            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                            {payeeTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-surface-600 mb-1">Payee Name</label>
                        <input
                            type="text"
                            value={formData.payee_name}
                            onChange={(e) => handleChange("payee_name", e.target.value)}
                            placeholder="Hotel or supplier name"
                            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-surface-600 mb-1">Description</label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => handleChange("description", e.target.value)}
                            placeholder="e.g., Accommodation for tour group"
                            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                </div>
            </div>

            {/* Amounts Section */}
            <div className="card p-6 space-y-4">
                <h3 className="text-sm font-bold text-surface-900 border-b border-surface-100 pb-2">Amount Details</h3>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-surface-600 mb-1">Nights</label>
                        <input
                            type="number"
                            value={formData.nights_count}
                            onChange={(e) => handleChange("nights_count", parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-surface-600 mb-1">Rate (USD/night)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.rate_usd}
                            onChange={(e) => handleChange("rate_usd", parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-surface-600 mb-1">Total (USD)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.total_usd}
                            onChange={(e) => handleChange("total_usd", parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-surface-600 mb-1">Exchange Rate</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.exchange_rate}
                            onChange={(e) => handleChange("exchange_rate", parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-green-700">Total Amount (LKR)</span>
                        <span className="text-2xl font-black text-green-700">LKR {formData.total_lkr.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">{formatAmountInWords(formData.total_usd)}</p>
                </div>
            </div>

            {/* Payment Details */}
            <div className="card p-6 space-y-4">
                <h3 className="text-sm font-bold text-surface-900 border-b border-surface-100 pb-2">Payment Details</h3>

                <div>
                    <label className="block text-xs font-medium text-surface-600 mb-2">Mode of Payment</label>
                    <div className="flex flex-wrap gap-3">
                        {paymentModes.map(mode => (
                            <label key={mode} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="payment_mode"
                                    value={mode}
                                    checked={formData.payment_mode === mode}
                                    onChange={(e) => handleChange("payment_mode", e.target.value)}
                                    className="w-4 h-4 text-primary-600 border-surface-300 focus:ring-primary-500"
                                />
                                <span className="text-sm text-surface-700">{mode}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-surface-600 mb-1">Cheque / Transaction Ref No</label>
                        <input
                            type="text"
                            value={formData.cheque_ref_no}
                            onChange={(e) => handleChange("cheque_ref_no", e.target.value)}
                            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-surface-600 mb-1">Bank Name</label>
                        <input
                            type="text"
                            value={formData.bank_name}
                            onChange={(e) => handleChange("bank_name", e.target.value)}
                            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">Remarks</label>
                    <textarea
                        value={formData.remarks}
                        onChange={(e) => handleChange("remarks", e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                </div>
            </div>

            {/* Bill Image Upload */}
            <div className="card p-6 space-y-4">
                <h3 className="text-sm font-bold text-surface-900 border-b border-surface-100 pb-2">Bill / Invoice Image (Optional)</h3>
                <p className="text-xs text-surface-500">Upload a photo or scan of the original bill for reference. This is for record-keeping only.</p>

                {formData.bill_image_url ? (
                    <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <svg className="w-8 h-8 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-green-700">Bill image uploaded</p>
                            <a
                                href={formData.bill_image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-600 hover:underline"
                            >
                                View Image
                            </a>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleChange("bill_image_url", "")}
                            className="px-3 py-1.5 text-xs font-medium text-accent-500 hover:bg-accent-500/10 rounded-lg transition-colors"
                        >
                            Remove
                        </button>
                    </div>
                ) : (
                    <div className="relative">
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                if (file.size > 5 * 1024 * 1024) {
                                    alert("File size must be less than 5MB");
                                    return;
                                }

                                try {
                                    const { createClient } = await import("@/lib/supabase/client");
                                    const supabase = createClient();
                                    const fileName = `${voucher.id}/${Date.now()}-${file.name}`;

                                    const { data, error } = await supabase.storage
                                        .from("bill-images")
                                        .upload(fileName, file);

                                    if (error) throw error;

                                    const { data: urlData } = supabase.storage
                                        .from("bill-images")
                                        .getPublicUrl(fileName);

                                    handleChange("bill_image_url", urlData.publicUrl);
                                } catch (err) {
                                    console.error("Upload error:", err);
                                    alert("Failed to upload image. Make sure the bill-images storage bucket exists.");
                                }
                            }}
                            className="hidden"
                            id="bill-upload"
                        />
                        <label
                            htmlFor="bill-upload"
                            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-surface-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors"
                        >
                            <svg className="w-10 h-10 text-surface-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-medium text-surface-600">Click to upload bill image</span>
                            <span className="text-xs text-surface-400 mt-1">JPG, PNG, WebP or PDF (max 5MB)</span>
                        </label>
                    </div>
                )}
            </div>

            {/* Signatures */}
            <div className="card p-6 space-y-4">
                <h3 className="text-sm font-bold text-surface-900 border-b border-surface-100 pb-2">Signatures</h3>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-surface-600 mb-1">Prepared By</label>
                        <input
                            type="text"
                            value={formData.prepared_by}
                            onChange={(e) => handleChange("prepared_by", e.target.value)}
                            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-surface-600 mb-1">Checked By</label>
                        <input
                            type="text"
                            value={formData.checked_by}
                            onChange={(e) => handleChange("checked_by", e.target.value)}
                            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-surface-600 mb-1">Authorized By</label>
                        <input
                            type="text"
                            value={formData.authorized_by}
                            onChange={(e) => handleChange("authorized_by", e.target.value)}
                            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
                <Button
                    variant="secondary"
                    onClick={() => {
                        const returnUrl = voucher.tour_id
                            ? `/payment-vouchers?tour_id=${voucher.tour_id}`
                            : "/payment-vouchers";
                        router.push(returnUrl);
                    }}
                >
                    Cancel
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </div>
    );
}
