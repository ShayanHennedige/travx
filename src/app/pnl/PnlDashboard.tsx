"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
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
    status: string;
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
}

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#e0c16c", "#8b5cf6"];

export function PnlDashboard() {
    const [records, setRecords] = useState<PnlRecord[]>([]);
    const [summary, setSummary] = useState<PnlSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<"all" | "month" | "quarter" | "year">("all");

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/pnl/summary?range=${dateRange}`);
            const data = await response.json();
            setRecords(data.records || []);
            setSummary(data.summary || null);
        } catch (err) {
            console.error("Error fetching PNL data:", err);
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
                <div className="card p-5 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <p className="text-[10px] uppercase font-bold text-blue-600 tracking-wider mb-1">
                        Total Income
                    </p>
                    <p className="text-2xl font-black text-blue-700">
                        ${(summary?.totalIncome || 0).toLocaleString()}
                    </p>
                </div>
                <div className="card p-5 bg-gradient-to-br from-accent-900/30 to-surface-800 border-accent-700/30">
                    <p className="text-[10px] uppercase font-bold text-accent-500 tracking-wider mb-1">
                        Total Expenses
                    </p>
                    <p className="text-2xl font-black text-accent-400">
                        ${(summary?.totalExpenses || 0).toLocaleString()}
                    </p>
                </div>
                <div className="card p-5 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <p className="text-[10px] uppercase font-bold text-green-600 tracking-wider mb-1">
                        Net Profit
                    </p>
                    <p className="text-2xl font-black text-green-700">
                        ${(summary?.netProfit || 0).toLocaleString()}
                    </p>
                </div>
                <div className="card p-5 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
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
                                                        ? "#e0c16c"
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
                                    Status
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
                                        <p className="text-surface-500">No P&L records found</p>
                                        <p className="text-xs text-surface-400 mt-1">
                                            P&L records are generated from paid invoices and vouchers
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                records.map((record) => (
                                    <tr key={record.id} className="hover:bg-surface-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <Link
                                                href={`/pnl/${record.tour_id}`}
                                                className="text-sm font-bold text-primary-600 hover:text-primary-700"
                                            >
                                                {record.tour_reference || "N/A"}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-blue-600 font-medium">
                                            ${(record.income || 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-accent-500 font-medium">
                                            ${(record.total_expenses || 0).toLocaleString()}
                                        </td>
                                        <td
                                            className={`px-4 py-3 text-sm text-right font-bold ${(record.net_profit || 0) >= 0 ? "text-green-600" : "text-accent-500"
                                                }`}
                                        >
                                            ${(record.net_profit || 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span
                                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${record.status === "finalized"
                                                    ? "bg-green-100 text-green-700"
                                                    : record.status === "approved"
                                                        ? "bg-blue-100 text-blue-700"
                                                        : "bg-slate-100 text-slate-700"
                                                    }`}
                                            >
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Link href={`/pnl/${record.tour_id}`}>
                                                <Button size="sm" variant="secondary" className="rounded-lg">
                                                    View
                                                </Button>
                                            </Link>
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
