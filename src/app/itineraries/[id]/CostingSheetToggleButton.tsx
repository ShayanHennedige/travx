"use client";

import { Button } from "@/components/ui";

interface CostingSheetToggleButtonProps {
    itineraryId: string;
    hasCostingSheet: boolean;
    onClick: () => void;
}

export function CostingSheetToggleButton({
    hasCostingSheet,
    onClick
}: CostingSheetToggleButtonProps) {
    return (
        <Button
            variant="secondary"
            size="sm"
            className="flex items-center gap-2"
            onClick={onClick}
        >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {hasCostingSheet ? "Costing Sheet" : "Create Costing"}
            {hasCostingSheet && (
                <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
                    Created
                </span>
            )}
        </Button>
    );
}
