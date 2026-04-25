"use client";

import { useState, useEffect, useMemo } from "react";
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
    arrivalFlightNo?: string | null;
    arrivalTime?: string | null;
    departureFlightNo?: string | null;
    departureTime?: string | null;
    isTourAgent?: boolean;
    isDeclined?: boolean;
    declineReason?: string | null;
}

// A group of operations sharing the same inquiry
interface OperationGroup {
    inquiryNumber: string;
    clientName: string;
    isGroup: boolean;
    arrivalDate: string | null;
    departureDate: string | null;
    noOfNights: number;
    paxAdults: number;
    paxChildren: number;
    variants: OperationItem[];
}

interface OperationsListProps {
    operations: OperationItem[];
}

export function OperationsList({ operations }: OperationsListProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_progress" | "complete">("all");
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    // Track which variant (by itinerary id) is selected within each group
    const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
    const [showDeclinedSection, setShowDeclinedSection] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const expandId = params.get("expand");
            if (expandId) {
                // Find the group that contains this itinerary id
                const matchingOp = operations.find(op => op.id === expandId);
                if (matchingOp) {
                    setExpandedGroup(matchingOp.inquiryNumber);
                    setSelectedVariants(prev => ({ ...prev, [matchingOp.inquiryNumber]: expandId }));
                }
            }
        }
    }, [operations]);

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

    // Group operations by inquiry number
    const groupedOperations = useMemo(() => {
        const groups = new Map<string, OperationGroup>();
        operations.forEach(op => {
            const key = op.inquiryNumber;
            if (!groups.has(key)) {
                groups.set(key, {
                    inquiryNumber: op.inquiryNumber,
                    clientName: op.clientName,
                    isGroup: op.isGroup,
                    arrivalDate: op.arrivalDate,
                    departureDate: op.departureDate,
                    noOfNights: op.noOfNights,
                    paxAdults: op.paxAdults,
                    paxChildren: op.paxChildren,
                    variants: [],
                });
            }
            groups.get(key)!.variants.push(op);
        });
        return Array.from(groups.values());
    }, [operations]);

    // Separate declined groups from active groups
    const isGroupDeclined = (group: OperationGroup) =>
        group.variants.every(op => op.isDeclined);

    const activeGroups = groupedOperations.filter(g => !isGroupDeclined(g));
    const declinedGroups = groupedOperations.filter(g => isGroupDeclined(g));

    // Filter active groups: a group matches if ANY of its variants match
    const filteredGroups = activeGroups.filter(group => {
        const matchesSearch = group.variants.some(op =>
            op.inquiryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            op.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            op.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (!matchesSearch) return false;

        if (statusFilter === "all") return true;
        return group.variants.some(op => getWorkflowStatus(op) === statusFilter);
    });

    // Stats (count unique active groups, not individual operations)
    const stats = {
        total: activeGroups.length,
        pending: activeGroups.filter(g => g.variants.every(op => getWorkflowStatus(op) === "pending")).length,
        inProgress: activeGroups.filter(g => g.variants.some(op => getWorkflowStatus(op) === "in_progress") || (g.variants.some(op => getWorkflowStatus(op) !== "pending") && g.variants.some(op => getWorkflowStatus(op) !== "complete"))).length,
        complete: activeGroups.filter(g => g.variants.every(op => getWorkflowStatus(op) === "complete")).length,
        declined: declinedGroups.length,
    };

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);
    const paginatedGroups = filteredGroups.slice(
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

    // Extract a short variant label from the itinerary title
    const getVariantLabel = (title: string, inquiryNumber: string) => {
        // Try to extract meaningful variant name
        // Common patterns: "Sri Lanka 5 Day Adventure", "Sri Lanka 5 Day Luxury Adventure"
        // We want just the differentiating part
        return title || "Untitled";
    };

    // Get the best progress to show on the group header (the "most advanced" variant)
    const getGroupBestProgress = (variants: OperationItem[]) => {
        let best = { completed: 0, total: 5 };
        variants.forEach(v => {
            const p = getProgress(v);
            if (p.completed > best.completed) best = p;
        });
        return best;
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

            {/* Operations List - Grouped */}
            <div className="space-y-3">
                {paginatedGroups.map((group) => {
                    const isExpanded = expandedGroup === group.inquiryNumber;
                    const hasMultipleVariants = group.variants.length > 1;
                    const selectedVariantId = selectedVariants[group.inquiryNumber] || group.variants[0].id;
                    const activeVariant = group.variants.find(v => v.id === selectedVariantId) || group.variants[0];
                    const progress = getProgress(activeVariant);

                    const isCostingComplete = activeVariant.costingSheet?.status === "finalized" || activeVariant.costingSheet?.status === "approved";
                    const hasInvoice = activeVariant.invoicesCount > 0;
                    const isTourFinalized = !!activeVariant.tour;
                    const hasVouchers = activeVariant.vouchersCount > 0;
                    const hasPaymentVouchers = activeVariant.paymentVouchersCount > 0;

                    return (
                        <div key={group.inquiryNumber} className={`card overflow-hidden transition-all duration-300 ${isExpanded ? "ring-2 ring-primary-500 shadow-xl" : "hover:bg-surface-50"}`}>
                            {/* Header Row */}
                            <div
                                className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 cursor-pointer"
                                onClick={() => setExpandedGroup(isExpanded ? null : group.inquiryNumber)}
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
                                        <span className="text-xs font-black text-primary-600 tracking-wider">{group.inquiryNumber}</span>
                                        {group.isGroup && (
                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[9px] font-bold uppercase tracking-wide">Group</span>
                                        )}
                                        {hasMultipleVariants && (
                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full text-[9px] font-bold uppercase tracking-wide flex items-center gap-1">
                                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                </svg>
                                                {group.variants.length} Variants
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-base font-bold text-surface-900 truncate mb-0.5">{group.clientName}</h3>
                                    <p className="text-xs text-surface-500 truncate">{activeVariant.title}</p>
                                </div>

                                {/* Dates & Pax (Hidden on small screens) */}
                                <div className="text-right hidden md:block border-l border-surface-100 pl-5">
                                    <p className="text-sm text-surface-900 font-bold mb-0.5">
                                        {safeFormat(group.arrivalDate, "MMM d")} - {safeFormat(group.departureDate, "MMM d, yyyy")}
                                    </p>
                                    <p className="text-[11px] text-surface-500 font-medium">{group.noOfNights} nights • {group.paxAdults + group.paxChildren} pax</p>
                                </div>

                                {/* Quick Status Icons (for active variant) */}
                                <div className="flex gap-2 flex-shrink-0 px-2 lg:px-5">
                                    <div className={`w-3 h-3 rounded-full transition-colors ${isCostingComplete ? "bg-green-500" : activeVariant.costingSheet ? "bg-blue-500" : "bg-surface-200"}`} title="Costing" />
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
                                <div className="border-t border-surface-100 bg-surface-50/50 animate-in slide-in-from-top-2 duration-300">
                                    {/* Variant Switcher - Only show when multiple variants exist */}
                                    {hasMultipleVariants && (
                                        <div className="px-6 pt-5 pb-0">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                    </svg>
                                                    Itinerary Variant
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {group.variants.map((variant, index) => {
                                                    const isActive = variant.id === activeVariant.id;
                                                    const varProgress = getProgress(variant);
                                                    return (
                                                        <button
                                                            key={variant.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedVariants(prev => ({ ...prev, [group.inquiryNumber]: variant.id }));
                                                            }}
                                                            className={`
                                                                group relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border
                                                                ${isActive
                                                                    ? "bg-white text-primary-700 border-primary-300 shadow-md shadow-primary-100/50 ring-1 ring-primary-200"
                                                                    : "bg-white/60 text-surface-600 border-surface-200 hover:border-primary-200 hover:bg-white hover:text-primary-600 hover:shadow-sm"
                                                                }
                                                            `}
                                                        >
                                                            {/* Active indicator dot */}
                                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${isActive ? "bg-primary-500" : "bg-surface-300 group-hover:bg-primary-300"}`} />
                                                            
                                                            {/* Title */}
                                                            <span className="truncate max-w-[200px]">{getVariantLabel(variant.title, group.inquiryNumber)}</span>
                                                            
                                                            {/* Mini progress */}
                                                            <span className={`
                                                                ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0
                                                                ${varProgress.completed === varProgress.total
                                                                    ? "bg-green-100 text-green-700"
                                                                    : varProgress.completed > 0
                                                                        ? "bg-blue-100 text-blue-700"
                                                                        : "bg-surface-100 text-surface-500"
                                                                }
                                                            `}>
                                                                {varProgress.completed}/{varProgress.total}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Workflow content for the active variant */}
                                    <div className="p-6">
                                        <WorkflowActions
                                            itineraryId={activeVariant.id}
                                            inquiryId={activeVariant.inquiryId}
                                            groupInquiryId={activeVariant.groupInquiryId}
                                            guestName={activeVariant.clientName}
                                            nationality={activeVariant.nationality}
                                            paxAdults={activeVariant.paxAdults}
                                            paxChildren={activeVariant.paxChildren}
                                            agentName={activeVariant.agentName}
                                            passportNo={activeVariant.passportNo}
                                            country={activeVariant.country}
                                            roomCategory={activeVariant.roomCategory}
                                            inquiry={{
                                                arriving_date: activeVariant.arrivalDate || "",
                                                departure_date: activeVariant.departureDate || "",
                                                no_of_nights: activeVariant.noOfNights,
                                                meal_plan: activeVariant.mealPlan,
                                                room_category: activeVariant.roomCategory,
                                                agent_name: activeVariant.agentName,
                                                agent_company: activeVariant.agentCompany,
                                                rooms_sgl: activeVariant.roomsSgl,
                                                rooms_dbl: activeVariant.roomsDbl,
                                                rooms_tpl: activeVariant.roomsTpl,
                                                rooms_qtpl: activeVariant.roomsQtpl,
                                                arrival_flight_no: activeVariant.arrivalFlightNo,
                                                arrival_time: activeVariant.arrivalTime,
                                                departure_flight_no: activeVariant.departureFlightNo,
                                                departure_time: activeVariant.departureTime,
                                                is_tour_agent: activeVariant.isTourAgent
                                            }}
                                            costingSheet={activeVariant.costingSheet}
                                            existingTour={activeVariant.tour}
                                            vouchersCount={activeVariant.vouchersCount}
                                            invoicesCount={activeVariant.invoicesCount}
                                            hotels={activeVariant.hotels}
                                            itineraryDays={activeVariant.itineraryDays}
                                            totalDistance={activeVariant.totalDistance}
                                            hotelType={activeVariant.hotelType}
                                            paymentVouchersCount={activeVariant.paymentVouchersCount}
                                            isDeclined={activeVariant.isDeclined}
                                            declineReason={activeVariant.declineReason}
                                        />
                                        {/* Quick Links */}
                                        <div className="mt-4 pt-4 border-t border-surface-200 flex items-center gap-3">
                                            <Link href={`/itineraries/${activeVariant.id}`} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                View Itinerary
                                            </Link>
                                            <span className="text-surface-300">|</span>
                                            <Link href={activeVariant.isGroup ? `/group-inquiries/${activeVariant.id}` : `/inquiries/${activeVariant.id}`} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                View Inquiry
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {filteredGroups.length === 0 && (
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
                        Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredGroups.length)} of {filteredGroups.length} tours
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

            {/* Declined Tours Section */}
            {declinedGroups.length > 0 && (
                <div className="mt-8">
                    <button
                        onClick={() => setShowDeclinedSection(!showDeclinedSection)}
                        className="w-full flex items-center justify-between px-5 py-4 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <h3 className="text-sm font-bold text-red-900">Declined Tours</h3>
                                <p className="text-xs text-red-600">{declinedGroups.length} tour{declinedGroups.length !== 1 ? "s" : ""} declined by clients</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-red-200 text-red-800 rounded-full text-xs font-bold">{declinedGroups.length}</span>
                            <svg className={`w-5 h-5 text-red-500 transition-transform ${showDeclinedSection ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </button>

                    {showDeclinedSection && (
                        <div className="mt-3 space-y-3">
                            {declinedGroups.map((group) => {
                                const isExpanded = expandedGroup === group.inquiryNumber;
                                const hasMultipleVariants = group.variants.length > 1;
                                const selectedVariantId = selectedVariants[group.inquiryNumber] || group.variants[0].id;
                                const activeVariant = group.variants.find(v => v.id === selectedVariantId) || group.variants[0];
                                const progress = getProgress(activeVariant);

                                return (
                                    <div key={group.inquiryNumber} className={`card overflow-hidden transition-all duration-300 border-l-4 border-l-red-400 ${isExpanded ? "ring-2 ring-red-300 shadow-xl" : "hover:bg-red-50/50"}`}>
                                        {/* Header Row */}
                                        <div
                                            className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 cursor-pointer"
                                            onClick={() => setExpandedGroup(isExpanded ? null : group.inquiryNumber)}
                                        >
                                            {/* Declined Icon */}
                                            <div className="relative w-14 h-14 flex-shrink-0 flex items-center justify-center">
                                                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                                                    <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                    </svg>
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-xs font-black text-red-600 tracking-wider">{group.inquiryNumber}</span>
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[9px] font-bold uppercase tracking-wide">Declined</span>
                                                    {hasMultipleVariants && (
                                                        <span className="px-2 py-0.5 bg-surface-100 text-surface-500 rounded-full text-[9px] font-bold">
                                                            {group.variants.length} Variants
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-base font-bold text-surface-900 truncate mb-0.5">{group.clientName}</h3>
                                                <p className="text-xs text-surface-500 truncate">{activeVariant.title}</p>
                                                {activeVariant.declineReason && (
                                                    <p className="text-xs text-red-500 mt-1 italic truncate">Reason: {activeVariant.declineReason}</p>
                                                )}
                                            </div>

                                            {/* Dates */}
                                            <div className="text-right hidden md:block border-l border-surface-100 pl-5">
                                                <p className="text-sm text-surface-900 font-bold mb-0.5">
                                                    {safeFormat(group.arrivalDate, "MMM d")} - {safeFormat(group.departureDate, "MMM d, yyyy")}
                                                </p>
                                                <p className="text-[11px] text-surface-500 font-medium">{group.noOfNights} nights • {group.paxAdults + group.paxChildren} pax</p>
                                            </div>

                                            {/* Expand Arrow */}
                                            <div className={`w-8 h-8 rounded-full bg-surface-50 flex items-center justify-center transition-all ${isExpanded ? "bg-red-50 text-red-600 rotate-180" : "text-surface-400"}`}>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Expanded Content */}
                                        {isExpanded && (
                                            <div className="border-t border-red-100 bg-red-50/30 animate-in slide-in-from-top-2 duration-300">
                                                {/* Variant Switcher */}
                                                {hasMultipleVariants && (
                                                    <div className="px-6 pt-5 pb-0">
                                                        <div className="flex flex-wrap gap-2">
                                                            {group.variants.map((variant) => {
                                                                const isActive = variant.id === activeVariant.id;
                                                                return (
                                                                    <button
                                                                        key={variant.id}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedVariants(prev => ({ ...prev, [group.inquiryNumber]: variant.id }));
                                                                        }}
                                                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all border ${
                                                                            isActive
                                                                                ? "bg-white text-red-700 border-red-300 shadow-sm"
                                                                                : "bg-white/60 text-surface-600 border-surface-200 hover:border-red-200 hover:bg-white"
                                                                        }`}
                                                                    >
                                                                        <span className={`w-2 h-2 rounded-full ${isActive ? "bg-red-500" : "bg-surface-300"}`} />
                                                                        <span className="truncate max-w-[200px]">{variant.title}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="p-6">
                                                    <WorkflowActions
                                                        itineraryId={activeVariant.id}
                                                        inquiryId={activeVariant.inquiryId}
                                                        groupInquiryId={activeVariant.groupInquiryId}
                                                        guestName={activeVariant.clientName}
                                                        nationality={activeVariant.nationality}
                                                        paxAdults={activeVariant.paxAdults}
                                                        paxChildren={activeVariant.paxChildren}
                                                        agentName={activeVariant.agentName}
                                                        passportNo={activeVariant.passportNo}
                                                        country={activeVariant.country}
                                                        roomCategory={activeVariant.roomCategory}
                                                        inquiry={{
                                                            arriving_date: activeVariant.arrivalDate || "",
                                                            departure_date: activeVariant.departureDate || "",
                                                            no_of_nights: activeVariant.noOfNights,
                                                            meal_plan: activeVariant.mealPlan,
                                                            room_category: activeVariant.roomCategory,
                                                            agent_name: activeVariant.agentName,
                                                            agent_company: activeVariant.agentCompany,
                                                            rooms_sgl: activeVariant.roomsSgl,
                                                            rooms_dbl: activeVariant.roomsDbl,
                                                            rooms_tpl: activeVariant.roomsTpl,
                                                            rooms_qtpl: activeVariant.roomsQtpl,
                                                            arrival_flight_no: activeVariant.arrivalFlightNo,
                                                            arrival_time: activeVariant.arrivalTime,
                                                            departure_flight_no: activeVariant.departureFlightNo,
                                                            departure_time: activeVariant.departureTime,
                                                            is_tour_agent: activeVariant.isTourAgent
                                                        }}
                                                        costingSheet={activeVariant.costingSheet}
                                                        existingTour={activeVariant.tour}
                                                        vouchersCount={activeVariant.vouchersCount}
                                                        invoicesCount={activeVariant.invoicesCount}
                                                        hotels={activeVariant.hotels}
                                                        itineraryDays={activeVariant.itineraryDays}
                                                        totalDistance={activeVariant.totalDistance}
                                                        hotelType={activeVariant.hotelType}
                                                        paymentVouchersCount={activeVariant.paymentVouchersCount}
                                                        isDeclined={activeVariant.isDeclined}
                                                        declineReason={activeVariant.declineReason}
                                                    />
                                                    <div className="mt-4 pt-4 border-t border-red-200 flex items-center gap-3">
                                                        <Link href={`/itineraries/${activeVariant.id}`} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors">
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            View Itinerary
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
