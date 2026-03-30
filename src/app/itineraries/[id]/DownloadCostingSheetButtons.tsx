"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

interface DownloadCostingSheetButtonsProps {
    costingSheetId: string;
}

export function DownloadCostingSheetButtons({ costingSheetId }: DownloadCostingSheetButtonsProps) {
    const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
    const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

    const handleDownloadPDF = async () => {
        setIsDownloadingPDF(true);
        try {
            const response = await fetch(`/api/costing-sheet/${costingSheetId}/pdf`);
            if (!response.ok) throw new Error("Failed to generate PDF");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `costing-sheet-${costingSheetId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error downloading PDF:", error);
            alert("Failed to download PDF");
        } finally {
            setIsDownloadingPDF(false);
        }
    };

    const handleDownloadExcel = async () => {
        setIsDownloadingExcel(true);
        try {
            const response = await fetch(`/api/costing-sheet/${costingSheetId}/excel`);
            if (!response.ok) throw new Error("Failed to generate Excel");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `costing-sheet-${costingSheetId}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error downloading Excel:", error);
            alert("Failed to download Excel");
        } finally {
            setIsDownloadingExcel(false);
        }
    };

    return (
        <div className="flex gap-2">
            <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadPDF}
                loading={isDownloadingPDF}
                disabled={isDownloadingPDF || isDownloadingExcel}
                className="flex items-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
            </Button>
            <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadExcel}
                loading={isDownloadingExcel}
                disabled={isDownloadingPDF || isDownloadingExcel}
                className="flex items-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel
            </Button>
        </div>
    );
}
