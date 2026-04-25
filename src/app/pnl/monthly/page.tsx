"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format, subMonths } from "date-fns";
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
} from "recharts";

interface MonthlyPnl {
    month: string;
    monthKey: string;
    tourCount: number;
    totalIncome: number;
    totalExpenses: number;
    hotelExpenses: number;
    driverExpenses: number;
    miscExpenses: number;
    netProfit: number;
    profitMargin: number;
    tours: TourPnl[];
}

interface TourPnl {
    id: string;
    clientName: string;
    startDate: string;
    endDate: string;
    income: number;
    hotelExpenses: number;
    driverExpenses: number;
    miscExpenses: number;
    totalExpenses: number;
    netProfit: number;
}

export default function MonthlyPnlPage() {
    const [monthlyData, setMonthlyData] = useState<MonthlyPnl[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<MonthlyPnl | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMonthlyData();
    }, []);

    const fetchMonthlyData = async () => {
        try {
            const res = await fetch("/api/pnl/monthly?months_back=6");
            const data = await res.json();
            setMonthlyData(data.months || []);
        } catch (error) {
            console.error("Error fetching monthly P&L:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadMonthDetail = async (monthKey: string) => {
        try {
            const res = await fetch(`/api/pnl/monthly?month=${monthKey}`);
            const data = await res.json();
            setSelectedMonth(data);
        } catch (error) {
            console.error("Error fetching month detail:", error);
        }
    };

    // Prepare chart data
    const chartData = monthlyData.slice().reverse().map(m => ({
        month: m.month.split(" ")[0].substring(0, 3), // Short month name
        Income: m.totalIncome,
        Expenses: m.totalExpenses,
        Profit: m.netProfit
    }));

    if (loading) {
        return (
            <div className="min-h-screen bg-surface-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-surface-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-surface-900">Monthly P&L Summary</h1>
                        <p className="text-sm text-surface-500 mt-1">
                            Financial overview of tours by month
                        </p>
                    </div>
                    <Link href="/pnl">
                        <Button variant="secondary">← Back to P&L</Button>
                    </Link>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {monthlyData.slice(0, 4).map((month) => (
                        <div
                            key={month.monthKey}
                            onClick={() => loadMonthDetail(month.monthKey)}
                            className={`card p-4 cursor-pointer hover:shadow-md transition-shadow ${selectedMonth?.monthKey === month.monthKey ? "ring-2 ring-primary-500" : ""
                                }`}
                        >
                            <p className="text-xs font-medium text-surface-500 uppercase">{month.month}</p>
                            <p className="text-xl font-bold text-surface-900 mt-1">
                                ${month.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-surface-500">{month.tourCount} tours</span>
                                <span className={`text-xs font-semibold ${month.profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {month.profitMargin.toFixed(1)}% margin
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chart */}
                <div className="card p-6 mb-8">
                    <h2 className="text-lg font-semibold text-surface-900 mb-4">6-Month Trend</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value) => `$${Number(value).toLocaleString()}`}
                                />
                                <Legend />
                                <Bar dataKey="Income" fill="#22c55e" />
                                <Bar dataKey="Expenses" fill="#ef4444" />
                                <Bar dataKey="Profit" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Selected Month Detail */}
                {selectedMonth && (
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-surface-900">{selectedMonth.month} - Tour Breakdown</h2>
                            <button
                                onClick={() => setSelectedMonth(null)}
                                className="text-sm text-surface-500 hover:text-surface-700"
                            >
                                Close
                            </button>
                        </div>

                        {/* Summary Row */}
                        <div className="grid grid-cols-5 gap-4 p-4 bg-surface-50 rounded-lg mb-4">
                            <div>
                                <p className="text-xs text-surface-500">Total Income</p>
                                <p className="text-lg font-bold text-green-600">
                                    ${selectedMonth.totalIncome.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-surface-500">Hotel Expenses</p>
                                <p className="text-lg font-bold text-blue-600">
                                    ${selectedMonth.hotelExpenses.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-surface-500">Driver Expenses</p>
                                <p className="text-lg font-bold text-purple-600">
                                    ${selectedMonth.driverExpenses.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-surface-500">Misc Expenses</p>
                                <p className="text-lg font-bold text-amber-600">
                                    ${selectedMonth.miscExpenses.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-surface-500">Net Profit</p>
                                <p className={`text-lg font-bold ${selectedMonth.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    ${selectedMonth.netProfit.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Tours Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-surface-50">
                                        <th className="px-4 py-2 text-left font-medium text-surface-700">Client</th>
                                        <th className="px-4 py-2 text-left font-medium text-surface-700">Dates</th>
                                        <th className="px-4 py-2 text-right font-medium text-surface-700">Income</th>
                                        <th className="px-4 py-2 text-right font-medium text-surface-700">Hotel</th>
                                        <th className="px-4 py-2 text-right font-medium text-surface-700">Driver</th>
                                        <th className="px-4 py-2 text-right font-medium text-surface-700">Misc</th>
                                        <th className="px-4 py-2 text-right font-medium text-surface-700">Profit</th>
                                        <th className="px-4 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedMonth.tours.map((tour) => (
                                        <tr key={tour.id} className="border-b border-surface-100">
                                            <td className="px-4 py-3 font-medium">{tour.clientName}</td>
                                            <td className="px-4 py-3 text-surface-500">
                                                {new Date(tour.startDate).toLocaleDateString()} - {new Date(tour.endDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-right text-green-600">
                                                ${tour.income.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-right text-surface-600">
                                                ${tour.hotelExpenses.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-right text-surface-600">
                                                ${tour.driverExpenses.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-right text-surface-600">
                                                ${tour.miscExpenses.toLocaleString()}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-semibold ${tour.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                ${tour.netProfit.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link href={`/pnl/${tour.id}`}>
                                                    <Button variant="ghost" size="sm">View</Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!selectedMonth && monthlyData.every(m => m.tourCount === 0) && (
                    <div className="card p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-surface-900">No Tours Found</h3>
                        <p className="text-sm text-surface-500 mt-1">
                            Monthly P&L will appear here once tours are available in the selected months.
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
