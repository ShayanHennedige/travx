"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { CostingSheetSection } from "@/app/itineraries/[id]/CostingSheetSection";
import { DownloadCostingSheetButtons } from "@/app/itineraries/[id]/DownloadCostingSheetButtons";
import { FinalizeTourButton } from "@/app/itineraries/[id]/FinalizeTourButton";
import { GenerateVouchersButton } from "@/app/itineraries/[id]/GenerateVouchersButton";
import { GeneratePaymentVouchersButton } from "@/app/itineraries/[id]/GeneratePaymentVouchersButton";
import { GenerateFeedbackLink } from "@/components/feedback/GenerateFeedbackLink";
import type { CostingSheet } from "@/lib/validations/costingSheet";

// Workflow actions component with 5-step tracking

interface WorkflowActionsProps {
    itineraryId: string;
    inquiryId: string | null;
    groupInquiryId: string | null;
    guestName: string;
    nationality: string;
    paxAdults: number;
    paxChildren: number;
    passportNo?: string;
    country?: string;
    agentName?: string;
    roomCategory?: string;
    inquiry: {
        arriving_date: string;
        departure_date: string;
        no_of_nights?: number;
        meal_plan?: string;
        agent_company?: string;
        agent_name?: string;
        room_category?: string;
        rooms_sgl?: number;
        rooms_dbl?: number;
        rooms_tpl?: number;
        rooms_qtpl?: number;
        arrival_flight_no?: string | null;
        arrival_time?: string | null;
        departure_flight_no?: string | null;
        departure_time?: string | null;
        is_tour_agent?: boolean;
    } | null;
    costingSheet: (CostingSheet & { id: string }) | null;
    existingTour: {
        id: string;
        existingTourId?: string; // Wait, checking usage
    } | null; // existingTour definition lines 35-37 was just {id: string} | null
    vouchersCount: number;
    invoicesCount?: number;
    hotels: Array<{
        hotel_name: string;
        location: string;
        check_in_date: string;
        check_out_date: string;
        no_of_nights: number;
    }>;
    itineraryDays: any[];
    totalDistance?: string;
    hotelType: string;
    paymentVouchersCount?: number;
    isDeclined?: boolean;
    declineReason?: string | null;
}

export function WorkflowActions({
    itineraryId,
    inquiryId,
    groupInquiryId,
    guestName,
    nationality,
    paxAdults,
    paxChildren,
    passportNo,
    country,
    agentName,
    roomCategory,
    inquiry,
    costingSheet,
    existingTour,
    vouchersCount,
    invoicesCount = 0,
    hotels,
    itineraryDays,
    totalDistance,
    hotelType,
    paymentVouchersCount = 0,
    isDeclined = false,
    declineReason,
}: WorkflowActionsProps) {
    // Determine step statuses
    const isCostingComplete = costingSheet?.status === "finalized" || costingSheet?.status === "approved";
    const hasInvoice = invoicesCount > 0;
    const isTourFinalized = !!existingTour;
    const hasVouchers = vouchersCount > 0;
    const hasPaymentVouchers = paymentVouchersCount > 0;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Step 1: Costing Sheet */}
                <div className={`p-3 rounded-lg border transition-all ${isCostingComplete
                    ? "bg-green-50 border-green-200"
                    : costingSheet
                        ? "bg-blue-50 border-blue-200"
                        : "bg-surface-50 border-surface-100"
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isCostingComplete
                                ? "bg-green-500 text-white"
                                : "bg-blue-100 text-blue-700"
                                }`}>
                                {isCostingComplete ? "✓" : "1"}
                            </span>
                            <span className="text-xs font-bold text-surface-700">Costing</span>
                        </div>
                        {costingSheet ? (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${isCostingComplete
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                                }`}>{costingSheet.status}</span>
                        ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold uppercase">Not Created</span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <CostingSheetSection
                            itineraryId={itineraryId}
                            initialData={costingSheet as any}
                            itineraryDays={itineraryDays}
                            noOfNights={inquiry?.no_of_nights || 0}
                            totalDistance={totalDistance}
                            arrivalDate={inquiry?.arriving_date}
                            noOfPax={paxAdults + paxChildren}
                            hotelType={hotelType}
                            mealPlan={inquiry?.meal_plan || "BB"}
                            agentCompany={inquiry?.agent_company}
                            agentName={agentName}
                            roomsSgl={inquiry?.rooms_sgl}
                            roomsDbl={inquiry?.rooms_dbl}
                            roomsTpl={inquiry?.rooms_tpl}
                            roomsQtpl={inquiry?.rooms_qtpl}
                            clientName={guestName}
                            passportNo={passportNo}
                            country={country}
                            roomCategory={roomCategory}
                        />
                        {costingSheet && <DownloadCostingSheetButtons costingSheetId={costingSheet.id} />}
                    </div>
                </div>

                {/* Step 2: Create Invoice */}
                <div className={`p-3 rounded-lg border transition-all ${hasInvoice
                    ? "bg-green-50 border-green-200"
                    : isCostingComplete
                        ? "bg-surface-50 border-surface-100"
                        : "bg-slate-50 border-slate-200 opacity-60"
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${hasInvoice
                                ? "bg-green-500 text-white"
                                : isCostingComplete
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-200 text-slate-400"
                                }`}>
                                {hasInvoice ? "✓" : "2"}
                            </span>
                            <span className="text-xs font-bold text-surface-700">Customer Invoice</span>
                        </div>
                        {hasInvoice ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-bold uppercase">{invoicesCount} Created</span>
                        ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">Not Created</span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {isCostingComplete ? (
                            <Link href={`/invoices/new?itinerary_id=${itineraryId}`}>
                                <Button size="sm" variant="secondary" className="rounded-lg">
                                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Create Invoice
                                </Button>
                            </Link>
                        ) : (
                            <Button size="sm" variant="secondary" className="rounded-lg opacity-50 cursor-not-allowed" disabled>
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Complete Costing First
                            </Button>
                        )}
                        {hasInvoice && (
                            <>
                                <Link href={`/invoices/new?itinerary_id=${itineraryId}&type=extra`}>
                                    <Button size="sm" variant="secondary" className="rounded-lg border-dashed border-amber-300 text-amber-700 hover:bg-amber-50">
                                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Extra Invoice
                                    </Button>
                                </Link>
                                <Link href={`/invoices?itinerary_id=${itineraryId}`}>
                                    <Button size="sm" variant="ghost" className="rounded-lg text-primary-600">
                                        View Invoices →
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Step 3: Finalize Tour */}
                <div className={`p-3 rounded-lg border transition-all ${isDeclined
                    ? "bg-red-50 border-red-200"
                    : isTourFinalized
                        ? "bg-green-50 border-green-200"
                        : hasInvoice
                            ? "bg-surface-50 border-surface-100"
                            : "bg-slate-50 border-slate-200 opacity-60"
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isDeclined
                                ? "bg-red-500 text-white"
                                : isTourFinalized
                                    ? "bg-green-500 text-white"
                                    : hasInvoice
                                        ? "bg-purple-100 text-purple-700"
                                        : "bg-slate-200 text-slate-400"
                                }`}>
                                {isDeclined ? "✕" : isTourFinalized ? "✓" : "3"}
                            </span>
                            <span className="text-xs font-bold text-surface-700">Finalize Tour</span>
                        </div>
                        {isDeclined ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-bold uppercase">Declined</span>
                        ) : isTourFinalized ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-bold uppercase">Finalized</span>
                        ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">Pending</span>
                        )}
                    </div>
                    {declineReason && isDeclined && (
                        <p className="text-xs text-red-600 mb-2 italic">Reason: {declineReason}</p>
                    )}
                    {inquiry && (
                        <FinalizeTourButton
                            itineraryId={itineraryId}
                            inquiryId={inquiryId}
                            groupInquiryId={groupInquiryId}
                            clientName={guestName}
                            startDate={inquiry.arriving_date}
                            endDate={inquiry.departure_date}
                            paxAdults={paxAdults}
                            paxChildren={paxChildren}
                            existingTourId={existingTour?.id}
                            hasCostingSheet={isCostingComplete}
                            hasVouchers={hasVouchers}
                            hasInvoice={hasInvoice}
                            arrivalFlightNo={inquiry.arrival_flight_no}
                            arrivalTime={inquiry.arrival_time}
                            departureFlightNo={inquiry.departure_flight_no}
                            departureTime={inquiry.departure_time}
                            isDeclined={isDeclined}
                            declineReason={declineReason}
                        />
                    )}
                </div>

                {/* Step 4: Hotel Vouchers */}
                {hotels.length > 0 && (
                    <div className={`p-3 rounded-lg border transition-all ${hasVouchers
                        ? "bg-green-50 border-green-200"
                        : isTourFinalized
                            ? "bg-surface-50 border-surface-100"
                            : "bg-slate-50 border-slate-200 opacity-60"
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${hasVouchers
                                    ? "bg-green-500 text-white"
                                    : isTourFinalized
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-slate-200 text-slate-400"
                                    }`}>
                                    {hasVouchers ? "✓" : "4"}
                                </span>
                                <span className="text-xs font-bold text-surface-700">Hotel Vouchers</span>
                            </div>
                            {hasVouchers ? (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-bold uppercase">{vouchersCount} Created</span>
                            ) : (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">Not Generated</span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {!hasVouchers && (
                                <GenerateVouchersButton
                                    itineraryId={itineraryId}
                                    inquiryId={inquiryId}
                                    groupInquiryId={groupInquiryId}
                                    guestName={guestName}
                                    nationality={nationality}
                                    paxAdults={paxAdults}
                                    paxChildren={paxChildren}
                                    hotels={hotels}
                                    existingVouchersCount={vouchersCount}
                                    isDisabled={!isTourFinalized}
                                />
                            )}
                            {hasVouchers && (
                                <Link href={`/vouchers?itinerary_id=${itineraryId}`}>
                                    <Button size="sm" variant="ghost" className="rounded-lg text-primary-600">
                                        View Vouchers →
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 5: Payment Vouchers */}
                {hasVouchers && existingTour && (
                    <div className={`p-3 rounded-lg border transition-all ${hasPaymentVouchers
                        ? "bg-green-50 border-green-200"
                        : "bg-surface-50 border-surface-100"
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${hasPaymentVouchers
                                    ? "bg-green-500 text-white"
                                    : "bg-indigo-100 text-indigo-700"
                                    }`}>
                                    {hasPaymentVouchers ? "✓" : "5"}
                                </span>
                                <span className="text-xs font-bold text-surface-700">Payment Vouchers</span>
                            </div>
                            {hasPaymentVouchers ? (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-bold uppercase">{paymentVouchersCount} Created</span>
                            ) : (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">Not Generated</span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {!hasPaymentVouchers && (
                                <GeneratePaymentVouchersButton
                                    tourId={existingTour.id}
                                    hasVouchers={hasVouchers}
                                    existingCount={paymentVouchersCount}
                                />
                            )}
                            {hasPaymentVouchers && (
                                <Link href={`/payment-vouchers?tour_id=${existingTour.id}`}>
                                    <Button size="sm" variant="ghost" className="rounded-lg text-primary-600">
                                        View Payments →
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                )}

                {/* Feedback Link Generation */}
                {existingTour && (
                    <div className="p-3 rounded-lg border border-surface-200 bg-surface-50">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                <span className="text-xs font-bold text-surface-700">Customer Feedback</span>
                            </div>
                        </div>
                        <GenerateFeedbackLink tourId={existingTour.id} />
                    </div>
                )}
            </div>

            {/* Workflow Progress */}
            <div className="mt-4 pt-4 border-t border-surface-100">
                <div className="flex items-center justify-between text-[10px] text-surface-500 uppercase font-bold tracking-wide">
                    <span>Workflow Progress</span>
                    <span className="text-primary-600">
                        {[isCostingComplete, hasInvoice, isTourFinalized, hasVouchers, hasPaymentVouchers].filter(Boolean).length} / 5 Complete
                    </span>
                </div>
                <div className="mt-2 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
                        style={{
                            width: `${([isCostingComplete, hasInvoice, isTourFinalized, hasVouchers, hasPaymentVouchers].filter(Boolean).length / 5) * 100}%`
                        }}
                    />
                </div>
            </div>

            {/* Accommodation Summary (Quick Reference) */}
            <div className="mt-4 bg-surface-50 border border-surface-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-surface-700 uppercase tracking-wide flex items-center gap-2">
                        <svg className="w-3 h-3 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Accommodation Summary
                    </h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <span className="text-[10px] text-surface-500 uppercase font-bold block mb-0.5">Meal Plan</span>
                        <span className="text-xs font-semibold text-surface-900">
                            {costingSheet?.accommodation_data?.length 
                                ? Array.from(new Set(costingSheet.accommodation_data.map(a => a.basis))).filter(Boolean).join(" / ")
                                : (inquiry?.meal_plan || "Not Specified")}
                        </span>
                    </div>
                    <div>
                        <span className="text-[10px] text-surface-500 uppercase font-bold block mb-0.5">Hotel Type</span>
                        <span className="text-xs font-semibold text-surface-900">{hotelType || "Standard"}</span>
                    </div>
                    <div>
                        <span className="text-[10px] text-surface-500 uppercase font-bold block mb-0.5">Room Category</span>
                        <span className="text-xs font-semibold text-surface-900">
                            {costingSheet?.accommodation_data?.length
                                ? Array.from(new Set(costingSheet.accommodation_data.map(a => a.room_category))).filter(Boolean).join(" / ")
                                : (inquiry?.room_category || "Standard")}
                        </span>
                    </div>
                    <div>
                        <span className="text-[10px] text-surface-500 uppercase font-bold block mb-0.5">Rooms</span>
                        <span className="text-xs font-semibold text-surface-900">
                            {[
                                inquiry?.rooms_dbl && `${inquiry.rooms_dbl} DBL`,
                                inquiry?.rooms_sgl && `${inquiry.rooms_sgl} SGL`,
                                inquiry?.rooms_tpl && `${inquiry.rooms_tpl} TPL`,
                                inquiry?.rooms_qtpl && `${inquiry.rooms_qtpl} QUAD`
                            ].filter(Boolean).join(", ") || "Not Specified"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
