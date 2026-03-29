"use client";

import { useState, useEffect } from "react";
import { Button, Badge, Input } from "@/components/ui";
import { format, subDays } from "date-fns";
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    RadialBarChart,
    RadialBar,
} from "recharts";

interface DriverStat {
    name: string;
    vehicleType: string;
    averageScore: number;
    reviewCount: number;
}

interface HotelStat {
    name: string;
    averageScore: number;
    reviewCount: number;
}

interface VehicleStat {
    type: string;
    number: string;
    averageScore: number;
    reviewCount: number;
}

interface AnalyticsData {
    countryDistribution: Record<string, number>;
    categoryHappiness: {
        airportWelcome: number;
        hotelQuality: number;
        driver: number;
        vehicle: number;
        overallExperience: number;
    };
    overallHappiness: number;
    lowScores: Array<{ category: string; score: number; feedbackId: string; guest: string }>;
    keywords: Record<string, number>;
    totalFeedback: number;
    driverPerformance: DriverStat[];
    hotelPerformance: HotelStat[];
    vehiclePerformance: VehicleStat[];
}

export function AnalyticsDashboard() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"overall" | "drivers" | "vehicles" | "hotels">("overall");
    const [filters, setFilters] = useState({
        date_from: format(subDays(new Date(), 30), "yyyy-MM-dd"),
        date_to: format(new Date(), "yyyy-MM-dd"),
        country: "",
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.date_from) params.append("date_from", filters.date_from);
            if (filters.date_to) params.append("date_to", filters.date_to);
            if (filters.country) params.append("country", filters.country);

            const response = await fetch(`/api/analytics/feedback?${params.toString()}`);
            if (!response.ok) throw new Error("Failed to fetch analytics");
            const json = await response.json();
            setData(json);
        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters]);

    const getScoreColor = (score: number) => {
        if (score >= 90) return "text-green-600 bg-green-50 border-green-100";
        if (score >= 70) return "text-blue-600 bg-blue-50 border-blue-100";
        if (score >= 50) return "text-orange-600 bg-orange-50 border-orange-100";
        return "text-accent-500 bg-accent-500/10 border-accent-500/20";
    };

    const ProgressRing = ({ score, label }: { score: number; label: string }) => {
        const radius = 36;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (score / 100) * circumference;

        return (
            <div className="flex flex-col items-center gap-3">
                <div className="relative w-24 h-24">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="48"
                            cy="48"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-surface-100"
                        />
                        <circle
                            cx="48"
                            cy="48"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={circumference}
                            style={{ strokeDashoffset: offset }}
                            className={`transition-all duration-1000 ease-out ${score >= 80 ? "text-primary-600" : score >= 60 ? "text-blue-500" : "text-orange-500"
                                }`}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-black text-surface-900">{score}%</span>
                    </div>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-surface-500 text-center">{label}</span>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
                    <p className="text-surface-500 font-medium animate-pulse">Analyzing feedback data...</p>
                </div>
            </div>
        );
    }

    if (!data || data.totalFeedback === 0) {
        return (
            <div className="card-elevated p-16 text-center max-w-lg mx-auto mt-12 bg-white/50 backdrop-blur-sm border-dashed">
                <div className="w-20 h-20 bg-surface-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-surface-900 mb-2">Insight Horizon Clear</h3>
                <p className="text-surface-500 mb-8 lowercase first-letter:uppercase">No feedback records found for this criteria. Try expanding your date range or removing filters.</p>
                <Button onClick={() => setFilters({ ...filters, date_from: "2024-01-01", country: "" })} variant="secondary" className="rounded-full px-8">
                    Reset View
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 rounded-3xl border border-surface-200 shadow-sm sticky top-20 z-10 backdrop-blur-md bg-white/80">
                <div className="flex flex-wrap gap-2 p-1 bg-surface-100 rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab("overall")}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "overall" ? "bg-white text-primary-600 shadow-sm" : "text-surface-500 hover:text-surface-900"
                            }`}
                    >
                        Overall Insight
                    </button>
                    <button
                        onClick={() => setActiveTab("drivers")}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "drivers" ? "bg-white text-primary-600 shadow-sm" : "text-surface-500 hover:text-surface-900"
                            }`}
                    >
                        Drivers
                    </button>
                    <button
                        onClick={() => setActiveTab("vehicles")}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "vehicles" ? "bg-white text-primary-600 shadow-sm" : "text-surface-500 hover:text-surface-900"
                            }`}
                    >
                        Fleet
                    </button>
                    <button
                        onClick={() => setActiveTab("hotels")}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "hotels" ? "bg-white text-primary-600 shadow-sm" : "text-surface-500 hover:text-surface-900"
                            }`}
                    >
                        Hotels
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 bg-surface-50 px-4 py-2 rounded-2xl border border-surface-200">
                        <span className="text-[10px] font-black uppercase tracking-tighter text-surface-400">Range</span>
                        <input
                            type="date"
                            value={filters.date_from}
                            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                            className="bg-transparent border-none text-xs font-bold outline-none focus:ring-0 w-28"
                        />
                        <span className="text-surface-300">→</span>
                        <input
                            type="date"
                            value={filters.date_to}
                            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                            className="bg-transparent border-none text-xs font-bold outline-none focus:ring-0 w-28"
                        />
                    </div>
                    <div className="relative group">
                        <input
                            type="text"
                            value={filters.country}
                            onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                            placeholder="All Countries"
                            className="bg-surface-50 border border-surface-200 px-4 py-2.5 rounded-2xl text-xs font-bold outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all w-32 group-hover:w-48"
                        />
                    </div>
                </div>
            </div>

            {activeTab === "overall" && (
                <div className="space-y-10">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-surface-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                            <p className="text-xs font-bold uppercase tracking-widest text-surface-400 mb-4">Overall Score</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black italic">{data.overallHappiness}%</span>
                                <span className="text-primary-400 font-bold">↑</span>
                            </div>
                            <p className="text-sm text-surface-300 mt-4 lowercase">Based on {data.totalFeedback} guest reviews</p>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-surface-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-surface-400 mb-1">Response Volume</p>
                                <p className="text-4xl font-black text-surface-900">{data.totalFeedback}</p>
                            </div>
                            <div className="mt-4 flex gap-1">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="flex-1 h-8 bg-surface-100 rounded-sm overflow-hidden flex items-end">
                                        <div className="w-full bg-primary-500/30" style={{ height: `${Math.random() * 100}%` }} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-surface-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-surface-400 mb-1">High Performers</p>
                                <p className="text-4xl font-black text-primary-600">
                                    {data.driverPerformance.filter(d => d.averageScore >= 90).length +
                                        data.hotelPerformance.filter(h => h.averageScore >= 90).length}
                                </p>
                            </div>
                            <p className="text-xs text-surface-500 mt-2">Drivers & Hotels above 90%</p>
                        </div>

                        <div className="bg-accent-500/10 p-8 rounded-[2.5rem] border border-accent-500/20 shadow-sm flex flex-col justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-accent-400 mb-1">Attention Required</p>
                                <p className="text-4xl font-black text-accent-500">{data.lowScores.length}</p>
                            </div>
                            <p className="text-xs text-accent-400 mt-2">Feedback entries below 50%</p>
                        </div>
                    </div>

                    {/* Radar/Progress Distribution */}
                    <div className="bg-white p-10 rounded-[3rem] border border-surface-200 shadow-sm">
                        <h3 className="text-2xl font-black text-surface-900 mb-10 text-center uppercase tracking-tight">Category Breakdown</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                            <ProgressRing score={data.categoryHappiness.airportWelcome} label="Airport Welcome" />
                            <ProgressRing score={data.categoryHappiness.driver} label="Driver Experience" />
                            <ProgressRing score={data.categoryHappiness.vehicle} label="Fleet Quality" />
                            <ProgressRing score={data.categoryHappiness.hotelQuality} label="Accommodation" />
                            <ProgressRing score={data.categoryHappiness.overallExperience} label="Overall Journey" />
                        </div>
                    </div>

                    {/* Distribution Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Guest Distribution - Clean List Form */}
                        <div className="bg-white p-10 rounded-[3rem] border border-surface-200 shadow-sm">
                            <h3 className="text-xl font-black text-surface-900 mb-8 uppercase tracking-tight">Guest Distribution</h3>
                            <div className="grid grid-cols-1 gap-4">
                                {Object.entries(data.countryDistribution)
                                    .sort(([, a], [, b]) => b - a)
                                    .slice(0, 8)
                                    .map(([country, count]) => {
                                        const perc = Math.round((count / data.totalFeedback) * 100);
                                        return (
                                            <div key={country} className="flex items-center justify-between p-4 rounded-2xl bg-surface-50 border border-surface-100 group hover:bg-white hover:shadow-md transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-surface-200 flex items-center justify-center font-bold text-surface-600 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                                                        {country.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-surface-900">{country}</p>
                                                        <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">{count} reviews</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-black text-surface-900">{perc}%</p>
                                                    <div className="w-24 h-1.5 bg-surface-200 rounded-full mt-1 overflow-hidden">
                                                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${perc}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* Guest Voice - Large Display */}
                        <div className="bg-white p-10 rounded-[3rem] border border-surface-200 shadow-sm">
                            <h3 className="text-xl font-black text-surface-900 mb-8 uppercase tracking-tight">The Guest Voice</h3>
                            <div className="flex flex-wrap gap-4">
                                {Object.entries(data.keywords).slice(0, 25).map(([word, freq]) => (
                                    <span
                                        key={word}
                                        className="px-6 py-3 bg-surface-50 border border-surface-100 rounded-2xl text-xs font-bold text-surface-600 hover:scale-105 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-100 transition-all cursor-default shadow-sm"
                                        style={{ fontSize: `${Math.max(0.7, Math.min(1.5, 0.7 + freq * 0.12))}rem` }}
                                    >
                                        {word} <span className="opacity-30 ml-1 italic font-normal">{freq}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "drivers" && (
                <div className="animate-slide-up">
                    <div className="bg-white rounded-[3rem] border border-surface-200 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-surface-100 bg-surface-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                            <h3 className="text-2xl font-black text-surface-900 uppercase tracking-tight">Driver Performance</h3>
                            <Badge className="bg-primary-500 text-white border-none py-1.5 px-4 font-bold">Best in Fleet: {data.driverPerformance[0]?.name}</Badge>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-surface-50/50 border-b border-surface-100">
                                        <th className="px-8 py-5 text-left text-xs font-black uppercase tracking-widest text-surface-400">Driver Profile</th>
                                        <th className="px-8 py-5 text-left text-xs font-black uppercase tracking-widest text-surface-400">Assigned Asset</th>
                                        <th className="px-8 py-5 text-center text-xs font-black uppercase tracking-widest text-surface-400">Satisfaction</th>
                                        <th className="px-8 py-5 text-right text-xs font-black uppercase tracking-widest text-surface-400">Review Count</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-100">
                                    {data.driverPerformance.map((driver, i) => (
                                        <tr key={i} className="hover:bg-surface-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 font-black text-xl group-hover:bg-primary-500 group-hover:text-white transition-all">
                                                        {driver.name.charAt(0)}
                                                    </div>
                                                    <span className="font-black text-surface-900">{driver.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <Badge variant="secondary" className="border-surface-200 text-surface-500 font-bold uppercase">{driver.vehicleType}</Badge>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex justify-center">
                                                    <div className={`px-4 py-1.5 rounded-full border text-sm font-black ${getScoreColor(driver.averageScore)}`}>
                                                        {driver.averageScore}%
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right font-bold text-surface-500">{driver.reviewCount} reviews</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "vehicles" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-slide-up">
                    {data.vehiclePerformance.map((vehicle, i) => (
                        <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-surface-200 shadow-sm hover:shadow-xl transition-all group">
                            <div className="flex justify-between items-start mb-8">
                                <div className="w-14 h-14 bg-surface-100 rounded-2xl flex items-center justify-center text-surface-400 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors">
                                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </div>
                                <div className={`px-4 py-2 rounded-2xl border text-xl font-black ${getScoreColor(vehicle.averageScore)}`}>
                                    {vehicle.averageScore}%
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-xl font-black text-surface-900">{vehicle.type}</h4>
                                <p className="text-sm font-bold text-surface-400 uppercase tracking-widest">{vehicle.number}</p>
                            </div>
                            <div className="mt-8 pt-8 border-t border-surface-50 flex justify-between items-center">
                                <span className="text-xs font-bold text-surface-400 uppercase tracking-widest">Active Utilization</span>
                                <span className="text-sm font-black text-surface-900">{vehicle.reviewCount} Trips</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === "hotels" && (
                <div className="bg-white rounded-[3rem] border border-surface-200 shadow-sm p-10 animate-slide-up">
                    <div className="grid grid-cols-1 gap-6">
                        {data.hotelPerformance.map((hotel, i) => (
                            <div key={i} className="flex items-center gap-6 p-6 rounded-2xl border border-surface-50 hover:border-primary-100 transition-all group">
                                <div className="w-8 h-8 font-black text-surface-300 italic group-hover:text-primary-200 transition-colors">#{i + 1}</div>
                                <div className="flex-1">
                                    <h4 className="font-black text-surface-900 text-lg">{hotel.name}</h4>
                                    <p className="text-xs font-bold text-surface-400 uppercase tracking-tighter">{hotel.reviewCount} Guest Ratings</p>
                                </div>
                                <div className="w-20 sm:w-48 h-3 bg-surface-50 rounded-full overflow-hidden border border-surface-100">
                                    <div
                                        className={`h-full transition-all duration-1000 ${hotel.averageScore >= 80 ? "bg-primary-500" : "bg-blue-400"}`}
                                        style={{ width: `${hotel.averageScore}%` }}
                                    />
                                </div>
                                <div className={`w-16 text-right font-black ${hotel.averageScore >= 80 ? "text-primary-600" : "text-surface-900"}`}>
                                    {hotel.averageScore}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
