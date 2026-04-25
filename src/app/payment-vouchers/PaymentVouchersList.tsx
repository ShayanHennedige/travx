"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui";

interface PaymentVoucher {
    id: string;
    voucher_no: string;
    voucher_date: string;
    tour_reference: string;
    payee_name: string;
    payee_type: string;
    total_usd: number;
    total_lkr: number;
    // status field removed - not needed for payment proof documents
    payment_mode: string | null;
    voucher_category: string;
}

interface PaymentVouchersListProps {
    vouchers: PaymentVoucher[];
}

export function PaymentVouchersList({ vouchers }: PaymentVouchersListProps) {
    const [searchTerm, setSearchTerm] = useState("");    // Removed statusFilter - not needed
    const [categoryFilter, setCategoryFilter] = useState("");
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const safeFormat = (dateStr: string | null, formatStr: string) => {
        if (!dateStr) return "N/A";
        try {
            return format(new Date(dateStr), formatStr);
        } catch {
            return "N/A";
        }
    };

    const filteredVouchers = vouchers.filter(v => {
        const matchesSearch =
            v.voucher_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.payee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.tour_reference?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = !categoryFilter || v.voucher_category === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    // Removed getStatusBadge function - not needed

    const handleDownloadPDF = async (id: string, voucherNo: string) => {
        setDownloadingId(id);
        try {
            const response = await fetch(`/api/payment-vouchers/${id}/pdf`);
            if (!response.ok) throw new Error("Failed to download");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Payment_Voucher_${voucherNo}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download error:", err);
        } finally {
            setDownloadingId(null);
        }
    };

    // Removed status stats - not applicable for payment proof documents

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <div>
                <Link href="/operations" className="inline-flex items-center gap-2 text-sm text-surface-600 hover:text-surface-900 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Operations
                </Link>
            </div>

            {/* Stats Cards - Status removed */}
            {/* Status filtering removed - payment vouchers are proof documents, status tracking not applicable */}

            {/* Search */}
            <div className="card p-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by voucher #, payee, or tour reference..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2.5 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    >
                        <option value="">All Categories</option>
                        <option value="hotel">Hotel</option>
                        <option value="transport">Transport</option>
                        <option value="extras">Extras</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
            </div>

            {/* Vouchers Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-surface-50 border-b border-surface-200">
                            <tr>
                                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500 whitespace-nowrap">Voucher #</th>
                                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500 whitespace-nowrap">Date</th>
                                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500 whitespace-nowrap">Payee</th>
                                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500 whitespace-nowrap">Tour Ref</th>
                                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500 whitespace-nowrap">Category</th>
                                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500 whitespace-nowrap">Amount (USD)</th>
                                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500 whitespace-nowrap">Amount (LKR)</th>
                                {/* Status column removed - not applicable for payment proof documents */}
                                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500 whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                            {filteredVouchers.map((voucher) => (
                                <tr key={voucher.id} className="hover:bg-surface-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <Link href={`/payment-vouchers/${voucher.id}`} className="text-sm font-bold text-primary-600 hover:text-primary-700">
                                            {voucher.voucher_no}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-surface-600">
                                        {safeFormat(voucher.voucher_date, "MMM d, yyyy")}
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-medium text-surface-900">{voucher.payee_name}</p>
                                        <p className="text-[10px] text-surface-500">{voucher.payee_type}</p>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-surface-600">
                                        {voucher.tour_reference || "-"}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                            voucher.voucher_category === "admin" ? "bg-amber-100 text-amber-700" :
                                            voucher.voucher_category === "transport" ? "bg-blue-100 text-blue-700" :
                                            voucher.voucher_category === "extras" ? "bg-purple-100 text-purple-700" :
                                            "bg-green-100 text-green-700"
                                        }`}>
                                            {voucher.voucher_category || "hotel"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold text-surface-900 text-right">
                                        ${(voucher.total_usd || 0).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-surface-600 text-right">
                                        {(voucher.total_lkr || 0).toLocaleString()}
                                    </td>
                                    {/* Status badge removed */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <Link href={`/api/payment-vouchers/${voucher.id}/pdf?view=true`} target="_blank">
                                                <Button size="sm" variant="secondary" className="rounded-lg text-xs">
                                                    View
                                                </Button>
                                            </Link>
                                            <Link href={`/payment-vouchers/${voucher.id}`}>
                                                <Button size="sm" variant="secondary" className="rounded-lg text-xs">
                                                    Edit
                                                </Button>
                                            </Link>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="rounded-lg"
                                                onClick={() => handleDownloadPDF(voucher.id, voucher.voucher_no)}
                                                disabled={downloadingId === voucher.id}
                                            >
                                                {downloadingId === voucher.id ? (
                                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                )}
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredVouchers.length === 0 && (
                    <div className="p-12 text-center">
                        <svg className="w-12 h-12 text-surface-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-surface-500 font-medium">No payment vouchers found</p>
                        <p className="text-sm text-surface-400 mt-1">Payment vouchers will appear here after generation</p>
                    </div>
                )}
            </div>
        </div>
    );
}
