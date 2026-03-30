"use client";

import { useState, useEffect } from "react";
import { CostingSheetToggleButton } from "./CostingSheetToggleButton";
import { CostingSheetForm } from "./CostingSheetForm";
import type { CostingSheet } from "@/lib/validations/costingSheet";

interface CostingSheetSectionProps {
    itineraryId: string;
    initialData?: (CostingSheet & { id?: string }) | null;
    itineraryDays: Array<{
        day: number;
        date: string;
        overnight_location: string;
        hotel_suggestion: string;
    }>;
    noOfNights: number;
    totalDistance?: string | number;
    arrivalDate?: string;
    noOfPax?: number;
    hotelType?: string;
    mealPlan?: string;
    agentCompany?: string;
    roomsSgl?: number;
    roomsDbl?: number;
    roomsTpl?: number;
    roomsQtpl?: number;
    clientName?: string;
    passportNo?: string;
    country?: string;
    agentName?: string;
    roomCategory?: string;
}

export function CostingSheetSection({
    itineraryId,
    initialData,
    itineraryDays,
    noOfNights,
    totalDistance,
    arrivalDate,
    noOfPax,
    hotelType,
    mealPlan,
    agentCompany,
    agentName,
    roomsSgl,
    roomsDbl,
    roomsTpl,
    roomsQtpl,
    clientName,
    passportNo,
    country,
    roomCategory
}: CostingSheetSectionProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Prevent scrolling when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [isOpen]);

    return (
        <>
            <div className="flex justify-start">
                <CostingSheetToggleButton
                    itineraryId={itineraryId}
                    hasCostingSheet={!!initialData}
                    onClick={() => setIsOpen(true)}
                />
            </div>

            {/* Sliding Drawer */}
            <div
                className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />

                {/* Panel */}
                <div
                    className={`absolute inset-y-0 right-0 w-full max-w-7xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
                >
                    <div className="h-full flex flex-col">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between bg-surface-50">
                            <h2 className="text-xl font-bold text-surface-900">Tour Costing Sheet</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-surface-200 rounded-full transition-colors"
                                aria-label="Close"
                            >
                                <svg className="w-6 h-6 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 bg-surface-50">
                            <div className="max-w-5xl mx-auto">
                                <CostingSheetForm
                                    itineraryId={itineraryId}
                                    initialData={initialData || undefined}
                                    itineraryDays={itineraryDays}
                                    noOfNights={noOfNights}
                                    totalDistance={totalDistance}
                                    arrivalDate={arrivalDate}
                                    noOfPax={noOfPax}
                                    hotelType={hotelType}
                                    mealPlan={mealPlan}
                                    agentCompany={agentCompany}
                                    agentName={agentName}
                                    roomsSgl={roomsSgl}
                                    roomsDbl={roomsDbl}
                                    roomsTpl={roomsTpl}
                                    roomsQtpl={roomsQtpl}
                                    clientName={clientName}
                                    passportNo={passportNo}
                                    country={country}
                                    roomCategory={roomCategory}
                                    onSaveSuccess={() => setIsOpen(false)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
