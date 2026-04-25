"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui";

interface LogSheetDay {
    day: number;
    date: string;
    route: string;
    estimatedKm: number;
    actualKm: number;
}

interface TourData {
    guestName: string;
    travelAgent: string;
    driverName: string;
    paxInfo: string;
    driverVehicle: string;
    arrivalDate: string;
    departureDate: string;
    arrivalFlight: string;
    departureFlight: string;
}

interface Limits {
    totalMileageLimit: number;
    battaLimit: number;
    parkingLimit: number;
    pagingLimit: number;
    highwayLimit: number;
    mileageRate: number;
    baseTransportCost: number;
}

interface LogSheetViewProps {
    tourId: string;
    tourName: string;
    isOpen: boolean;
    onClose: () => void;
    onFinalized?: () => void;
}

export function LogSheetView({ tourId, tourName, isOpen, onClose, onFinalized }: LogSheetViewProps) {
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState<LogSheetDay[]>([]);
    const [tourInfo, setTourInfo] = useState<TourData | null>(null);
    const [limits, setLimits] = useState<Limits | null>(null);
    const [company, setCompany] = useState<any>(null);
    
    const [costs, setCosts] = useState({
        paging: 0,
        highway: 0,
        batta: 0,
        tickets: 0,
        other: 0,
    });
    
    const [actualExcessRate, setActualExcessRate] = useState<number | null>(null);
    const [totalActualKmOverride, setTotalActualKmOverride] = useState<number | null>(null);
    const [editableLimits, setEditableLimits] = useState({
        totalMileageLimit: 0,
        baseTransportCost: 0,
        pagingLimit: 0,
        highwayLimit: 0,
        battaLimit: 0,
    });
    
    const [tourAdvance, setTourAdvance] = useState<number>(0);

    const [finalizing, setFinalizing] = useState(false);
    const [isFinalized, setIsFinalized] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        if (isOpen && tourId) {
            fetchLogSheetData();
        }
    }, [isOpen, tourId]);

    const fetchLogSheetData = async () => {
        setLoading(true);
        try {
            // Fetch finalized status
            const statusRes = await fetch(`/api/tours/${tourId}`);
            
            // Handle session expiration redirect
            if (statusRes.redirected || statusRes.url.includes('/login')) {
                alert("Your session has expired. Redirecting to login page...");
                window.location.href = '/login';
                return;
            }

            if (!statusRes.ok) {
                const text = await statusRes.text();
                throw new Error(`API error: ${statusRes.status} - ${text.substring(0, 100)}`);
            }
            const statusData = await statusRes.json();
            const isTourFinalized = statusData.tour?.log_sheet_finalized;
            const savedData = statusData.tour?.log_sheet_data;

            // Always fetch the generated format=json to get fresh limits and company info
            const jsonRes = await fetch(`/api/driver-log-sheet/${tourId}?format=json`);
            if (!jsonRes.ok) throw new Error("Failed to fetch structured json");
            const data = await jsonRes.json();

            setCompany(data.company);
            setTourInfo(data.tour);
            setLimits(data.limits);

            if (savedData && Object.keys(savedData).length > 0) {
                // Restore saved actuals
                setDays(savedData.days || data.days);
                setCosts({
                    paging: savedData.costs?.paging || 0,
                    highway: savedData.costs?.highway || 0,
                    batta: savedData.costs?.batta || 0,
                    tickets: savedData.costs?.tickets || 0,
                    other: savedData.costs?.other || 0,
                });
                setActualExcessRate(savedData.actualExcessRate ?? null);
                setTotalActualKmOverride(savedData.totalActualKmOverride ?? null);
                setEditableLimits(savedData.editableLimits || {
                    totalMileageLimit: data.limits?.totalMileageLimit || 0,
                    baseTransportCost: data.limits?.baseTransportCost || 0,
                    pagingLimit: data.limits?.pagingLimit || 0,
                    highwayLimit: data.limits?.highwayLimit || 0,
                    battaLimit: data.limits?.battaLimit || 0,
                });
                setTourAdvance(savedData.tourAdvance || 0);
                setIsFinalized(data.log_sheet_finalized || false);
            } else {
                setDays(data.days);
                setActualExcessRate(null);
                setTotalActualKmOverride(null);
                setEditableLimits({
                    totalMileageLimit: data.limits?.totalMileageLimit || 0,
                    baseTransportCost: data.limits?.baseTransportCost || 0,
                    pagingLimit: data.limits?.pagingLimit || 0,
                    highwayLimit: data.limits?.highwayLimit || 0,
                    battaLimit: data.limits?.battaLimit || 0,
                });
                setTourAdvance(0);
                setIsFinalized(false);
            }
        } catch (err) {
            console.error("Error fetching log sheet data:", err);
            alert("Failed to load log sheet data. Itinerary or costing sheet might be missing.");
        } finally {
            setLoading(false);
        }
    };

    const updateActualKm = (index: number, val: number) => {
        if (isFinalized) return;
        setDays(prev => prev.map((d, i) => i === index ? { ...d, actualKm: val } : d));
    };

    const updateCost = (field: keyof typeof costs, val: number) => {
        if (isFinalized) return;
        setCosts(prev => ({ ...prev, [field]: val }));
    };

    const updateEditableLimit = (field: keyof typeof editableLimits, val: number) => {
        if (isFinalized) return;
        setEditableLimits(prev => ({ ...prev, [field]: val }));
    };

    const totalEstimatedKm = days.reduce((sum, d) => sum + (d.estimatedKm || 0), 0);
    const calculatedTotalActualKm = days.reduce((sum, d) => sum + (d.actualKm || 0), 0);
    const totalActualKm = totalActualKmOverride !== null ? totalActualKmOverride : calculatedTotalActualKm;

    const baseTransportCost = editableLimits.baseTransportCost || 0;
    const mileageLimit = editableLimits.totalMileageLimit || 0;
    const rate = actualExcessRate !== null ? actualExcessRate : (limits?.mileageRate || 0);
    
    // Formula: Total Actual KM * Rate
    const mileageCost = totalActualKm * rate;

    const totalExpenses = mileageCost + costs.paging + costs.highway + costs.batta + costs.tickets + costs.other;

    const handleFinalize = async () => {
        setFinalizing(true);
        try {
            const res = await fetch("/api/driver-log-sheet/finalize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tourId,
                    logSheetData: {
                        days,
                        driverName: tourInfo?.driverName,
                        vehicleInfo: tourInfo?.driverVehicle,
                        totalEstimatedKm,
                        totalActualKm,
                        totalActualKmOverride,
                        totalExpenses,
                        costs,
                        actualExcessRate,
                        editableLimits,
                        tourAdvance,
                    },
                }),
            });

            if (!res.ok) throw new Error("Failed to finalize");

            setIsFinalized(true);
            setShowConfirm(false);
            onFinalized?.();
            alert("Log sheet finalized! Transport voucher has been created.");
        } catch (err) {
            console.error("Finalize error:", err);
            alert("Failed to finalize log sheet");
        } finally {
            setFinalizing(false);
        }
    };

    const handleSaveDraft = async () => {
        setFinalizing(true);
        try {
            const res = await fetch("/api/driver-log-sheet/finalize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tourId,
                    isDraft: true,
                    logSheetData: {
                        days,
                        driverName: tourInfo?.driverName,
                        vehicleInfo: tourInfo?.driverVehicle,
                        totalEstimatedKm,
                        totalActualKm,
                        totalActualKmOverride,
                        totalExpenses,
                        costs,
                        actualExcessRate,
                        editableLimits,
                        tourAdvance,
                    },
                }),
            });

            if (!res.ok) throw new Error("Failed to save draft");
            
            alert("Log sheet progress saved successfully!");
        } catch (err) {
            console.error("Error saving draft:", err);
            alert("Failed to save progress");
        } finally {
            setFinalizing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden print:shadow-none print:rounded-none print:max-h-none print:max-w-none">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between print:hidden bg-gray-50/80 backdrop-blur-sm z-10 sticky top-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Driver Log Sheet</h2>
                        <p className="text-sm text-gray-500">{tourName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isFinalized && (
                            <span className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase flex items-center gap-1.5 shadow-sm">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                Finalized
                            </span>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => window.open(`/api/driver-log-sheet/${tourId}`, '_blank')} className="bg-white border shadow-sm flex items-center h-9 text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200">
                            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Excel
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => window.open(`/api/driver-log-sheet/${tourId}/pdf`, '_blank')} className="bg-white border shadow-sm flex items-center h-9 text-primary-700 hover:text-primary-800 hover:bg-primary-50 border-primary-200">
                            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            PDF
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => window.print()} className="bg-white border shadow-sm flex items-center h-9">
                            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print
                        </Button>
                        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center hover:bg-gray-200 rounded-lg transition-colors text-gray-500 hover:text-gray-700 bg-white shadow-sm border border-gray-200">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Printable Content */}
                <div className="flex-1 overflow-auto bg-white" id="printable-area">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                    ) : (
                        <div className="p-8 max-w-4xl mx-auto font-serif text-[#2c2c2c] text-[12px] bg-white print:p-0 w-full space-y-6">
                            {/* Hotel Voucher Style Header */}
                            <div className="flex justify-between items-end pb-2 mb-4 border-b-[1.5px] border-[#2c2c2c]">
                                <img src={process.env.NEXT_PUBLIC_LOGO_URL || 'https://axcfwwdahunzxsdeohkv.supabase.co/storage/v1/object/public/logo/Serendia.png'} alt="TravX" className="h-10 w-auto" />
                                <div className="text-right text-[10px] text-[#555] leading-relaxed">
                                    <div className="text-[14px] font-bold text-[#2c2c2c] tracking-[2px] uppercase mb-0.5 font-sans">
                                        TravX
                                    </div>
                                    {company?.address || "63A, Old Road, Pannipitiya, Sri Lanka"}<br/>
                                    {company?.phone || "+94 77 346 9998"} &nbsp;&middot;&nbsp; {company?.email || "info@serendiaholidays.com"}
                                </div>
                            </div>
                            
                            <div className="text-center mb-6">
                                <h1 className="text-[18px] font-normal italic text-[#2c2c2c]">Driver Log Sheet</h1>
                                <div className="w-[50px] h-[1.5px] bg-accent-500 mx-auto mt-1.5"></div>
                            </div>


                            {/* Tour Info Grid */}
                            <div className="grid grid-cols-2 border-t border-l border-[#e5e0d8] mb-5">
                                <div className="px-3 py-2 border-b border-r border-[#e5e0d8] col-span-2">
                                    <div className="text-[9px] uppercase tracking-[1.5px] text-[#999] mb-1 font-sans">Guest Name</div>
                                    <div className="font-bold text-accent-500 text-[13px]">{tourInfo?.guestName || "-"}</div>
                                </div>
                                <div className="px-3 py-2 border-b border-r border-[#e5e0d8]">
                                    <div className="text-[9px] uppercase tracking-[1.5px] text-[#999] mb-1 font-sans">Tour Number</div>
                                    <div className="font-bold text-[13px]">{tourName || "-"}</div>
                                </div>
                                <div className="px-3 py-2 border-b border-r border-[#e5e0d8]">
                                    <div className="text-[9px] uppercase tracking-[1.5px] text-[#999] mb-1 font-sans">Driver Name</div>
                                    <div className="font-bold text-[13px]">{tourInfo?.driverName || "Not Assigned"}</div>
                                </div>
                                <div className="px-3 py-2 border-b border-r border-[#e5e0d8]">
                                    <div className="flex items-center gap-2">
                                        <div className="text-[10px] text-[#888] italic min-w-16 font-serif">Pax</div>
                                        <div className="font-bold text-[13px]">{tourInfo?.paxInfo || "-"}</div>
                                    </div>
                                </div>
                                <div className="px-3 py-2 border-b border-r border-[#e5e0d8]">
                                    <div className="flex items-center gap-2">
                                        <div className="text-[10px] text-[#888] italic min-w-16 font-serif">Vehicle</div>
                                        <div className="font-bold text-[13px]">{tourInfo?.driverVehicle || "-"}</div>
                                    </div>
                                </div>
                                <div className="px-3 py-2 border-b border-r border-[#e5e0d8]">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-2">
                                        <div className="text-[10px] text-[#888] italic min-w-16 font-serif">Arrival</div>
                                        <div className="font-bold text-[13px]">{tourInfo?.arrivalDate || "-"}</div>
                                        <div className="text-[12px] text-[#555]">{tourInfo?.arrivalFlight || "-"}</div>
                                    </div>
                                </div>
                                <div className="px-3 py-2 border-b border-r border-[#e5e0d8]">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-2">
                                        <div className="text-[10px] text-[#888] italic min-w-16 font-serif">Departure</div>
                                        <div className="font-bold text-[13px]">{tourInfo?.departureDate || "-"}</div>
                                        <div className="text-[12px] text-[#555]">{tourInfo?.departureFlight || "-"}</div>
                                    </div>
                                </div>
                                {(editableLimits.totalMileageLimit || 0) > 0 && (
                                    <>
                                        <div className="px-3 py-1.5 border-b border-r border-[#e5e0d8] flex items-center bg-[#faf9f7]">
                                            <div className="text-[10px] text-[#888] italic min-w-[70px] font-serif">Package KM</div>
                                            <input
                                                type="number" min="0" value={editableLimits.totalMileageLimit || ""}
                                                onChange={e => updateEditableLimit('totalMileageLimit', parseFloat(e.target.value) || 0)}
                                                disabled={isFinalized}
                                                className="w-full bg-transparent border-none outline-none font-bold text-[14px]" 
                                            />
                                        </div>
                                        <div className="px-3 py-1.5 border-b border-r border-[#e5e0d8] flex items-center bg-[#faf9f7]">
                                            <div className="text-[10px] text-[#888] italic min-w-[70px] font-serif">Batta Total</div>
                                            <input
                                                type="number" min="0" value={editableLimits.battaLimit || ""}
                                                onChange={e => updateEditableLimit('battaLimit', parseFloat(e.target.value) || 0)}
                                                disabled={isFinalized}
                                                className="w-full bg-transparent border-none outline-none font-bold text-[14px]" 
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Daily Log Table */}
                            <div className="mb-4">
                                <div className="text-[12px] italic text-[#2c2c2c] mb-1.5 pb-1 border-b border-[#c09853] inline-block">Daily Log (Driver Input)</div>
                                <table className="w-full border-collapse mb-4 table-fixed">
                                    <thead>
                                        <tr>
                                            <th className="w-[15%] text-[9px] uppercase tracking-[1px] text-[#888] font-normal py-2 px-2 border-b-[1.5px] border-[#2c2c2c] text-center">Date</th>
                                            <th className="w-[55%] text-[9px] uppercase tracking-[1px] text-[#888] font-normal py-2 px-2 border-b-[1.5px] border-[#2c2c2c] text-left">Itinerary</th>
                                            <th className="w-[15%] text-[9px] uppercase tracking-[1px] text-[#888] font-normal py-2 px-2 border-b-[1.5px] border-[#2c2c2c] text-center">Package KM</th>
                                            <th className="w-[15%] text-[9px] uppercase tracking-[1px] text-[#888] font-normal py-2 px-2 border-b-[1.5px] border-[#2c2c2c] text-center">Actual KM</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {days.map((day, idx) => {
                                            const dateStr = day.date ? format(parseISO(day.date), "dd-MMM") : "-";
                                            return (
                                                <tr key={idx}>
                                                    <td className="py-2 px-2 border-b border-[#eee] text-[11px] text-center text-[#555]">{dateStr}</td>
                                                    <td className="py-2 px-2 border-b border-[#eee] text-[11px] text-left text-[#2c2c2c] truncate max-w-[200px]" title={day.route}>{day.route}</td>
                                                    <td className="py-2 px-2 border-b border-[#eee] text-[11px] text-center text-[#555]">{day.estimatedKm}</td>
                                                    <td className="py-1 px-1 border-b border-[#eee] text-[11px] text-center bg-[#faf9f7]/50">
                                                        <input
                                                            type="number" min="0" value={day.actualKm || ""}
                                                            onChange={(e) => updateActualKm(idx, parseFloat(e.target.value) || 0)}
                                                            disabled={isFinalized}
                                                            className="w-full text-center bg-transparent border-none focus:ring-1 focus:ring-[#c09853] outline-none font-bold placeholder-gray-300 py-1"
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        <tr>
                                            <td colSpan={2} className="py-3 px-2 border-b-[1.5px] border-[#2c2c2c] text-right font-serif italic text-[#888] text-[10px]">TOTAL KM (DRIVER VS ACTUAL)</td>
                                            <td className="py-3 px-2 border-b-[1.5px] border-[#2c2c2c] text-center font-bold text-[12px]">{totalEstimatedKm.toLocaleString()}</td>
                                            <td className="py-2 px-1 border-b-[1.5px] border-[#2c2c2c] text-center bg-[#f5f4ef]">
                                                <input
                                                    type="number"
                                                    value={totalActualKmOverride !== null ? totalActualKmOverride : ""}
                                                    onChange={(e) => setTotalActualKmOverride(e.target.value ? parseFloat(e.target.value) : null)}
                                                    disabled={isFinalized}
                                                    className="w-full text-center bg-transparent border-none focus:ring-1 focus:ring-[#c09853] outline-none font-bold text-[#c09853] text-[12px] py-1"
                                                    placeholder={calculatedTotalActualKm.toString()}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan={2} className="py-3 px-2 text-right font-serif italic text-[#888] text-[10px]">Rate (km)</td>
                                            <td className="py-3 px-2 text-center font-bold text-[11px] text-[#555]">{limits?.mileageRate.toFixed(2)}</td>
                                            <td className="py-2 px-1 text-center bg-[#f5f4ef]">
                                                <input
                                                    type="number" min="0" step="0.01"
                                                    value={actualExcessRate !== null ? actualExcessRate : ""}
                                                    onChange={(e) => setActualExcessRate(e.target.value ? parseFloat(e.target.value) : null)}
                                                    disabled={isFinalized}
                                                    className="w-full text-center bg-transparent border-none focus:ring-1 focus:ring-[#c09853] outline-none font-bold text-[#c09853] text-[12px] py-1"
                                                    placeholder={limits?.mileageRate?.toString() || "0"}
                                                />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Costs Calculation Section */}
                            <div className="w-full max-w-sm ml-auto mt-6">
                                <div className="text-[12px] italic text-[#2c2c2c] mb-1.5 pb-1 border-b border-[#c09853] inline-block">Costs & Final Pricing</div>
                                <table className="w-full border-collapse mb-6 table-fixed">
                                    <tbody>
                                        <tr>
                                            <td className="w-1/2 py-2 px-2 border-b border-[#e5e0d8] font-serif italic text-[#888] text-[10px]">Total Mileage Cost</td>
                                            <td className="w-1/4 py-2 border-b border-[#e5e0d8] text-center text-[#999] text-[10px]">
                                                {(totalEstimatedKm * rate).toLocaleString()}
                                            </td>
                                            <td className="w-1/4 py-2 px-2 border-b border-[#e5e0d8] text-right font-bold text-[12px]">{mileageCost.toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-2 border-b border-[#e5e0d8] font-serif italic text-[#888] text-[10px]">Paging Fee</td>
                                            <td className="py-1 border-b border-[#e5e0d8]">
                                                <input
                                                    type="number" min="0" value={editableLimits.pagingLimit || ""}
                                                    onChange={e => updateEditableLimit('pagingLimit', parseFloat(e.target.value) || 0)}
                                                    disabled={isFinalized}
                                                    className="w-full text-center bg-transparent border-none outline-none text-[#999] text-[10px] placeholder-gray-300 py-1" 
                                                    placeholder="-"
                                                />
                                            </td>
                                            <td className="py-1 border-b border-[#e5e0d8] text-right bg-[#f5f4ef]/50">
                                                <input
                                                    type="number" min="0" value={costs.paging || ""}
                                                    onChange={e => updateCost('paging', parseFloat(e.target.value) || 0)}
                                                    disabled={isFinalized}
                                                    className="w-full text-right bg-transparent border-none focus:ring-1 focus:ring-[#c09853] outline-none font-bold text-[12px] py-1 px-2" 
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-2 border-b border-[#e5e0d8] font-serif italic text-[#888] text-[10px]">Highway Cost</td>
                                            <td className="py-1 border-b border-[#e5e0d8]">
                                                <input
                                                    type="number" min="0" value={editableLimits.highwayLimit || ""}
                                                    onChange={e => updateEditableLimit('highwayLimit', parseFloat(e.target.value) || 0)}
                                                    disabled={isFinalized}
                                                    className="w-full text-center bg-transparent border-none outline-none text-[#999] text-[10px] placeholder-gray-300 py-1" 
                                                    placeholder="-"
                                                />
                                            </td>
                                            <td className="py-1 border-b border-[#e5e0d8] text-right bg-[#f5f4ef]/50">
                                                <input
                                                    type="number" min="0" value={costs.highway || ""}
                                                    onChange={e => updateCost('highway', parseFloat(e.target.value) || 0)}
                                                    disabled={isFinalized}
                                                    className="w-full text-right bg-transparent border-none focus:ring-1 focus:ring-[#c09853] outline-none font-bold text-[12px] py-1 px-2" 
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-2 border-b border-[#e5e0d8] font-serif italic text-[#888] text-[10px]">Batta</td>
                                            <td className="py-1 border-b border-[#e5e0d8]">
                                                <input
                                                    type="number" min="0" value={editableLimits.battaLimit || ""}
                                                    onChange={e => updateEditableLimit('battaLimit', parseFloat(e.target.value) || 0)}
                                                    disabled={isFinalized}
                                                    className="w-full text-center bg-transparent border-none outline-none text-[#999] text-[10px] placeholder-gray-300 py-1" 
                                                    placeholder="-"
                                                />
                                            </td>
                                            <td className="py-1 border-b border-[#e5e0d8] text-right bg-[#f5f4ef]/50">
                                                <input
                                                    type="number" min="0" value={costs.batta || ""}
                                                    onChange={e => updateCost('batta', parseFloat(e.target.value) || 0)}
                                                    disabled={isFinalized}
                                                    className="w-full text-right bg-transparent border-none focus:ring-1 focus:ring-[#c09853] outline-none font-bold text-[12px] py-1 px-2" 
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-2 border-b border-[#e5e0d8] font-serif italic text-[#888] text-[10px]">Tickets / Entry Fees</td>
                                            <td className="py-2 px-2 border-b border-[#e5e0d8] text-center text-[#999] font-sans">-</td>
                                            <td className="py-1 border-b border-[#e5e0d8] text-right bg-[#f5f4ef]/50">
                                                <input
                                                    type="number" min="0" value={costs.tickets || ""}
                                                    onChange={e => updateCost('tickets', parseFloat(e.target.value) || 0)}
                                                    disabled={isFinalized}
                                                    className="w-full text-right bg-transparent border-none focus:ring-1 focus:ring-[#c09853] outline-none font-bold text-[12px] py-1 px-2" 
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-2 border-b-[2px] border-[#2c2c2c] font-serif italic text-[#888] text-[10px]">Other Expenses</td>
                                            <td className="py-2 px-2 border-b-[2px] border-[#2c2c2c] text-center text-[#999] font-sans">-</td>
                                            <td className="py-1 border-b-[2px] border-[#2c2c2c] text-right bg-[#f5f4ef]/50">
                                                <input
                                                    type="number" min="0" value={costs.other || ""}
                                                    onChange={e => updateCost('other', parseFloat(e.target.value) || 0)}
                                                    disabled={isFinalized}
                                                    className="w-full text-right bg-transparent border-none focus:ring-1 focus:ring-[#c09853] outline-none font-bold text-[12px] py-1 px-2" 
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan={2} className="py-3 px-2 border-b border-[#e5e0d8] text-right uppercase tracking-[1.5px] text-[#2c2c2c] font-sans text-[11px] font-bold">TOTAL PRICE</td>
                                            <td className="py-3 px-2 border-b border-[#e5e0d8] text-right font-bold text-[#c09853] text-[14px]">
                                                {totalExpenses.toLocaleString()}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan={2} className="py-2 px-2 border-b-[1.5px] border-[#2c2c2c] text-right font-serif italic text-[#888] text-[10px]">Tour Advance</td>
                                            <td className="py-1 border-b-[1.5px] border-[#2c2c2c]">
                                                <input
                                                    type="number" min="0" value={tourAdvance || ""}
                                                    onChange={e => setTourAdvance(parseFloat(e.target.value) || 0)}
                                                    disabled={isFinalized}
                                                    className="w-full text-right bg-transparent border-none focus:ring-1 focus:ring-[#c09853] outline-none font-bold text-[12px] py-1 px-2 placeholder-gray-300" 
                                                    placeholder="0"
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan={2} className="py-4 px-2 text-right uppercase tracking-[1.5px] text-[#2c2c2c] font-sans text-[12px] font-bold">Balance Due</td>
                                            <td className="py-4 px-2 text-right font-black text-[#2c2c2c] text-[16px]">
                                                {(totalExpenses - tourAdvance).toLocaleString()}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer with Summary & Finalize */}
                <div className="px-6 py-4 border-t border-gray-100 print:hidden bg-gray-50/80 backdrop-blur-sm z-10 sticky bottom-0">
                    <div className="flex items-center justify-between max-w-4xl mx-auto">
                        <div className="flex items-center gap-8">
                            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5 tracking-wider">Total KM</span>
                                <span className="font-black text-gray-900 text-lg tabular-nums leading-none">{totalActualKm} <span className="text-sm font-medium text-gray-500">km</span></span>
                            </div>
                            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5 tracking-wider">Calculated Payout</span>
                                <span className="font-black text-green-600 text-lg tabular-nums leading-none"><span className="text-sm font-medium mr-1">Rs.</span>{totalExpenses.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="secondary" onClick={onClose} className="bg-white shadow-sm border">
                                Close
                            </Button>
                            {!isFinalized && (
                                <>
                                    <Button
                                        variant="secondary"
                                        onClick={handleSaveDraft}
                                        disabled={finalizing}
                                        loading={finalizing}
                                        className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 px-6 shadow-sm"
                                    >
                                        Save Draft
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={() => setShowConfirm(true)}
                                        disabled={totalActualKm === 0}
                                        className="bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20 px-8"
                                    >
                                        Finalize Log Sheet
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Finalize Confirmation */}
                {showConfirm && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500"></div>
                            <div className="flex items-center gap-4 mb-6 pt-2">
                                <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center border border-green-100 shrink-0">
                                    <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Finalize Log Sheet?</h3>
                                    <p className="text-sm text-gray-500">This action will lock the sheet</p>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 font-medium">Actual KM Logged:</span>
                                    <span className="font-bold text-gray-900">{totalActualKm} km</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 font-medium">Payment Voucher:</span>
                                    <span className="font-bold text-green-700">Rs. {totalExpenses.toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-end gap-3 mt-8">
                                <Button variant="secondary" onClick={() => setShowConfirm(false)} disabled={finalizing} className="bg-gray-100 border-transparent hover:bg-gray-200">
                                    Review Again
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleFinalize}
                                    disabled={finalizing}
                                    loading={finalizing}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    Confirm & Finalize
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <style jsx global>{`
                @media print {
                    @page { margin: 0.5cm; }
                    body * {
                        visibility: hidden;
                    }
                    #printable-area, #printable-area * {
                        visibility: visible;
                    }
                    #printable-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    /* Add extra rules for WebKit to retain colors */
                    .bg-\\[\\#E04344\\], .bg-red-50\\/50, .bg-blue-50\\/30, .bg-gray-100 {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    input {
                        border: none !important;
                        outline: none !important;
                        background: transparent !important;
                    }
                }
                
                /* Remove number input spinners */
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
                input[type=number] {
                    -moz-appearance: textfield;
                }
            `}</style>
        </div>
    );
}
