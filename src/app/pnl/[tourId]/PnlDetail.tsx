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

const ISSUED_INVOICE_STATUSES = new Set(["confirmed", "sent", "paid", "overdue"]);

export function PnlDetail({ tourId }: { tourId: string }) {
    const [pnl, setPnl] = useState<PnlData | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [tourDetails, setTourDetails] = useState<TourDetails | null>(null);
    const [costingExtras, setCostingExtras] = useState<CostingExtras[]>([]);
    const [uploading, setUploading] = useState(false);
    const [actualKm, setActualKm] = useState<string>("");
    const [showMiscForm, setShowMiscForm] = useState(false);
    const [miscDescription, setMiscDescription] = useState("");
    const [miscAmount, setMiscAmount] = useState("");
    const [savingMisc, setSavingMisc] = useState(false);

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
                <div className="card p-5 bg-linear-to-br from-blue-50 to-blue-100 border-blue-200">
                    <p className="text-[10px] uppercase font-bold text-blue-600 tracking-wider mb-1">
                        Total Income
                    </p>
                    <p className="text-2xl font-black text-blue-700">
                        ${(pnl.total_income || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-500 mt-1">
                        From {invoices.filter((i) => ISSUED_INVOICE_STATUSES.has(i.status)).length} issued invoice(s)
                    </p>
                    <p className="text-[11px] text-blue-400 mt-1">
                        {invoices.filter((i) => i.status === "paid").length} paid invoice(s)
                    </p>
                </div>
                <div className="card p-5 bg-linear-to-br from-red-50 to-red-100 border-red-200">
                    <p className="text-[10px] uppercase font-bold text-red-600 tracking-wider mb-1">
                        Total Expenses
                    </p>
                    <p className="text-2xl font-black text-red-700">
                        ${(pnl.total_expenses || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                        From {vouchers.filter((v) => v.status === "paid").length} paid voucher(s)
                    </p>
                </div>
                <div
                    className={`card p-5 ${pnl.net_profit >= 0
                        ? "bg-linear-to-br from-green-50 to-green-100 border-green-200"
                        : "bg-linear-to-br from-orange-50 to-orange-100 border-orange-200"
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
                <div className="card p-5 bg-linear-to-br from-purple-50 to-purple-100 border-purple-200">
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
                                                        ? "#ef4444"
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
                        {/* Add Miscellaneous Expense */}
                        <tr>
                            <td colSpan={3} className="px-4 py-2">
                                {!showMiscForm ? (
                                    <button
                                        onClick={() => setShowMiscForm(true)}
                                        className="flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors"
                                    >
                                        <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-sm font-bold">+</span>
                                        Add Miscellaneous Expense
                                    </button>
                                ) : (
                                    <div className="flex items-end gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-1">Description</label>
                                            <input
                                                type="text"
                                                value={miscDescription}
                                                onChange={(e) => setMiscDescription(e.target.value)}
                                                placeholder="e.g. Airport transfers, Tips..."
                                                className="w-full px-3 py-1.5 text-sm border border-surface-200 rounded-lg focus:border-primary-500 outline-none"
                                            />
                                        </div>
                                        <div className="w-36">
                                            <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-1">Amount (USD)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={miscAmount}
                                                onChange={(e) => setMiscAmount(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full px-3 py-1.5 text-sm border border-surface-200 rounded-lg focus:border-primary-500 outline-none"
                                            />
                                        </div>
                                        <Button
                                            size="sm"
                                            disabled={savingMisc || !miscDescription.trim() || !miscAmount}
                                            onClick={async () => {
                                                setSavingMisc(true);
                                                try {
                                                    const res = await fetch("/api/payment-vouchers", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({
                                                            tour_id: tourId,
                                                            tour_reference: pnl?.tour_reference || "",
                                                            payee_type: "Miscellaneous",
                                                            payee_name: miscDescription.trim(),
                                                            description: miscDescription.trim(),
                                                            total_usd: parseFloat(miscAmount) || 0,
                                                            total_lkr: (parseFloat(miscAmount) || 0) * 300,
                                                            exchange_rate: 300,
                                                            voucher_category: "extras",
                                                            status: "draft",
                                                        }),
                                                    });
                                                    if (!res.ok) throw new Error("Failed to create");
                                                    setMiscDescription("");
                                                    setMiscAmount("");
                                                    setShowMiscForm(false);
                                                    fetchData();
                                                } catch (err) {
                                                    console.error(err);
                                                    alert("Failed to add miscellaneous expense");
                                                } finally {
                                                    setSavingMisc(false);
                                                }
                                            }}
                                            className="bg-amber-600 hover:bg-amber-700 text-white"
                                        >
                                            {savingMisc ? "Saving..." : "Add"}
                                        </Button>
                                        <button
                                            onClick={() => { setShowMiscForm(false); setMiscDescription(""); setMiscAmount(""); }}
                                            className="text-surface-400 hover:text-surface-600 text-xs font-bold"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                        <tr className="bg-surface-100 font-bold">
                            <td className="px-4 py-3 text-sm">Total Expenses</td>
                            <td className="px-4 py-3 text-sm text-right text-red-600">
                                ${(pnl.total_expenses || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">100%</td>
                        </tr>
                    </tbody>
                </table>
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


        </div>
    );
}
