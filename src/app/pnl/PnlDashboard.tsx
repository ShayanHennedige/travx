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
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";

interface PnlRecord {
    id: string;
    tour_id: string;
    tour_reference: string;
    income: number;
    hotel_expenses: number;
    driver_expenses: number;
    misc_expenses: number;
    total_expenses: number;
    net_profit: number;
    invoice_count?: number;
    voucher_count?: number;
    has_detail?: boolean;
    detail_key?: string | null;
}

interface PnlSummary {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    recordCount: number;
    expenseBreakdown: {
        hotel: number;
        driver: number;
        misc: number;
    };
    tourStatusBreakdown?: Record<string, number>;
}


export function PnlDashboard() {
    const [records, setRecords] = useState<PnlRecord[]>([]);
    const [summary, setSummary] = useState<PnlSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<"all" | "month" | "quarter" | "year">("all");

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/pnl/summary?range=${dateRange}`);
            if (!response.ok) {
                let message = `Failed to load P&L data (${response.status})`;
                try {
                    const errorBody = await response.json();
                    if (errorBody?.error) {
                        message = errorBody.error;
                    }
                } catch {
                    // Ignore JSON parse issues and keep the status-based message.
                }
                throw new Error(message);
            }
            const data = await response.json();
            console.log("DEBUG: PNL data fetched:", data);
            setRecords(data.records || []);
            setSummary(data.summary || null);
        } catch (err) {
            console.error("Error fetching PNL data:", err);
            setError(err instanceof Error ? err.message : "Failed to load P&L data");
            setRecords([]);
            setSummary(null);
        } finally {
            setLoading(false);
        }
    };

    const expenseData = summary
        ? [
            { name: "Hotels", value: summary.expenseBreakdown.hotel, color: "#3b82f6" },
            { name: "Driver", value: summary.expenseBreakdown.driver, color: "#22c55e" },
            { name: "Miscellaneous", value: summary.expenseBreakdown.misc, color: "#f59e0b" },
        ].filter((d) => d.value > 0)
        : [];

    const incomeVsExpenseData = summary
        ? [
            { name: "Income", amount: summary.totalIncome },
            { name: "Expenses", amount: summary.totalExpenses },
            { name: "Net Profit", amount: summary.netProfit },
        ]
        : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card p-6 border-red-200 bg-red-50">
                <p className="text-sm font-semibold text-red-700">Unable to load P&L data</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
                <Button className="mt-4" variant="secondary" onClick={fetchData}>
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Date Range Filter */}
            <div className="card p-4">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-surface-600">Period:</span>
                    <div className="flex flex-wrap gap-2">
                        {(["all", "month", "quarter", "year"] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${dateRange === range
                                    ? "bg-primary-600 text-white"
                                    : "bg-surface-100 text-surface-600 hover:bg-surface-200"
                                    }`}
                            >
                                {range === "all" ? "All Time" : range.charAt(0).toUpperCase() + range.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-5 bg-linear-to-br from-blue-50 to-blue-100 border-blue-200">
                    <p className="text-[10px] uppercase font-bold text-blue-600 tracking-wider mb-1">
                        Total Income
                    </p>
                    <p className="text-2xl font-black text-blue-700">
                        ${(summary?.totalIncome || 0).toLocaleString()}
                    </p>
                </div>
                <div className="card p-5 bg-linear-to-br from-red-50 to-red-100 border-red-200">
                    <p className="text-[10px] uppercase font-bold text-red-600 tracking-wider mb-1">
                        Total Expenses
                    </p>
                    <p className="text-2xl font-black text-red-700">
                        ${(summary?.totalExpenses || 0).toLocaleString()}
                    </p>
                </div>
                <div className="card p-5 bg-linear-to-br from-green-50 to-green-100 border-green-200">
                    <p className="text-[10px] uppercase font-bold text-green-600 tracking-wider mb-1">
                        Net Profit
                    </p>
                    <p className="text-2xl font-black text-green-700">
                        ${(summary?.netProfit || 0).toLocaleString()}
                    </p>
                </div>
                <div className="card p-5 bg-linear-to-br from-purple-50 to-purple-100 border-purple-200">
                    <p className="text-[10px] uppercase font-bold text-purple-600 tracking-wider mb-1">
                        Profit Margin
                    </p>
                    <p className="text-2xl font-black text-purple-700">
                        {(summary?.profitMargin || 0).toFixed(1)}%
                    </p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income vs Expenses Bar Chart */}
                <div className="card p-6">
                    <h3 className="text-sm font-bold text-surface-900 mb-4">Income vs Expenses</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={incomeVsExpenseData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} />
                                <Tooltip
                                    formatter={(value) => [`$${Number(value || 0).toLocaleString()}`, "Amount"]}
                                />
                                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                    {incomeVsExpenseData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={
                                                entry.name === "Income"
                                                    ? "#3b82f6"
                                                    : entry.name === "Expenses"
                                                        ? "#ef4444"
                                                        : "#22c55e"
                                            }
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expense Distribution Pie Chart */}
                <div className="card p-6">
                    <h3 className="text-sm font-bold text-surface-900 mb-4">Expense Distribution</h3>
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
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* PNL Records Table */}
            <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-surface-900">P&L by Tour</h3>
                    <span className="text-xs text-surface-500">{records.length} records</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-surface-50 border-b border-surface-200">
                            <tr>
                                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500 whitespace-nowrap">
                                    Tour Reference
                                </th>
                                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500 whitespace-nowrap">
                                    Income
                                </th>
                                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500 whitespace-nowrap">
                                    Expenses
                                </th>
                                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500 whitespace-nowrap">
                                    Net Profit
                                </th>
                                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500 whitespace-nowrap">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                            {records.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center">
                                        <p className="text-surface-500 font-medium mb-4">No P&L records found</p>
                                        <div className="text-left max-w-md mx-auto">
                                            <p className="text-xs text-surface-600 mb-3">
                                                <span className="font-semibold">Reason:</span> No tours were found for the selected period.
                                            </p>
                                            {summary?.tourStatusBreakdown && Object.keys(summary.tourStatusBreakdown).length > 0 ? (
                                                <div className="bg-surface-50 p-3 rounded-lg mb-3 border border-surface-200">
                                                    <p className="text-xs font-semibold text-surface-700 mb-2">Your tours by status:</p>
                                                    <div className="space-y-1">
                                                        {Object.entries(summary.tourStatusBreakdown).map(([status, count]) => (
                                                            <p key={status} className={`text-xs ${status === "completed" ? "text-green-600 font-semibold" : "text-surface-500"}`}>
                                                                • <span className="capitalize">{status}</span>: <span className="font-medium">{count as number}</span> tour{(count as number) !== 1 ? "s" : ""}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : null}
                                            <p className="text-xs text-surface-500">
                                                Add tours and linked invoices or vouchers in <Link href="/drivers" className="text-primary-600 hover:underline font-semibold">Tour Management</Link> to see financial details here.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                records.map((record) => (
                                    <tr key={record.id} className="hover:bg-surface-50 transition-colors">
                                        <td className="px-4 py-3">
                                            {record.detail_key ? (
                                                <Link
                                                    href={`/pnl/${encodeURIComponent(record.detail_key)}`}
                                                    className="text-sm font-bold text-primary-600 hover:text-primary-700"
                                                >
                                                    {record.tour_reference || "N/A"}
                                                </Link>
                                            ) : (
                                                <span className="text-sm font-bold text-surface-700">
                                                    {record.tour_reference || "N/A"}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-blue-600 font-medium">
                                            ${(record.income || 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">
                                            ${(record.total_expenses || 0).toLocaleString()}
                                        </td>
                                        <td
                                            className={`px-4 py-3 text-sm text-right font-bold ${(record.net_profit || 0) >= 0 ? "text-green-600" : "text-red-600"
                                                }`}
                                        >
                                            ${(record.net_profit || 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {record.detail_key ? (
                                                <Link href={`/pnl/${encodeURIComponent(record.detail_key)}`}>
                                                    <Button size="sm" variant="secondary" className="rounded-lg">
                                                        View
                                                    </Button>
                                                </Link>
                                            ) : (
                                                <span className="text-xs text-surface-400">N/A</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
