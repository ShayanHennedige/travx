"use client";

import { useState, useEffect } from "react";
import { Button, Input } from "@/components/ui";
import { FormSection, AnimatedSuccessCard } from "@/components/ui/FormSection";
import { useSearchParams } from "next/navigation";
import { mealPlanOptions, currencyOptions, roomCategoryPresets, RatePlan, RoomCategory } from "@/lib/validations/hotel-rates";

interface HotelInfo {
    name: string;
    email: string;
    contact: string;
    address: string;
}

interface RequestInfo {
    id: string;
    request_number: string;
    check_in_date: string;
    check_out_date: string;
    notes: string;
    requested_by: string;
    expires_at: string;
}

const createEmptyRatePlan = (): RatePlan => ({
    meal_plan: "BB",
    valid_from: "",
    valid_to: "",
    currency: "USD",
    sell_mode: "per_room",
    rate_sgl: null,
    rate_dbl: null,
    rate_tpl: null,
    rate_child: null,
    rate_extra_adult: null,
    min_nights: 1,
    remarks: null,
});

const createEmptyRoomCategory = (): RoomCategory => ({
    room_category: "",
    rate_plans: [createEmptyRatePlan()],
});

export default function HotelRatesPage() {
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [hotelInfo, setHotelInfo] = useState<HotelInfo>({
        name: "",
        email: "",
        contact: "",
        address: "",
    });
    const [requestInfo, setRequestInfo] = useState<RequestInfo | null>(null);
    const [roomCategories, setRoomCategories] = useState<RoomCategory[]>([createEmptyRoomCategory()]);

    // Load prefill data (optional)
    useEffect(() => {
        const token = searchParams.get("token");

        // If no token, just stop loading - we allow public access
        if (!token) {
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const response = await fetch(`/api/hotel-rates/prefill?token=${encodeURIComponent(token)}`);

                if (!response.ok) {
                    // If token is invalid, we can still show the form, just without prefill
                    console.warn("Invalid token, loading empty form");
                    setIsLoading(false);
                    return;
                }

                const data = await response.json();
                // setHotelInfo(data.hotel); // Don't prefill hotel info, let them enter it
                setRequestInfo(data.request);

                // Pre-populate date range if available
                if (data.request.check_in_date && data.request.check_out_date) {
                    setRoomCategories([{
                        room_category: "",
                        rate_plans: [{
                            ...createEmptyRatePlan(),
                            valid_from: data.request.check_in_date,
                            valid_to: data.request.check_out_date,
                        }],
                    }]);
                }
            } catch (err: any) {
                console.error("Failed to load prefill data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [searchParams]);

    // Room category handlers
    const addRoomCategory = () => {
        setRoomCategories([...roomCategories, createEmptyRoomCategory()]);
    };

    const removeRoomCategory = (index: number) => {
        if (roomCategories.length > 1) {
            setRoomCategories(roomCategories.filter((_, i) => i !== index));
        }
    };

    const updateRoomCategory = (index: number, field: string, value: string) => {
        const updated = [...roomCategories];
        updated[index] = { ...updated[index], [field]: value };
        setRoomCategories(updated);
    };

    // Rate plan handlers
    const addRatePlan = (categoryIndex: number) => {
        const updated = [...roomCategories];
        const lastPlan = updated[categoryIndex].rate_plans[updated[categoryIndex].rate_plans.length - 1];
        updated[categoryIndex].rate_plans.push({
            ...createEmptyRatePlan(),
            valid_from: lastPlan?.valid_from || "",
            valid_to: lastPlan?.valid_to || "",
            currency: lastPlan?.currency || "USD",
        });
        setRoomCategories(updated);
    };

    const removeRatePlan = (categoryIndex: number, planIndex: number) => {
        const updated = [...roomCategories];
        if (updated[categoryIndex].rate_plans.length > 1) {
            updated[categoryIndex].rate_plans = updated[categoryIndex].rate_plans.filter((_, i) => i !== planIndex);
            setRoomCategories(updated);
        }
    };

    const updateRatePlan = (categoryIndex: number, planIndex: number, field: string, value: any) => {
        const updated = [...roomCategories];
        updated[categoryIndex].rate_plans[planIndex] = {
            ...updated[categoryIndex].rate_plans[planIndex],
            [field]: value,
        };
        setRoomCategories(updated);
    };

    // Submit handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        // Validation
        if (!hotelInfo?.name?.trim()) {
            setError("Please enter the hotel name");
            setIsSubmitting(false);
            return;
        }

        if (!hotelInfo?.email?.trim()) {
            setError("Please enter the hotel email");
            setIsSubmitting(false);
            return;
        }

        // Validate room categories
        for (let i = 0; i < roomCategories.length; i++) {
            const cat = roomCategories[i];
            if (!cat.room_category.trim()) {
                setError(`Please enter a room category name for Room Category ${i + 1}`);
                setIsSubmitting(false);
                return;
            }
            for (let j = 0; j < cat.rate_plans.length; j++) {
                const plan = cat.rate_plans[j];
                if (!plan.valid_from || !plan.valid_to) {
                    setError(`Please enter valid dates for ${cat.room_category} - Rate Plan ${j + 1}`);
                    setIsSubmitting(false);
                    return;
                }
                if (!plan.rate_sgl && !plan.rate_dbl && !plan.rate_tpl) {
                    setError(`Please enter at least one rate for ${cat.room_category} - Rate Plan ${j + 1}`);
                    setIsSubmitting(false);
                    return;
                }
            }
        }

        try {
            const token = searchParams.get("token");
            const response = await fetch("/api/hotel-rates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    hotel_name: hotelInfo?.name,
                    hotel_address: hotelInfo?.address,
                    hotel_contact: hotelInfo?.contact,
                    hotel_email: hotelInfo?.email,
                    room_categories: roomCategories,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to submit rates");
            }

            setSubmitSuccess(true);
        } catch (err: any) {
            setError(err.message || "Failed to submit rates");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Success screen
    if (submitSuccess) {
        return (
            <div className="min-h-screen bg-surface-900 light:bg-surface-100 flex items-center justify-center">
                <AnimatedSuccessCard className="max-w-md w-full card p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-900/50 border border-green-700 flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-surface-100 light:text-surface-900 mb-2">Thank You!</h2>
                    <p className="text-surface-400 light:text-surface-600">Your rates have been submitted successfully. We will review them shortly.</p>
                </AnimatedSuccessCard>
            </div>
        );
    }

    // Error screen
    if (error && !hotelInfo) {
        return (
            <div className="min-h-screen bg-surface-900 light:bg-surface-100 flex items-center justify-center">
                <div className="max-w-md w-full card p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/50 border border-red-700 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-surface-100 light:text-surface-900 mb-2">Error</h2>
                    <p className="text-surface-400 light:text-surface-600">{error}</p>
                </div>
            </div>
        );
    }

    // Loading screen
    if (isLoading) {
        return (
            <div className="min-h-screen bg-surface-900 light:bg-surface-100 flex items-center justify-center">
                <div className="max-w-md w-full card p-8 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 border-4 border-surface-600 border-t-primary-500 rounded-full animate-spin" />
                    <p className="text-surface-400 light:text-surface-600">Loading form...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-900 light:bg-surface-100">
            {/* Header */}
            <header className="bg-surface-800 light:bg-white border-b border-surface-600 light:border-surface-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
                            <span className="text-white font-bold">TX</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-surface-100 light:text-surface-900">TravX</h1>
                            <p className="text-xs text-surface-400 light:text-surface-500">Hotel Rate Submission Form</p>
                        </div>
                    </div>
                    {requestInfo && (
                        <div className="text-right text-sm">
                            <p className="text-surface-400 light:text-surface-500">Request: <span className="font-medium text-surface-100 light:text-surface-900">{requestInfo.request_number}</span></p>
                        </div>
                    )}
                </div>
            </header>

            {/* Form */}
            <main className="max-w-5xl mx-auto px-4 py-8">
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold text-surface-100 light:text-surface-900 mb-2">
                        Submit Your Hotel Rates
                    </h2>
                    <p className="text-surface-400 light:text-surface-600">
                        Please enter your room rates for the requested period.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Request Info Box (if available) */}
                    {requestInfo?.notes && (
                        <div className="p-4 bg-primary-900/30 light:bg-primary-50 border border-primary-700 light:border-primary-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-primary-400 light:text-primary-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-primary-300 light:text-primary-800 mb-1">Request Notes:</p>
                                    <p className="text-sm text-primary-200/90 light:text-primary-700">{requestInfo.notes}</p>
                                    {requestInfo.check_in_date && requestInfo.check_out_date && (
                                        <p className="text-sm text-primary-200/90 light:text-primary-700 mt-2">
                                            <strong>Period:</strong> {new Date(requestInfo.check_in_date).toLocaleDateString()} - {new Date(requestInfo.check_out_date).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Hotel Information - Editable */}
                    <FormSection index={0} className="card p-6">
                        <h3 className="text-lg font-semibold text-surface-100 light:text-surface-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Hotel Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-surface-300 light:text-surface-700 mb-1">
                                    Hotel Name <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="text"
                                    value={hotelInfo?.name || ""}
                                    onChange={(e) => setHotelInfo({ ...hotelInfo!, name: e.target.value })}
                                    placeholder="Enter hotel name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-300 light:text-surface-700 mb-1">
                                    Hotel Email <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="email"
                                    value={hotelInfo?.email || ""}
                                    onChange={(e) => setHotelInfo({ ...hotelInfo!, email: e.target.value })}
                                    placeholder="enter hotel email"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-300 light:text-surface-700 mb-1">
                                    Hotel Contact Number
                                </label>
                                <Input
                                    type="text"
                                    value={hotelInfo?.contact || ""}
                                    onChange={(e) => setHotelInfo({ ...hotelInfo!, contact: e.target.value })}
                                    placeholder="e.g., +94 31 227 9000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-300 light:text-surface-700 mb-1">
                                    Hotel Address
                                </label>
                                <Input
                                    type="text"
                                    value={hotelInfo?.address || ""}
                                    onChange={(e) => setHotelInfo({ ...hotelInfo!, address: e.target.value })}
                                    placeholder="Enter hotel address"
                                />
                            </div>
                        </div>
                    </FormSection>

                    {/* Room Categories */}
                    {roomCategories.map((category, catIndex) => (
                        <FormSection key={catIndex} index={catIndex + 1} className="card p-6 border-l-4 border-l-primary-500">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-surface-100 light:text-surface-900">
                                    Room Category {catIndex + 1}
                                </h3>
                                {roomCategories.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeRoomCategory(catIndex)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        Remove Category
                                    </Button>
                                )}
                            </div>

                            {/* Room Category Name */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-surface-300 light:text-surface-700 mb-1">
                                    Room Category Name <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        type="text"
                                        value={category.room_category}
                                        onChange={(e) => updateRoomCategory(catIndex, "room_category", e.target.value)}
                                        placeholder="e.g., Deluxe Room, Suite"
                                        className="flex-1"
                                    />
                                    <select
                                        className="px-3 py-2 border border-surface-600 light:border-surface-300 rounded-lg text-sm bg-surface-800 light:bg-white text-surface-100 light:text-surface-900"
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                updateRoomCategory(catIndex, "room_category", e.target.value);
                                                e.target.value = "";
                                            }
                                        }}
                                    >
                                        <option value="">Quick Select...</option>
                                        {roomCategoryPresets.map((preset) => (
                                            <option key={preset} value={preset}>{preset}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Rate Plans */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-surface-300 light:text-surface-700 uppercase tracking-wide">Rate Plans</h4>

                                {category.rate_plans.map((plan, planIndex) => (
                                    <div key={planIndex} className="p-4 bg-surface-800 light:bg-surface-50 rounded-lg border border-surface-600 light:border-surface-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm font-medium text-surface-300 light:text-surface-700">Rate Plan {planIndex + 1}</span>
                                            {category.rate_plans.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeRatePlan(catIndex, planIndex)}
                                                    className="text-red-500 hover:text-red-700 text-sm"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                            {/* Meal Plan */}
                                            <div>
                                                <label className="block text-xs text-surface-400 light:text-surface-600 mb-1">Meal Plan</label>
                                                <select
                                                    value={plan.meal_plan}
                                                    onChange={(e) => updateRatePlan(catIndex, planIndex, "meal_plan", e.target.value)}
                                                    className="w-full px-3 py-2 border border-surface-600 light:border-surface-300 rounded-lg text-sm bg-surface-800 light:bg-white text-surface-100 light:text-surface-900"
                                                >
                                                    {mealPlanOptions.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Valid From */}
                                            <div>
                                                <label className="block text-xs text-surface-400 light:text-surface-600 mb-1">Valid From</label>
                                                <Input
                                                    type="date"
                                                    value={plan.valid_from}
                                                    onChange={(e) => updateRatePlan(catIndex, planIndex, "valid_from", e.target.value)}
                                                />
                                            </div>

                                            {/* Valid To */}
                                            <div>
                                                <label className="block text-xs text-surface-400 light:text-surface-600 mb-1">Valid To</label>
                                                <Input
                                                    type="date"
                                                    value={plan.valid_to}
                                                    onChange={(e) => updateRatePlan(catIndex, planIndex, "valid_to", e.target.value)}
                                                />
                                            </div>

                                            {/* Currency */}
                                            <div>
                                                <label className="block text-xs text-surface-400 light:text-surface-600 mb-1">Currency</label>
                                                <select
                                                    value={plan.currency}
                                                    onChange={(e) => updateRatePlan(catIndex, planIndex, "currency", e.target.value)}
                                                    className="w-full px-3 py-2 border border-surface-600 light:border-surface-300 rounded-lg text-sm bg-surface-800 light:bg-white text-surface-100 light:text-surface-900"
                                                >
                                                    {currencyOptions.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>{opt.value}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Rates */}
                                        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                                            <div>
                                                <label className="block text-xs text-surface-400 light:text-surface-600 mb-1">Single (SGL)</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={plan.rate_sgl ?? ""}
                                                    onChange={(e) => updateRatePlan(catIndex, planIndex, "rate_sgl", e.target.value ? parseFloat(e.target.value) : null)}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-surface-400 light:text-surface-600 mb-1">Double (DBL)</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={plan.rate_dbl ?? ""}
                                                    onChange={(e) => updateRatePlan(catIndex, planIndex, "rate_dbl", e.target.value ? parseFloat(e.target.value) : null)}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-surface-400 light:text-surface-600 mb-1">Triple (TPL)</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={plan.rate_tpl ?? ""}
                                                    onChange={(e) => updateRatePlan(catIndex, planIndex, "rate_tpl", e.target.value ? parseFloat(e.target.value) : null)}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-surface-400 light:text-surface-600 mb-1">Child Rate</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={plan.rate_child ?? ""}
                                                    onChange={(e) => updateRatePlan(catIndex, planIndex, "rate_child", e.target.value ? parseFloat(e.target.value) : null)}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-surface-400 light:text-surface-600 mb-1">Extra Adult</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={plan.rate_extra_adult ?? ""}
                                                    onChange={(e) => updateRatePlan(catIndex, planIndex, "rate_extra_adult", e.target.value ? parseFloat(e.target.value) : null)}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => addRatePlan(catIndex)}
                                >
                                    + Add Rate Plan
                                </Button>
                            </div>
                        </FormSection>
                    ))}

                    {/* Add Room Category Button */}
                    <div className="flex justify-center">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={addRoomCategory}
                        >
                            + Add Another Room Category
                        </Button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-900/30 light:bg-red-50 border border-red-700 light:border-red-200 rounded-lg text-red-300 light:text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-center pt-4">
                        <Button
                            type="submit"
                            size="lg"
                            loading={isSubmitting}
                            disabled={isSubmitting}
                            className="min-w-[200px]"
                        >
                            Submit All Rates
                        </Button>
                    </div>
                </form>
            </main>

            {/* Footer */}
                <footer className="border-t border-surface-600 light:border-surface-200 mt-12 py-6">
                <div className="max-w-5xl mx-auto px-4 text-center text-sm text-surface-400 light:text-surface-500">
                    <p>Thank you for partnering with TravX</p>
                </div>
            </footer>
        </div>
    );
}
