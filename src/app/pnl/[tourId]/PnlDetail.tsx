"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";

interface PnlData {
    tour_id: string;
    tour_reference?: string;
    customer_invoice_total: number;
    hotel_expenses: number;
    driver_expenses: number;
    misc_expenses: number;
    total_income: number;
    total_expenses: number;
    net_profit: number;
}

interface Invoice {
    id: string;
    invoice_no: string;
    total_amount: number;
    status: string;
    invoice_date: string;
    customer_name: string;
}

interface Voucher {
    id: string;
    voucher_no: string;
    total_usd: number;
    payee_type: string;
    payee_name: string;
    status: string;
    voucher_date: string;
}

interface TourDetails {
    id: string;
    client_name: string;
    start_date: string;
    end_date: string;
    itinerary_id?: string;
    driver_log_sheet_url?: string;
    actual_km_logged?: number;
    log_sheet_uploaded_at?: string;
}

interface CostingExtras {
    description: string;
    cost: number;
}

const EXPENSE_COLORS = {
    hotel: "#3b82f6",
    driver: "#22c55e",
    misc: "#f59e0b",
};

export function PnlDetail({ tourId }: { tourId: string }) {
    const [pnl, setPnl] = useState<PnlData | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [tourDetails, setTourDetails] = useState<TourDetails | null>(null);
    const [costingExtras, setCostingExtras] = useState<CostingExtras[]>([]);
    const [uploading, setUploading] = useState(false);
    const [actualKm, setActualKm] = useState<string>("");

    useEffect(() => {
        fetchData();
    }, [tourId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch PNL calculation
            const pnlRes = await fetch(`/api/pnl?calculate_for=${tourId}`);
            const pnlData = await pnlRes.json();
            if (pnlData.pnl) {
                setPnl(pnlData.pnl);
            }

            // Fetch invoices for this tour
            const invRes = await fetch(`/api/customer-invoices?tour_id=${tourId}`);
            const invData = await invRes.json();
            setInvoices(invData.invoices || []);

            // Fetch payment vouchers for this tour
            const voucherRes = await fetch(`/api/payment-vouchers?tour_id=${tourId}`);
            const voucherData = await voucherRes.json();
            setVouchers(voucherData.vouchers || []);
        } catch (err) {
            console.error("Error fetching PNL data:", err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch tour and costing sheet details
    useEffect(() => {
        const fetchTourDetails = async () => {
            try {
                const res = await fetch(`/api/tours/${tourId}`);
                const data = await res.json();
                if (data.tour) {
                    setTourDetails(data.tour);
                    setActualKm(data.tour.actual_km_logged?.toString() || "");

                    // Fetch costing sheet extras using itinerary_id from tour
                    if (data.tour.itinerary_id) {
                        try {
                            const costingRes = await fetch(`/api/costing-sheet?itinerary_id=${data.tour.itinerary_id}`);
                            if (costingRes.ok) {
                                const costingData = await costingRes.json();
                                if (costingData.costingSheet?.extras_data) {
                                    setCostingExtras(costingData.costingSheet.extras_data);
                                }
                            }
                        } catch (costingErr) {
                            console.error("Error fetching costing sheet:", costingErr);
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching tour details:", err);
            }
        };
        fetchTourDetails();
    }, [tourId]);

    const handleLogSheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("tourId", tourId);
            formData.append("actualKm", actualKm);

            const res = await fetch("/api/driver-log-sheet/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            const data = await res.json();
            setTourDetails(prev => prev ? { ...prev, ...data.tour } : prev);
            alert("Log sheet uploaded successfully!");
        } catch (err) {
            console.error("Upload error:", err);
            alert("Failed to upload log sheet");
        } finally {
            setUploading(false);
        }
    };

    const expenseData = pnl
        ? [
            { name: "Hotels", value: pnl.hotel_expenses, color: EXPENSE_COLORS.hotel },
            { name: "Driver", value: pnl.driver_expenses, color: EXPENSE_COLORS.driver },
            { name: "Miscellaneous", value: pnl.misc_expenses, color: EXPENSE_COLORS.misc },
        ].filter((d) => d.value > 0)
        : [];

    const comparisonData = pnl
        ? [
            { name: "Income", value: pnl.total_income },
            { name: "Expenses", value: pnl.total_expenses },
            { name: "Net Profit", value: pnl.net_profit },
        ]
        : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!pnl) {
        return (
            <div className="text-center py-12">
                <p className="text-surface-500">No P&L data found for this tour</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <div>
                <Link
                    href="/pnl"
                    className="inline-flex items-center gap-2 text-sm text-surface-600 hover:text-surface-900 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to P&L Dashboard
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-5 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <p className="text-[10px] uppercase font-bold text-blue-600 tracking-wider mb-1">
                        Total Income
                    </p>
                    <p className="text-2xl font-black text-blue-700">
                        ${(pnl.total_income || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-500 mt-1">
                        From {invoices.filter((i) => i.status === "paid").length} paid invoice(s)
                    </p>
                </div>
                <div className="card p-5 bg-gradient-to-br from-accent-900/30 to-surface-800 border-accent-700/30">
                    <p className="text-[10px] uppercase font-bold text-accent-500 tracking-wider mb-1">
                        Total Expenses
                    </p>
                    <p className="text-2xl font-black text-accent-400">
                        ${(pnl.total_expenses || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-accent-400 mt-1">
                        From {vouchers.filter((v) => v.status === "paid").length} paid voucher(s)
                    </p>
                </div>
                <div
                    className={`card p-5 ${pnl.net_profit >= 0
                        ? "bg-gradient-to-br from-green-50 to-green-100 border-green-200"
                        : "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200"
                        }`}
                >
                    <p
                        className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${pnl.net_profit >= 0 ? "text-green-600" : "text-orange-600"
                            }`}
                    >
                        Net Profit
                    </p>
                    <p
                        className={`text-2xl font-black ${pnl.net_profit >= 0 ? "text-green-700" : "text-orange-700"
                            }`}
                    >
                        ${(pnl.net_profit || 0).toLocaleString()}
                    </p>
                </div>
                <div className="card p-5 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <p className="text-[10px] uppercase font-bold text-purple-600 tracking-wider mb-1">
                        Profit Margin
                    </p>
                    <p className="text-2xl font-black text-purple-700">
                        {pnl.total_income > 0
                            ? ((pnl.net_profit / pnl.total_income) * 100).toFixed(1)
                            : 0}
                        %
                    </p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income vs Expense Comparison */}
                <div className="card p-6">
                    <h3 className="text-sm font-bold text-surface-900 mb-4">Income vs Expenses</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis type="number" tickFormatter={(v) => `$${v.toLocaleString()}`} />
                                <YAxis dataKey="name" type="category" width={80} />
                                <Tooltip
                                    formatter={(value) => [`$${Number(value || 0).toLocaleString()}`, "Amount"]}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {comparisonData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={
                                                entry.name === "Income"
                                                    ? "#3b82f6"
                                                    : entry.name === "Expenses"
                                                        ? "#e0c16c"
                                                        : entry.value >= 0
                                                            ? "#22c55e"
                                                            : "#f59e0b"
                                            }
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expense Breakdown Pie */}
                <div className="card p-6">
                    <h3 className="text-sm font-bold text-surface-900 mb-4">Expense Breakdown</h3>
                    {expenseData.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={expenseData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        dataKey="value"
                                        label={({ name, percent }) =>
                                            `${name} ${((percent || 0) * 100).toFixed(0)}%`
                                        }
                                    >
                                        {expenseData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => [`$${Number(value || 0).toLocaleString()}`, "Amount"]}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center">
                            <p className="text-surface-400">No expense data</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Expense Details Table */}
            <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-200 bg-surface-50">
                    <h3 className="text-sm font-bold text-surface-900">Expense Details</h3>
                </div>
                <table className="w-full">
                    <thead className="bg-surface-50 border-b border-surface-200">
                        <tr>
                            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500">
                                Category
                            </th>
                            <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500">
                                Amount (USD)
                            </th>
                            <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500">
                                % of Total
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                        <tr>
                            <td className="px-4 py-3 text-sm flex items-center gap-2">
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: EXPENSE_COLORS.hotel }}
                                ></span>
                                Hotel Expenses
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium">
                                ${(pnl.hotel_expenses || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-surface-500">
                                {pnl.total_expenses > 0
                                    ? ((pnl.hotel_expenses / pnl.total_expenses) * 100).toFixed(1)
                                    : 0}
                                %
                            </td>
                        </tr>
                        <tr>
                            <td className="px-4 py-3 text-sm flex items-center gap-2">
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: EXPENSE_COLORS.driver }}
                                ></span>
                                Driver Expenses
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium">
                                ${(pnl.driver_expenses || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-surface-500">
                                {pnl.total_expenses > 0
                                    ? ((pnl.driver_expenses / pnl.total_expenses) * 100).toFixed(1)
                                    : 0}
                                %
                            </td>
                        </tr>
                        <tr>
                            <td className="px-4 py-3 text-sm flex items-center gap-2">
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: EXPENSE_COLORS.misc }}
                                ></span>
                                Miscellaneous
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium">
                                ${(pnl.misc_expenses || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-surface-500">
                                {pnl.total_expenses > 0
                                    ? ((pnl.misc_expenses / pnl.total_expenses) * 100).toFixed(1)
                                    : 0}
                                %
                            </td>
                        </tr>
                        <tr className="bg-surface-100 font-bold">
                            <td className="px-4 py-3 text-sm">Total Expenses</td>
                            <td className="px-4 py-3 text-sm text-right text-accent-500">
                                ${(pnl.total_expenses || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">100%</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Driver Log Sheet & Actual KM Section */}
            <div className="card overflow-hidden border-amber-200">
                <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/50 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-surface-900">Driver Log Sheet</h3>
                        <p className="text-xs text-surface-500 mt-0.5">Upload completed log sheet for actual KM tracking</p>
                    </div>
                    {tourDetails?.log_sheet_uploaded_at && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg">
                            Uploaded
                        </span>
                    )}
                </div>
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-surface-600 mb-1.5">
                                Actual Kilometers Logged
                            </label>
                            <input
                                type="number"
                                value={actualKm}
                                onChange={(e) => setActualKm(e.target.value)}
                                placeholder="Enter actual KM from log sheet"
                                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:border-primary-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-surface-600 mb-1.5">
                                Upload Completed Log Sheet
                            </label>
                            <div className="flex items-center gap-2">
                                <label className="flex-1 cursor-pointer">
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.pdf"
                                        onChange={handleLogSheetUpload}
                                        disabled={uploading}
                                        className="hidden"
                                    />
                                    <div className={`px-4 py-2 text-sm border-2 border-dashed rounded-lg text-center transition-colors ${uploading ? "bg-surface-100 border-surface-300" : "border-amber-300 hover:border-amber-400 hover:bg-amber-50"}`}>
                                        {uploading ? (
                                            <span className="text-surface-500">Uploading...</span>
                                        ) : tourDetails?.driver_log_sheet_url ? (
                                            <span className="text-green-600 font-medium">✓ Re-upload log sheet</span>
                                        ) : (
                                            <span className="text-amber-600 font-medium">Click to upload log sheet</span>
                                        )}
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                    {tourDetails?.actual_km_logged && tourDetails.actual_km_logged > 0 && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-sm text-blue-700">
                                <span className="font-bold">{tourDetails.actual_km_logged.toLocaleString()} km</span> recorded from driver log sheet
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Costing Sheet Extras (Miscellaneous) */}
            {costingExtras.length > 0 && (
                <div className="card overflow-hidden">
                    <div className="px-4 py-3 border-b border-surface-200 bg-surface-50">
                        <h3 className="text-sm font-bold text-surface-900">Costing Sheet Extras (Miscellaneous)</h3>
                        <p className="text-xs text-surface-500 mt-0.5">Itemized extras from the tour costing sheet</p>
                    </div>
                    <table className="w-full">
                        <thead className="bg-surface-50 border-b border-surface-200">
                            <tr>
                                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500">
                                    Description
                                </th>
                                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500">
                                    Cost (USD)
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                            {costingExtras.map((extra, idx) => (
                                <tr key={idx}>
                                    <td className="px-4 py-3 text-sm">{extra.description || "Unnamed expense"}</td>
                                    <td className="px-4 py-3 text-sm text-right font-medium text-amber-600">
                                        ${(extra.cost || 0).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-surface-100 font-bold">
                                <td className="px-4 py-3 text-sm">Total Extras</td>
                                <td className="px-4 py-3 text-sm text-right text-amber-600">
                                    ${costingExtras.reduce((sum, e) => sum + (e.cost || 0), 0).toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* Income Details */}
            <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-200 bg-surface-50">
                    <h3 className="text-sm font-bold text-surface-900">Income Details (Invoices)</h3>
                </div>
                <table className="w-full">
                    <thead className="bg-surface-50 border-b border-surface-200">
                        <tr>
                            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500">
                                Invoice No
                            </th>
                            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500">
                                Customer
                            </th>
                            <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500">
                                Status
                            </th>
                            <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500">
                                Amount
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                        {invoices.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-surface-400">
                                    No invoices found
                                </td>
                            </tr>
                        ) : (
                            invoices.map((inv) => (
                                <tr key={inv.id}>
                                    <td className="px-4 py-3 text-sm font-medium">{inv.invoice_no}</td>
                                    <td className="px-4 py-3 text-sm">{inv.customer_name}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span
                                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${inv.status === "paid"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-slate-100 text-slate-700"
                                                }`}
                                        >
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">
                                        ${(inv.total_amount || 0).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Payment Vouchers */}
            <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-200 bg-surface-50">
                    <h3 className="text-sm font-bold text-surface-900">Expense Details (Payment Vouchers)</h3>
                </div>
                <table className="w-full">
                    <thead className="bg-surface-50 border-b border-surface-200">
                        <tr>
                            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500">
                                Voucher No
                            </th>
                            <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500">
                                Payee
                            </th>
                            <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500">
                                Type
                            </th>
                            <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500">
                                Amount (USD)
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                        {vouchers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-surface-400">
                                    No payment vouchers found
                                </td>
                            </tr>
                        ) : (
                            vouchers.map((v) => (
                                <tr key={v.id}>
                                    <td className="px-4 py-3 text-sm font-medium">{v.voucher_no}</td>
                                    <td className="px-4 py-3 text-sm">{v.payee_name}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-surface-100 text-surface-700">
                                            {v.payee_type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right font-medium text-accent-500">
                                        ${(v.total_usd || 0).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
