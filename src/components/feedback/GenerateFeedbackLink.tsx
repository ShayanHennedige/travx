"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

interface GenerateFeedbackLinkProps {
    tourId: string;
}

export function GenerateFeedbackLink({ tourId }: GenerateFeedbackLinkProps) {
    const [link, setLink] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        setGenerating(true);
        setCopied(false);
        try {
            const response = await fetch("/api/feedback/generate-link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tour_id: tourId }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate link");
            }

            const data = await response.json();
            setLink(data.link);
        } catch (error) {
            console.error("Failed to generate link:", error);
            alert("Failed to generate feedback link. Please try again.");
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = async () => {
        if (link) {
            try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 3000);
            } catch (error) {
                console.error("Failed to copy:", error);
                alert("Failed to copy link to clipboard");
            }
        }
    };

    return (
        <div className="space-y-3">
            <Button
                onClick={handleGenerate}
                disabled={generating}
                size="sm"
                variant="secondary"
                className="w-full sm:w-auto"
            >
                {generating ? (
                    <>
                        <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating...
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Generate Feedback Link
                    </>
                )}
            </Button>

            {link && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3 animate-slide-up">
                    <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-green-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-green-800 mb-2">
                                Feedback link generated successfully!
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-xs bg-white px-3 py-2 rounded border border-green-200 overflow-x-auto whitespace-nowrap">
                                    {link}
                                </code>
                                <Button
                                    onClick={copyToClipboard}
                                    size="sm"
                                    variant={copied ? "primary" : "secondary"}
                                    className="shrink-0"
                                >
                                    {copied ? (
                                        <>
                                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Copy
                                        </>
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-green-700 mt-2">
                                Link expires in 30 days. Send this to your customer via email or WhatsApp.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
