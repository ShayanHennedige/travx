"use client";

import { useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { WorkflowActions } from "@/app/itineraries/[id]/WorkflowActions";
import type { CostingSheet } from "@/lib/validations/costingSheet";

interface OperationItem {
    id: string;
    inquiryId: string | null;
    groupInquiryId: string | null;
    inquiryNumber: string;
    clientName: string;
    isGroup: boolean;
    arrivalDate: string | null;
    departureDate: string | null;
    noOfNights: number;
    paxAdults: number;
    paxChildren: number;
    nationality: string;
    agentCompany: string;
    mealPlan: string;
    roomCategory: string;
    agentName: string;
    passportNo: string;
    country: string;
    title: string;
    createdAt: string;
    status: string;
    costingSheet: (CostingSheet & { id: string }) | null;
    tour: { id: string } | null;
    vouchersCount: number;
    invoicesCount: number;
    itineraryDays: any[];
    totalDistance?: string;
    hotelType: string;
    hotels: any[];
    roomsSgl: number;
    roomsDbl: number;
    roomsTpl: number;
    roomsQtpl: number;
    paymentVouchersCount: number;
}

interface OperationsListProps {
    operations: OperationItem[];
}

export function OperationsList({ operations }: OperationsListProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_progress" | "complete">("all");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const safeFormat = (dateStr: string | null, formatStr: string) => {
        if (!dateStr) return "N/A";
        try {
            return format(new Date(dateStr), formatStr);
        } catch {
            return "N/A";
        }
    };

    // Calculate workflow progress for each item
    const getProgress = (item: OperationItem) => {
        let completed = 0;
        const isCostingComplete = item.costingSheet?.status === "finalized" || item.costingSheet?.status === "approved";
        if (isCostingComplete) completed++;
        if (item.invoicesCount > 0) completed++;
        if (item.tour) completed++;
        if (item.vouchersCount > 0) completed++;
        if (item.paymentVouchersCount > 0) completed++;
        return { completed, total: 5 };
    };

    const getWorkflowStatus = (item: OperationItem) => {
        const { completed, total } = getProgress(item);
        if (completed === total) return "complete";
        if (completed > 0) return "in_progress";
        return "pending";
    };

    // Filter operations
    const filteredOperations = operations.filter(op => {
        const matchesSearch =
            op.inquiryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            op.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            op.title.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (statusFilter === "all") return true;
        return getWorkflowStatus(op) === statusFilter;
    });

    // Stats
    const stats = {
        total: operations.length,
        pending: operations.filter(op => getWorkflowStatus(op) === "pending").length,
        inProgress: operations.filter(op => getWorkflowStatus(op) === "in_progress").length,
        complete: operations.filter(op => getWorkflowStatus(op) === "complete").length,
    };

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredOperations.length / itemsPerPage);
    const paginatedOperations = filteredOperations.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset to page 1 when filters change
    const handleSearch = (value: string) => {
        setSearchTerm(value);
        setCurrentPage(1);
    };

    const handleStatusFilter = (status: "all" | "pending" | "in_progress" | "complete") => {
        setStatusFilter(status);
        setCurrentPage(1);
    };

    return (
        <div className="space-y-4">
            {/* Compact Header: Stats + Search */}
            <div className="card p-4">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Stats Pills */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${statusFilter === "all" ? "bg-primary-600 text-white" : "bg-surface-100 text-surface-600 hover:bg-surface-200"}`}
                            onClick={() => handleStatusFilter("all")}
                        >
                            All ({stats.total})
                        </button>
                        <button
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${statusFilter === "pending" ? "bg-amber-500 text-white" : "bg-surface-100 text-amber-600 hover:bg-amber-50"}`}
                            onClick={() => handleStatusFilter("pending")}
                        >
                            Not Started ({stats.pending})
                        </button>
                        <button
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${statusFilter === "in_progress" ? "bg-blue-500 text-white" : "bg-surface-100 text-blue-600 hover:bg-blue-50"}`}
                            onClick={() => handleStatusFilter("in_progress")}
                        >
                            In Progress ({stats.inProgress})
                        </button>
                        <button
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${statusFilter === "complete" ? "bg-green-500 text-white" : "bg-surface-100 text-green-600 hover:bg-green-50"}`}
                            onClick={() => handleStatusFilter("complete")}
                        >
                            Complete ({stats.complete})
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 max-w-sm ml-auto">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Operations List */}
            <div className="space-y-3">
                {paginatedOperations.map((op) => {
                    const progress = getProgress(op);
                    const isExpanded = expandedId === op.id;
                    const isCostingComplete = op.costingSheet?.status === "finalized" || op.costingSheet?.status === "approved";
                    const hasInvoice = op.invoicesCount > 0;
                    const isTourFinalized = !!op.tour;
                    const hasVouchers = op.vouchersCount > 0;
                    const hasPaymentVouchers = op.paymentVouchersCount > 0;

                    return (
                        <div key={op.id} className={`card overflow-hidden transition-all duration-300 ${isExpanded ? "ring-2 ring-primary-500 shadow-xl" : "hover:bg-surface-50"}`}>
                            {/* Header Row */}
                            <div
                                className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 cursor-pointer"
                                onClick={() => setExpandedId(isExpanded ? null : op.id)}
                            >
                                {/* Progress Indicator */}
                                <div className="relative w-14 h-14 flex-shrink-0">
                                    <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
                                        <circle
                                            cx="18"
                                            cy="18"
                                            r="16"
                                            fill="none"
                                            stroke="#f1f5f9"
                                            strokeWidth="3"
                                        />
                                        <circle
                                            cx="18"
                                            cy="18"
                                            r="16"
                                            fill="none"
                                            stroke={progress.completed === 5 ? "#22c55e" : "#3b82f6"}
                                            strokeWidth="3"
                                            strokeDasharray={`${(progress.completed / progress.total) * 100} 100`}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-surface-900 tracking-tighter">
                                        {progress.completed}/{progress.total}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-xs font-black text-primary-600 tracking-wider">{op.inquiryNumber}</span>
                                        {op.isGroup && (
                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[9px] font-bold uppercase tracking-wide">Group</span>
                                        )}
                                    </div>
                                    <h3 className="text-base font-bold text-surface-900 truncate mb-0.5">{op.clientName}</h3>
                                    <p className="text-xs text-surface-500 truncate">{op.title}</p>
                                </div>

                                {/* Dates & Pax (Hidden on small screens) */}
                                <div className="text-right hidden md:block border-l border-surface-100 pl-5">
                                    <p className="text-sm text-surface-900 font-bold mb-0.5">
                                        {safeFormat(op.arrivalDate, "MMM d")} - {safeFormat(op.departureDate, "MMM d, yyyy")}
                                    </p>
                                    <p className="text-[11px] text-surface-500 font-medium">{op.noOfNights} nights • {op.paxAdults + op.paxChildren} pax</p>
                                </div>

                                {/* Quick Status Icons */}
                                <div className="flex gap-2 flex-shrink-0 px-2 lg:px-5">
                                    <div className={`w-3 h-3 rounded-full transition-colors ${isCostingComplete ? "bg-green-500" : op.costingSheet ? "bg-blue-500" : "bg-surface-200"}`} title="Costing" />
                                    <div className={`w-3 h-3 rounded-full transition-colors ${hasInvoice ? "bg-green-500" : "bg-surface-200"}`} title="Invoice" />
                                    <div className={`w-3 h-3 rounded-full transition-colors ${isTourFinalized ? "bg-green-500" : "bg-surface-200"}`} title="Tour" />
                                    <div className={`w-3 h-3 rounded-full transition-colors ${hasVouchers ? "bg-green-500" : "bg-surface-200"}`} title="Vouchers" />
                                    <div className={`w-3 h-3 rounded-full transition-colors ${hasPaymentVouchers ? "bg-green-500" : "bg-surface-200"}`} title="Payment Vouchers" />
                                </div>

                                {/* Expand Arrow */}
                                <div className={`w-8 h-8 rounded-full bg-surface-50 flex items-center justify-center transition-all ${isExpanded ? "bg-primary-50 text-primary-600 rotate-180" : "text-surface-400"}`}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Expanded Content - Full Workflow Hub */}
                            {isExpanded && (
                                <div className="border-t border-surface-100 bg-surface-50/50 p-6 animate-in slide-in-from-top-2 duration-300">
                                    <WorkflowActions
                                        itineraryId={op.id}
                                        inquiryId={op.inquiryId}
                                        groupInquiryId={op.groupInquiryId}
                                        guestName={op.clientName}
                                        nationality={op.nationality}
                                        paxAdults={op.paxAdults}
                                        paxChildren={op.paxChildren}
                                        agentName={op.agentName}
                                        passportNo={op.passportNo}
                                        country={op.country}
                                        roomCategory={op.roomCategory}
                                        inquiry={{
                                            arriving_date: op.arrivalDate || "",
                                            departure_date: op.departureDate || "",
                                            no_of_nights: op.noOfNights,
                                            meal_plan: op.mealPlan,
                                            room_category: op.roomCategory,
                                            agent_name: op.agentName,
                                            agent_company: op.agentCompany,
                                            rooms_sgl: op.roomsSgl,
                                            rooms_dbl: op.roomsDbl,
                                            rooms_tpl: op.roomsTpl,
                                            rooms_qtpl: op.roomsQtpl
                                        }}
                                        costingSheet={op.costingSheet}
                                        existingTour={op.tour}
                                        vouchersCount={op.vouchersCount}
                                        invoicesCount={op.invoicesCount}
                                        hotels={op.hotels}
                                        itineraryDays={op.itineraryDays}
                                        totalDistance={op.totalDistance}
                                        hotelType={op.hotelType}
                                        paymentVouchersCount={op.paymentVouchersCount}
                                    />
                                    {/* Quick Links */}
                                    <div className="mt-4 pt-4 border-t border-surface-200 flex items-center gap-3">
                                        <Link href={`/itineraries/${op.id}`} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            View Itinerary
                                        </Link>
                                        <span className="text-surface-300">|</span>
                                        <Link href={op.isGroup ? `/group-inquiries/${op.id}` : `/inquiries/${op.id}`} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            View Inquiry
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {filteredOperations.length === 0 && (
                <div className="card p-12 text-center">
                    <svg className="w-12 h-12 text-surface-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-surface-500 font-medium">No operations found</p>
                    <p className="text-sm text-surface-400 mt-1">Create itineraries to start tracking their workflow</p>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-surface-50 rounded-lg">
                    <p className="text-sm text-surface-600">
                        Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredOperations.length)} of {filteredOperations.length} tours
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-surface-200 text-surface-700 hover:bg-surface-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1.5 text-sm font-bold text-surface-900">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-surface-200 text-surface-700 hover:bg-surface-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
