"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import type { CostingSheet, AccommodationRow, TransportRow, ExtrasRow } from "@/lib/validations/costingSheet";

interface CostingSheetFormProps {
    itineraryId: string;
    initialData?: CostingSheet & { id?: string };
    itineraryDays?: Array<{
        day: number;
        date: string;
        overnight_location: string;
        hotel_suggestion: string;
    }>;
    noOfNights?: number;
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
    onSaveSuccess?: () => void;
}

export function CostingSheetForm({
    itineraryId,
    initialData,
    itineraryDays = [],
    noOfNights = 0,
    totalDistance = 0,
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
    roomCategory,
    onSaveSuccess
}: CostingSheetFormProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<CostingSheet>>({
        itinerary_id: itineraryId,
        agent_name: initialData?.agent_name || agentName || "",
        client_name: initialData?.client_name || clientName || "",
        passport_no: (initialData as any)?.passport_no || passportNo || "",
        country: (initialData as any)?.country || country || "",
        agent_company: initialData?.agent_company || agentCompany || "",
        arrival_date: initialData?.arrival_date || (() => {
            if (!arrivalDate) return "";
            const d = new Date(arrivalDate);
            return isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
        })(),
        no_of_pax: initialData?.no_of_pax || noOfPax || 2,
        hotel_type: initialData?.hotel_type || hotelType || "",
        meal_plan: initialData?.meal_plan || mealPlan || "BB",
        quote_date: initialData?.quote_date || new Date().toISOString().split("T")[0],
        accommodation_data: initialData?.accommodation_data || [],
        transport_data: initialData?.transport_data || [],
        extras_data: initialData?.extras_data || [],
        meal_extras: initialData?.meal_extras || { ex_lunch: 0, ex_dinner: 0, ex_breakfast: 0 },
        exchange_rate: initialData?.exchange_rate || 0,
        total_lkr: initialData?.total_lkr || 0,
        total_usd: initialData?.total_usd || 0,
        per_person_usd: initialData?.per_person_usd || 0,
        status: initialData?.status || "draft",
        profit_percentage: initialData?.profit_percentage || 15,
    });

    // Sync form data when initialData or itineraryId changes (important for late-loading data or component reuse)
    useEffect(() => {
        setFormData({
            itinerary_id: itineraryId,
            agent_name: initialData?.agent_name || agentName || "",
            client_name: initialData?.client_name || clientName || "",
            passport_no: (initialData as any)?.passport_no || passportNo || "",
            country: (initialData as any)?.country || country || "",
            agent_company: initialData?.agent_company || agentCompany || "",
            arrival_date: initialData?.arrival_date || (() => {
                if (!arrivalDate) return "";
                const d = new Date(arrivalDate);
                return isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
            })(),
            no_of_pax: initialData?.no_of_pax || noOfPax || 2,
            hotel_type: initialData?.hotel_type || hotelType || "",
            meal_plan: initialData?.meal_plan || mealPlan || "BB",
            quote_date: initialData?.quote_date || new Date().toISOString().split("T")[0],
            accommodation_data: initialData?.accommodation_data || [],
            transport_data: initialData?.transport_data || [],
            extras_data: initialData?.extras_data || [],
            meal_extras: initialData?.meal_extras || { ex_lunch: 0, ex_dinner: 0, ex_breakfast: 0 },
            exchange_rate: initialData?.exchange_rate || 0,
            total_lkr: initialData?.total_lkr || 0,
            total_usd: initialData?.total_usd || 0,
            per_person_usd: initialData?.per_person_usd || 0,
            status: initialData?.status || "draft",
            profit_percentage: initialData?.profit_percentage || 15,
        });
    }, [initialData?.id, itineraryId]);


    // Pre-populate accommodation from itinerary
    useEffect(() => {
        if (initialData || itineraryDays.length === 0) return;

        const hasAccomData = formData.accommodation_data && formData.accommodation_data.length > 0;

        // If we don't have data, or if we have it but roomCategory changed, we re-sync
        if (!hasAccomData || roomCategory) {
            const accomData = itineraryDays.slice(0, -1).map((day) => {
                let formattedDay = `Day ${day.day}`;
                if (day.date) {
                    const d = new Date(day.date);
                    if (!isNaN(d.getTime())) {
                        formattedDay = format(d, "MMM d (EEE)");
                    }
                }

                // Find existing row to preserve prices
                const existingRow = formData.accommodation_data?.find(r => r.day === formattedDay);

                return {
                    day: formattedDay,
                    location: day.overnight_location || "",
                    hotel: (day.hotel_suggestion || "").replace(/\s*\(?\d+\s*Star\)?/gi, "").trim(),
                    room_category: roomCategory || existingRow?.room_category || "Standard",
                    basis: formData.meal_plan || existingRow?.basis || "BB",
                    sgl: existingRow?.sgl || 0,
                    dbl: existingRow?.dbl || 0,
                    tri: existingRow?.tri || 0,
                    quad: existingRow?.quad || 0,
                    quad_triple: existingRow?.quad_triple || 0,
                };
            });

            const newDataStr = JSON.stringify(accomData);
            const currentDataStr = JSON.stringify(formData.accommodation_data);

            if (newDataStr !== currentDataStr) {
                setFormData(prev => ({ ...prev, accommodation_data: accomData }));
            }
        }
    }, [initialData, itineraryDays.length, roomCategory, formData.meal_plan]);

    // Synchronize other metadata props for new costing sheets
    useEffect(() => {
        if (initialData) return;

        setFormData(prev => ({
            ...prev,
            no_of_pax: noOfPax ?? prev.no_of_pax,
            hotel_type: hotelType ?? prev.hotel_type,
            agent_name: agentName ?? prev.agent_name,
            agent_company: agentCompany ?? prev.agent_company,
            client_name: clientName ?? prev.client_name,
            passport_no: passportNo ?? prev.passport_no,
            country: country ?? prev.country,
        }));
    }, [
        initialData,
        noOfPax,
        hotelType,
        agentName,
        agentCompany,
        clientName,
        passportNo,
        country
    ]);

    // Auto-populate transport with default rows
    useEffect(() => {
        if (!initialData && formData.transport_data?.length === 0 && noOfNights > 0) {
            // Parse total distance
            const mileage = typeof totalDistance === "string"
                ? parseFloat(totalDistance.replace(/[^0-9.]/g, ""))
                : totalDistance;

            const transportRows = [
                { description: "Transport", mileage: mileage || 0, rate: 100, total: (mileage || 0) * 100 },
                { description: "Additional KM", mileage: 0, rate: 100, total: 0 },
                { description: "Batta", mileage: noOfNights, rate: 3000, total: noOfNights * 3000 },
                { description: "Paging", mileage: 1, rate: 5000, total: 5000 },
                { description: "Guide Acc", mileage: 0, rate: 0, total: 0 },
                { description: "Gude Fee", mileage: 0, rate: 0, total: 0 },
            ];
            setFormData(prev => ({ ...prev, transport_data: transportRows }));
        }
    }, [noOfNights, initialData, totalDistance]);

    const calculateTotals = () => {
        // Accommodation in USD (Summing SGL + DBL + TRI + QUAD + QUAD_TRIPLE)
        const accomTotalUSD = (formData.accommodation_data || []).reduce((sum, row) => sum + (row.sgl || 0) + (row.dbl || 0) + (row.tri || 0) + (row.quad || 0) + (row.quad_triple || 0), 0);

        // Transport in LKR
        const transportTotalLKR = (formData.transport_data || []).reduce((sum, row) => sum + (row.total || 0), 0);
        const transportTotalUSD = transportTotalLKR / (formData.exchange_rate || 1);

        // Extras in USD
        const extrasTotalUSD = (formData.extras_data || []).reduce((sum, row) => sum + ((row.count || 0) * (row.unit_price || 0)), 0);
        const mealTotalUSD = (formData.meal_extras?.ex_lunch || 0) + (formData.meal_extras?.ex_dinner || 0) + (formData.meal_extras?.ex_breakfast || 0);

        const totalUsdBeforeProfit = accomTotalUSD + transportTotalUSD + extrasTotalUSD + mealTotalUSD;
        const profitAmountUSD = totalUsdBeforeProfit * ((formData.profit_percentage || 0) / 100);
        const totalUsd = totalUsdBeforeProfit + profitAmountUSD;

        const perPersonUsd = totalUsd / (formData.no_of_pax || 1);
        const totalLkr = transportTotalLKR + (accomTotalUSD * (formData.exchange_rate || 1));

        setFormData(prev => ({
            ...prev,
            total_lkr: totalLkr,
            total_usd: totalUsd,
            per_person_usd: perPersonUsd,
        }));
    };

    useEffect(() => {
        calculateTotals();
    }, [
        formData.accommodation_data,
        formData.transport_data,
        formData.extras_data,
        formData.meal_extras,
        formData.exchange_rate,
        formData.no_of_pax,
        formData.profit_percentage,
    ]);

    const addAccommodationRow = () => {
        setFormData(prev => ({
            ...prev,
            accommodation_data: [
                ...(prev.accommodation_data || []),
                {
                    day: "",
                    location: "",
                    hotel: "",
                    room_category: roomCategory || "Standard",
                    basis: prev.meal_plan || "BB",
                    sgl: 0,
                    dbl: 0,
                    tri: 0,
                    quad: 0,
                    quad_triple: 0
                },
            ],
        }));
    };

    const updateAccommodationRow = (index: number, field: keyof AccommodationRow, value: any) => {
        setFormData(prev => ({
            ...prev,
            accommodation_data: prev.accommodation_data?.map((row, i) =>
                i === index ? { ...row, [field]: value } : row
            ),
        }));
    };

    const removeAccommodationRow = (index: number) => {
        setFormData(prev => ({
            ...prev,
            accommodation_data: prev.accommodation_data?.filter((_, i) => i !== index),
        }));
    };

    const addTransportRow = () => {
        setFormData(prev => ({
            ...prev,
            transport_data: [
                ...(prev.transport_data || []),
                { description: "", mileage: 0, rate: 100, total: 0 },
            ],
        }));
    };

    const updateTransportRow = (index: number, field: keyof TransportRow, value: any) => {
        setFormData(prev => {
            const newData = prev.transport_data?.map((row, i) => {
                if (i === index) {
                    const updated = { ...row, [field]: value };
                    // Auto-calculate total
                    if (field === "mileage" || field === "rate") {
                        updated.total = (updated.mileage || 0) * (updated.rate || 0);
                    }
                    return updated;
                }
                return row;
            });
            return { ...prev, transport_data: newData };
        });
    };

    const removeTransportRow = (index: number) => {
        setFormData(prev => ({
            ...prev,
            transport_data: prev.transport_data?.filter((_, i) => i !== index),
        }));
    };

    const addExtrasRow = () => {
        setFormData(prev => ({
            ...prev,
            extras_data: [
                ...(prev.extras_data || []),
                { name: "", description: "", count: 0, unit_price: 0 },
            ],
        }));
    };

    const updateExtrasRow = (index: number, field: keyof ExtrasRow, value: any) => {
        setFormData(prev => ({
            ...prev,
            extras_data: prev.extras_data?.map((row, i) =>
                i === index ? { ...row, [field]: value } : row
            ),
        }));
    };

    const removeExtrasRow = (index: number) => {
        setFormData(prev => ({
            ...prev,
            extras_data: prev.extras_data?.filter((_, i) => i !== index),
        }));
    };

    const handleSave = async (status: "draft" | "finalized") => {
        setIsSaving(true);
        try {
            const dataToSave = { ...formData, status };

            const url = "/api/costing-sheet";
            const method = initialData?.id ? "PUT" : "POST";
            const body = initialData?.id ? { id: initialData.id, ...dataToSave } : dataToSave;

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to save costing sheet");
            }

            router.refresh();
            alert(`Costing sheet ${status === "draft" ? "saved as draft" : "finalized"} successfully!`);
            onSaveSuccess?.();
        } catch (error: any) {
            console.error("Error saving costing sheet:", error);
            alert(error.message || "Failed to save costing sheet");
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate total mileage for transport
    const totalMileage = (formData.transport_data || [])
        .filter(row => row.description === "Transport" || row.description === "Additional KM")
        .reduce((sum, row) => sum + (row.mileage || 0), 0);

    // Calculate Accommodation Summary from Itinerary Days
    const accommodationSummary = (() => {
        const summary = new Map<string, { nights: number; location: string }>();
        itineraryDays.slice(0, -1).forEach(day => {
            if (day.hotel_suggestion) {
                const key = day.hotel_suggestion.replace(/\s*\(?\d+\s*Star\)?/gi, "").trim();
                const current = summary.get(key) || { nights: 0, location: day.overnight_location };
                summary.set(key, { ...current, nights: current.nights + 1 });
            }
        });
        return Array.from(summary.entries());
    })();

    return (
        <div className="card p-6 space-y-6">
            <style jsx global>{`
                input::-webkit-outer-spin-button,
                input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                input[type=number] {
                    -moz-appearance: textfield;
                }
            `}</style>
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-surface-900">Tour Costing Sheet</h3>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => handleSave("draft")}
                        loading={isSaving}
                        disabled={isSaving}
                    >
                        Save Draft
                    </Button>
                    <Button
                        onClick={() => handleSave("finalized")}
                        loading={isSaving}
                        disabled={isSaving}
                        className="bg-accent-600 hover:bg-accent-700"
                    >
                        Finalize
                    </Button>
                </div>
            </div>

            {/* Metadata Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-surface-50 rounded-lg">
                <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">Agent Name</label>
                    <input
                        type="text"
                        value={formData.agent_name || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, agent_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">Client Name</label>
                    <input
                        type="text"
                        value={formData.client_name || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm font-semibold"
                        placeholder="Enter guest name"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">Passport No</label>
                    <input
                        type="text"
                        value={formData.passport_no || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, passport_no: e.target.value }))}
                        className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm font-mono tracking-tighter"
                        placeholder="Enter passport number"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">Rooms (Requirement)</label>
                    <div className="w-full px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg text-sm font-bold text-primary-700">
                        {(() => {
                            const reqs = [
                                roomsDbl && roomsDbl > 0 ? `${roomsDbl} DBL` : null,
                                roomsSgl && roomsSgl > 0 ? `${roomsSgl} SGL` : null,
                                roomsTpl && roomsTpl > 0 ? `${roomsTpl} TPL` : null,
                                roomsQtpl && roomsQtpl > 0 ? `${roomsQtpl} QUAD` : null,
                            ].filter(Boolean);
                            return reqs.length > 0 ? reqs.join(", ") : "Not specified";
                        })()}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">Agent Company</label>
                    <input
                        type="text"
                        value={formData.agent_company || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, agent_company: e.target.value }))}
                        className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">Country</label>
                    <input
                        type="text"
                        value={formData.country || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
                        placeholder="Enter country"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">Vehicle Type</label>
                    <select
                        value={formData.vehicle_type || "Car"}
                        onChange={(e) => {
                            const selectedType = e.target.value;
                            const rates: Record<string, number> = {
                                "Car": 100,
                                "Van": 130,
                                "Mini Coach": 175,
                                "30 Seater Coach": 250,
                                "Large Coach": 350
                            };
                            const newRate = rates[selectedType] || 130;
                            // Update transport data first row with new rate
                            const updatedTransportData = (formData.transport_data || []).map((row, idx) => {
                                if (idx === 0 && row.description === "Transport") {
                                    return { ...row, rate: newRate, total: (row.mileage || 0) * newRate };
                                }
                                if (idx === 1 && row.description === "Additional KM") {
                                    return { ...row, rate: newRate, total: (row.mileage || 0) * newRate };
                                }
                                return row;
                            });
                            setFormData(prev => ({
                                ...prev,
                                vehicle_type: selectedType as any,
                                vehicle_rate: newRate,
                                transport_data: updatedTransportData
                            }));
                        }}
                        className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
                    >
                        <option value="Car">Car</option>
                        <option value="Van">Van</option>
                        <option value="Mini Coach">Mini Coach</option>
                        <option value="30 Seater Coach">30 Seater Coach</option>
                        <option value="Large Coach">Large Coach</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">Vehicle Rate (LKR/km)</label>
                    <input
                        type="number"
                        value={formData.vehicle_rate || 130}
                        onChange={(e) => setFormData(prev => ({ ...prev, vehicle_rate: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
                        placeholder="e.g. 130"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">Currency</label>
                    <select
                        value={formData.currency || "USD"}
                        onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
                    >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="LKR">LKR</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">Travel Period</label>
                    <DatePicker
                        selectsRange={true}
                        startDate={formData.period_start ? new Date(formData.period_start) : (formData.arrival_date ? new Date(formData.arrival_date) : null)}
                        endDate={formData.period_end ? new Date(formData.period_end) : (formData.arrival_date ? addDays(new Date(formData.arrival_date), noOfNights) : null)}
                        onChange={(update: [Date | null, Date | null]) => {
                            const [start, end] = update;
                            const periodDesc = start && end
                                ? `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
                                : '';
                            setFormData(prev => ({
                                ...prev,
                                period_start: start ? format(start, 'yyyy-MM-dd') : undefined,
                                period_end: end ? format(end, 'yyyy-MM-dd') : undefined,
                                period_description: periodDesc
                            }));
                        }}
                        className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
                        placeholderText="Select date range"
                        dateFormat="MMM d, yyyy"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">Arrival Date</label>
                    <input
                        type="date"
                        value={formData.arrival_date || ""}
                        readOnly
                        className="w-full px-3 py-2 bg-surface-50 border border-surface-300 rounded-lg text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">No. of Pax</label>
                    <input
                        type="number"
                        value={formData.no_of_pax || 2}
                        readOnly
                        className="w-full px-3 py-2 bg-surface-50 border border-surface-300 rounded-lg text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">Hotel Type</label>
                    <input
                        type="text"
                        value={formData.hotel_type || ""}
                        readOnly
                        className="w-full px-3 py-2 bg-surface-50 border border-surface-300 rounded-lg text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">Meal Plan</label>
                    <input
                        type="text"
                        value={formData.meal_plan || ""}
                        onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({
                                ...prev,
                                meal_plan: val,
                                accommodation_data: prev.accommodation_data?.map(row => ({
                                    ...row,
                                    basis: val
                                }))
                            }));
                        }}
                        className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
                        placeholder="BB, HB, FB"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">Exchange Rate (USD to LKR)</label>
                    <input
                        type="number"
                        value={formData.exchange_rate || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, exchange_rate: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
                        placeholder="e.g. 300"
                        step="0.01"
                    />
                </div>
            </div>

            {/* Accommodation Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-surface-900">Accommodation</h4>
                    <Button variant="secondary" size="sm" onClick={addAccommodationRow}>
                        + Add Row
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-pink-50">
                                <th className="px-2 py-2 text-left text-xs font-medium text-surface-700">Day</th>
                                <th className="px-2 py-2 text-left text-xs font-medium text-surface-700">Location</th>
                                <th className="px-2 py-2 text-left text-xs font-medium text-surface-700">Hotel</th>
                                <th className="px-2 py-2 text-left text-xs font-medium text-surface-700">Room</th>
                                <th className="px-2 py-2 text-left text-xs font-medium text-surface-700">Basis</th>
                                {(roomsSgl ?? 0) > 0 && <th className="px-2 py-2 text-right text-xs font-medium text-surface-700">SGL (USD)</th>}
                                {(roomsDbl ?? 0) > 0 && <th className="px-2 py-2 text-right text-xs font-medium text-surface-700">DBL (USD)</th>}
                                {(roomsTpl ?? 0) > 0 && <th className="px-2 py-2 text-right text-xs font-medium text-surface-700">TRI (USD)</th>}
                                {(roomsQtpl ?? 0) > 0 && <th className="px-2 py-2 text-right text-xs font-medium text-surface-700">QUAD (USD)</th>}
                                <th className="px-2 py-2 text-right text-xs font-medium text-surface-700">LKR</th>
                                <th className="px-2 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {(formData.accommodation_data || []).map((row, index) => (
                                <tr key={index} className="border-b border-surface-200">
                                    <td className="px-2 py-2">
                                        <input
                                            type="text"
                                            value={row.day}
                                            readOnly
                                            className="w-full px-2 py-1 bg-surface-50 border border-surface-300 rounded text-xs"
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <input
                                            type="text"
                                            value={row.location}
                                            readOnly
                                            className="w-full px-2 py-1 bg-surface-50 border border-surface-300 rounded text-xs"
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <input
                                            type="text"
                                            value={row.hotel}
                                            onChange={(e) => updateAccommodationRow(index, "hotel", e.target.value)}
                                            className="w-full px-2 py-1 border border-surface-300 rounded text-xs"
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <input
                                            type="text"
                                            value={row.room_category || "Standard"}
                                            onChange={(e) => updateAccommodationRow(index, "room_category", e.target.value)}
                                            className="w-full px-2 py-1 border border-surface-300 rounded text-xs"
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <input
                                            type="text"
                                            value={row.basis}
                                            onChange={(e) => updateAccommodationRow(index, "basis", e.target.value)}
                                            className="w-16 px-2 py-1 border border-surface-300 rounded text-xs"
                                        />
                                    </td>
                                    {(roomsSgl ?? 0) > 0 && (
                                        <td className="px-2 py-2">
                                            <input
                                                type="number"
                                                value={row.sgl || 0}
                                                onFocus={(e) => e.target.value === "0" && (e.target.value = "")}
                                                onBlur={(e) => e.target.value === "" && (e.target.value = "0")}
                                                onChange={(e) => updateAccommodationRow(index, "sgl", parseFloat(e.target.value) || 0)}
                                                className="w-20 px-2 py-1 border border-surface-300 rounded text-xs text-right"
                                            />
                                        </td>
                                    )}
                                    {(roomsDbl ?? 0) > 0 && (
                                        <td className="px-2 py-2">
                                            <input
                                                type="number"
                                                value={row.dbl || 0}
                                                onFocus={(e) => e.target.value === "0" && (e.target.value = "")}
                                                onBlur={(e) => e.target.value === "" && (e.target.value = "0")}
                                                onChange={(e) => updateAccommodationRow(index, "dbl", parseFloat(e.target.value) || 0)}
                                                className="w-20 px-2 py-1 border border-surface-300 rounded text-xs text-right"
                                            />
                                        </td>
                                    )}
                                    {(roomsTpl ?? 0) > 0 && (
                                        <td className="px-2 py-2">
                                            <input
                                                type="number"
                                                value={row.tri || 0}
                                                onFocus={(e) => e.target.value === "0" && (e.target.value = "")}
                                                onBlur={(e) => e.target.value === "" && (e.target.value = "0")}
                                                onChange={(e) => updateAccommodationRow(index, "tri", parseFloat(e.target.value) || 0)}
                                                className="w-20 px-2 py-1 border border-surface-300 rounded text-xs text-right"
                                            />
                                        </td>
                                    )}
                                    {(roomsQtpl ?? 0) > 0 && (
                                        <td className="px-2 py-2">
                                            <input
                                                type="number"
                                                value={row.quad || 0}
                                                onFocus={(e) => e.target.value === "0" && (e.target.value = "")}
                                                onBlur={(e) => e.target.value === "" && (e.target.value = "0")}
                                                onChange={(e) => updateAccommodationRow(index, "quad", parseFloat(e.target.value) || 0)}
                                                className="w-20 px-2 py-1 border border-surface-300 rounded text-xs text-right"
                                            />
                                        </td>
                                    )}
                                    <td className="px-2 py-2">
                                        <input
                                            type="number"
                                            value={((
                                                ((roomsSgl ?? 0) > 0 ? (row.sgl || 0) : 0) +
                                                ((roomsDbl ?? 0) > 0 ? (row.dbl || 0) : 0) +
                                                ((roomsTpl ?? 0) > 0 ? (row.tri || 0) : 0) +
                                                ((roomsQtpl ?? 0) > 0 ? (row.quad || 0) : 0)
                                            ) * (formData.exchange_rate || 0)).toFixed(0)}
                                            readOnly
                                            className="w-24 px-2 py-1 bg-surface-100 border border-surface-300 rounded text-xs text-right"
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <button
                                            onClick={() => removeAccommodationRow(index)}
                                            className="text-accent-500 hover:text-accent-700 text-xs"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Transport Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-surface-900">Transport</h4>
                    <div className="text-xs text-surface-600">
                        Total Mileage: <span className="font-semibold">{totalMileage} km</span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={addTransportRow}>
                        + Add Row
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-pink-50">
                                <th className="px-2 py-2 text-left text-xs font-medium text-surface-700">Des.</th>
                                <th className="px-2 py-2 text-right text-xs font-medium text-surface-700">Mileage</th>
                                <th className="px-2 py-2 text-right text-xs font-medium text-surface-700">Rate (LKR)</th>
                                <th className="px-2 py-2 text-right text-xs font-medium text-surface-700">Total (LKR)</th>
                                <th className="px-2 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {(formData.transport_data || []).map((row, index) => (
                                <tr key={index} className="border-b border-surface-200">
                                    <td className="px-2 py-2">
                                        <input
                                            type="text"
                                            value={row.description}
                                            onChange={(e) => updateTransportRow(index, "description", e.target.value)}
                                            readOnly={index < 5}
                                            className={`w-full px-2 py-1 border border-surface-300 rounded text-xs ${index < 5 ? "bg-surface-50" : ""}`}
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <input
                                            type="number"
                                            value={row.mileage || 0}
                                            onFocus={(e) => e.target.value === "0" && (e.target.value = "")}
                                            onBlur={(e) => e.target.value === "" && (e.target.value = "0")}
                                            onChange={(e) => updateTransportRow(index, "mileage", parseFloat(e.target.value) || 0)}
                                            readOnly={index === 0 || (index > 1 && index < 6)}
                                            className={`w-24 px-2 py-1 border border-surface-300 rounded text-xs text-right ${(index === 0 || (index > 1 && index < 6)) ? "bg-surface-50" : ""}`}
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <input
                                            type="number"
                                            value={row.rate || 0}
                                            onFocus={(e) => e.target.value === "0" && (e.target.value = "")}
                                            onBlur={(e) => e.target.value === "" && (e.target.value = "0")}
                                            onChange={(e) => updateTransportRow(index, "rate", parseFloat(e.target.value) || 0)}
                                            className="w-24 px-2 py-1 border border-surface-300 rounded text-xs text-right"
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <input
                                            type="number"
                                            value={row.total || 0}
                                            readOnly
                                            className="w-28 px-2 py-1 bg-surface-100 border border-surface-300 rounded text-xs text-right font-semibold"
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <button
                                            onClick={() => removeTransportRow(index)}
                                            className="text-accent-500 hover:text-accent-700 text-xs"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-green-100 font-semibold">
                                <td className="px-2 py-2 text-xs">Total</td>
                                <td className="px-2 py-2"></td>
                                <td className="px-2 py-2"></td>
                                <td className="px-2 py-2 text-right text-sm">
                                    {(formData.transport_data || []).reduce((sum, row) => sum + (row.total || 0), 0).toFixed(0)}
                                </td>
                                <td className="px-2 py-2"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Extras Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-surface-900">Extras</h4>
                    <Button variant="secondary" size="sm" onClick={addExtrasRow}>
                        + Add Row
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-pink-50">
                                <th className="px-2 py-2 text-left text-xs font-medium text-surface-700">Name</th>
                                <th className="px-2 py-2 text-left text-xs font-medium text-surface-700">Description</th>
                                <th className="px-2 py-2 text-right text-xs font-medium text-surface-700">Count</th>
                                <th className="px-2 py-2 text-right text-xs font-medium text-surface-700">Unit Price (USD)</th>
                                <th className="px-2 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {(formData.extras_data || []).map((row, index) => (
                                <tr key={index} className="border-b border-surface-200">
                                    <td className="px-2 py-2">
                                        <input
                                            type="text"
                                            value={row.name}
                                            onChange={(e) => updateExtrasRow(index, "name", e.target.value)}
                                            className="w-full px-2 py-1 border border-surface-300 rounded text-xs"
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <input
                                            type="text"
                                            value={row.description}
                                            onChange={(e) => updateExtrasRow(index, "description", e.target.value)}
                                            className="w-full px-2 py-1 border border-surface-300 rounded text-xs"
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <input
                                            type="number"
                                            value={row.count || 0}
                                            onFocus={(e) => e.target.value === "0" && (e.target.value = "")}
                                            onBlur={(e) => e.target.value === "" && (e.target.value = "0")}
                                            onChange={(e) => updateExtrasRow(index, "count", parseInt(e.target.value) || 0)}
                                            className="w-20 px-2 py-1 border border-surface-300 rounded text-xs text-right"
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <input
                                            type="number"
                                            value={row.unit_price || 0}
                                            onFocus={(e) => e.target.value === "0" && (e.target.value = "")}
                                            onBlur={(e) => e.target.value === "" && (e.target.value = "0")}
                                            onChange={(e) => updateExtrasRow(index, "unit_price", parseFloat(e.target.value) || 0)}
                                            className="w-24 px-2 py-1 border border-surface-300 rounded text-xs text-right"
                                            step="0.01"
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <button
                                            onClick={() => removeExtrasRow(index)}
                                            className="text-accent-500 hover:text-accent-700 text-xs"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Meal Extras */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-surface-700 mb-1">EX. Lunch (USD)</label>
                        <input
                            type="number"
                            value={formData.meal_extras?.ex_lunch || 0}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                meal_extras: { ...prev.meal_extras!, ex_lunch: parseFloat(e.target.value) || 0 }
                            }))}
                            className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
                            step="0.01"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-surface-700 mb-1">EX. Dinner (USD)</label>
                        <input
                            type="number"
                            value={formData.meal_extras?.ex_dinner || 0}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                meal_extras: { ...prev.meal_extras!, ex_dinner: parseFloat(e.target.value) || 0 }
                            }))}
                            className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
                            step="0.01"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-surface-700 mb-1">EX. Breakfast (USD)</label>
                        <input
                            type="number"
                            value={formData.meal_extras?.ex_breakfast || 0}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                meal_extras: { ...prev.meal_extras!, ex_breakfast: parseFloat(e.target.value) || 0 }
                            }))}
                            className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
                            step="0.01"
                        />
                    </div>
                </div>
            </div>

            {/* Totals & Profit Section */}
            <div className="bg-primary-50 p-6 rounded-lg space-y-4">
                <div className="flex items-center justify-between border-b border-primary-100 pb-4">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-bold text-surface-700">Profit Percentage (%)</label>
                        <input
                            type="number"
                            value={formData.profit_percentage === 0 ? '' : formData.profit_percentage}
                            onChange={(e) => setFormData(prev => ({ ...prev, profit_percentage: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
                            onBlur={(e) => e.target.value === '' && setFormData(prev => ({ ...prev, profit_percentage: 0 }))}
                            placeholder="0"
                            className="w-24 px-3 py-2 border border-primary-200 rounded-lg text-sm font-bold text-primary-700"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="font-medium text-surface-700">Total Costs LKR:</span>
                        <span className="font-semibold text-surface-900">Rs. {formData.total_lkr?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="font-medium text-surface-700">Per Person USD:</span>
                        <span className="font-semibold text-surface-900">${formData.per_person_usd?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between text-base pt-2 border-t border-primary-200">
                        <span className="font-bold text-surface-900">Total Quoted USD:</span>
                        <span className="font-bold text-primary-700 text-xl">${formData.total_usd?.toFixed(2) || "0.00"}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
