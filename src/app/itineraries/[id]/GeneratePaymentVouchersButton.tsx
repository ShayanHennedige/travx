"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

interface GeneratePaymentVouchersButtonProps {
    tourId: string;
    hasVouchers: boolean;
    existingCount: number;
}

// Payment voucher generation button component
export function GeneratePaymentVouchersButton({
    tourId,
    hasVouchers,
    existingCount,
}: GeneratePaymentVouchersButtonProps) {
    const router = useRouter();
    const [generating, setGenerating] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!hasVouchers) return;

        setGenerating(true);
        setMessage(null);

        try {
            const response = await fetch("/api/payment-vouchers/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tour_id: tourId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate");
            }

            // Use the message from the API response
            if (data.message) {
                setMessage(data.message);
                if (data.skipped) {
                    setMessage(prev => `${prev}\n${data.skipped}`);
                }
            }

            router.refresh();
        } catch (err: any) {
            console.error("Generation error:", err);
            setMessage(err.message || "Generation failed");
        } finally {
            setGenerating(false);
        }
    };


    if (existingCount > 0) return null;

    if (!hasVouchers) {
        return (
            <Button size="sm" variant="secondary" className="rounded-lg opacity-50 cursor-not-allowed" disabled>
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Generate Vouchers First
            </Button>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            <Button
                size="sm"
                variant="secondary"
                className="rounded-lg"
                onClick={handleGenerate}
                disabled={generating}
            >
                {generating ? (
                    <>
                        <svg className="animate-spin w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating...
                    </>
                ) : (
                    <>
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Generate Payment Vouchers
                    </>
                )}
            </Button>
            {message && (
                <span className="text-[10px] text-surface-500">{message}</span>
            )}
        </div>
    );
}
