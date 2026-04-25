"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui";

interface AdminPinModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthorized: (pin?: string) => void;
    title?: string;
    description?: string;
}

export function AdminPinModal({
    isOpen,
    onClose,
    onAuthorized,
    title = "Authorization Required",
    description = "This document is from a past period. Enter the admin PIN to proceed with editing.",
}: AdminPinModalProps) {
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [verifying, setVerifying] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setPin("");
            setError("");
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleVerify = async () => {
        if (!pin.trim()) {
            setError("Please enter the PIN");
            return;
        }

        setVerifying(true);
        setError("");

        try {
            const res = await fetch("/api/auth/verify-pin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin: pin.trim() }),
            });

            const data = await res.json();

            if (data.authorized) {
                onAuthorized(pin.trim());
                onClose();
            } else {
                setError("Invalid PIN. Please try again.");
                setPin("");
                inputRef.current?.focus();
            }
        } catch {
            setError("Verification failed. Please try again.");
        } finally {
            setVerifying(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleVerify();
        }
        if (e.key === "Escape") {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 scale-100 animate-in zoom-in-95 duration-200">
                {/* Lock Icon */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-surface-900">{title}</h3>
                    </div>
                </div>

                <p className="text-sm text-surface-500 mb-5">{description}</p>

                {/* PIN Input */}
                <div className="mb-4">
                    <label className="block text-xs font-bold text-surface-600 uppercase tracking-wider mb-2">
                        Admin PIN
                    </label>
                    <input
                        ref={inputRef}
                        type="password"
                        value={pin}
                        onChange={(e) => {
                            setPin(e.target.value);
                            setError("");
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter PIN"
                        maxLength={10}
                        className="w-full px-4 py-3 border border-surface-200 rounded-xl text-center text-lg font-mono tracking-[0.5em] focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                        autoComplete="off"
                    />
                    {error && (
                        <p className="mt-2 text-xs font-medium text-red-600 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={verifying}
                        className="rounded-xl"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleVerify}
                        disabled={verifying || !pin.trim()}
                        loading={verifying}
                        className="rounded-xl px-6 bg-amber-600 hover:bg-amber-700"
                    >
                        Verify
                    </Button>
                </div>
            </div>
        </div>
    );
}
