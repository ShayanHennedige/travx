"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { formatUSDAmountInWords } from "@/lib/utils/numberToWords";

interface InvoiceData {
    // References
    itinerary_id: string;
    tour_id: string | null;
    costing_sheet_id: string | null;
    tour_reference: string;

    // Customer Info
    customer_name: string;  // Agent Name
    customer_company?: string; // Agent Company
    notes: string;          // Client Names

    // Tour Details
    no_of_pax: number;
    no_of_nights: number;
    arriving_date: string;
    departure_date: string;
    package_title: string;

    // Rates from Costing Sheet
    per_person_usd: number;

    // Calculated
    subtotal: number;
    package_description: string;

    // Manual Inputs
    bank_charges: number;
    tax_percentage: number;

    // Computed
    tax_amount: number;
    total_amount: number;

    // Invoice Meta
    invoice_date: string;
    currency: string;
    status: string;
}

function NewInvoiceContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const itineraryId = searchParams.get("itinerary_id");
    const isExtra = searchParams.get("type") === "extra";
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
    const [isGroup, setIsGroup] = useState(false);
    const [clientName, setClientName] = useState("");

    // Manual inputs
    const [bankCharges, setBankCharges] = useState("0");
    const [taxPercentage, setTaxPercentage] = useState("0");

    // Editable rate override
    const [isEditingRate, setIsEditingRate] = useState(false);
    const [editPerPerson, setEditPerPerson] = useState("");
    const [editPax, setEditPax] = useState("");

    // Extra invoice: free-form description and single amount
    const [extraDescription, setExtraDescription] = useState("");
    const [extraAmount, setExtraAmount] = useState("0");

    useEffect(() => {
        const fetchData = async () => {
            if (!itineraryId) {
                toast.error("No itinerary specified");
                setIsLoading(false);
                return;
            }

            const supabase = createClient();

            // Fetch itinerary
            const { data: itinerary, error: itError } = await supabase
                .from("itineraries")
                .select("*")
                .eq("id", itineraryId)
                .single();

            if (itError || !itinerary) {
                console.error("Error fetching itinerary:", itError);
                toast.error("Failed to load itinerary data");
                setIsLoading(false);
                return;
            }

            // Fetch inquiry (individual or group)
            let inquiry: any = null;
            const isGroupTour = !!itinerary.group_inquiry_id;
            setIsGroup(isGroupTour);

            if (itinerary.inquiry_id) {
                const { data } = await supabase
                    .from("inquiries")
                    .select("*")
                    .eq("id", itinerary.inquiry_id)
                    .single();
                inquiry = data;
            } else if (itinerary.group_inquiry_id) {
                const { data } = await supabase
                    .from("group_inquiries")
                    .select("*")
                    .eq("id", itinerary.group_inquiry_id)
                    .single();
                inquiry = data;
            }

            if (!inquiry) {
                toast.error("No inquiry found for this itinerary");
                setIsLoading(false);
                return;
            }

            // Fetch costing sheet
            let costing: any = null;
            const { data: costingData } = await supabase
                .from("tour_costing_sheets")
                .select("*")
                .eq("itinerary_id", itineraryId)
                .maybeSingle();

            costing = costingData;

            if (!costing) {
                toast.error("No costing sheet found. Please create a costing sheet first.");
                setIsLoading(false);
                return;
            }

            // Fetch tour if it exists
            const { data: tour } = await supabase
                .from("tours")
                .select("id")
                .eq("itinerary_id", itineraryId)
                .maybeSingle();

            // Extract data
            const agentName = inquiry.agent_name || "";
            const agentCompany = inquiry.agent_company || "";

            const displayName = agentName || agentCompany || (isGroupTour
                    ? `${inquiry.head_first_name || ""} ${inquiry.head_last_name || ""}`.trim()
                    : "Direct Client");

            const clientNames = isGroupTour
                ? `${inquiry.head_first_name || ""} ${inquiry.head_last_name || ""}`.trim()
                : `${inquiry.first_name || ""} ${inquiry.last_name || ""}`.trim();

            setClientName(clientNames);

            const noOfPax = costing.no_of_pax ||
                ((inquiry.no_of_pax || inquiry.no_of_adults || 0) + (inquiry.no_of_children || 0)) || 2;
            const noOfNights = inquiry.no_of_nights || 0;
            const perPersonUsd = costing.per_person_usd || 0;
            const subtotal = perPersonUsd * noOfPax;

            const packageTitle = itinerary.content?.title || "Tour Package Sri Lanka";

            // Format dates for description
            const formatDate = (dateStr: string | null) => {
                if (!dateStr) return "";
                try {
                    const date = new Date(dateStr);
                    const d = date.getDate();
                    const nth = (n: number) => {
                        if (n > 3 && n < 21) return 'th';
                        switch (n % 10) {
                            case 1: return "st";
                            case 2: return "nd";
                            case 3: return "rd";
                            default: return "th";
                        }
                    };
                    return `${d}${nth(d)} ${format(date, "MMMM yyyy")}`;
                } catch {
                    return "";
                }
            };

            const arrivalFormatted = formatDate(inquiry.arriving_date);
            const departureFormatted = formatDate(inquiry.departure_date);
            const dateRange = arrivalFormatted && departureFormatted
                ? `from ${arrivalFormatted} to ${departureFormatted}`
                : "";

            const packageDescription = `${packageTitle} – ${noOfNights.toString().padStart(2, '0')} Nights / ${(noOfNights + 1).toString().padStart(2, '0')} Days\n${dateRange}\nUSD ${perPersonUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })} per person x ${noOfPax} pax`;

            setInvoiceData({
                itinerary_id: itinerary.id,
                tour_id: tour?.id || null,
                costing_sheet_id: costing.id,
                tour_reference: inquiry.inquiry_number || "",
                customer_name: displayName,
                customer_company: agentCompany,
                notes: clientNames,
                no_of_pax: noOfPax,
                no_of_nights: noOfNights,
                arriving_date: inquiry.arriving_date || "",
                departure_date: inquiry.departure_date || "",
                package_title: packageTitle,
                per_person_usd: isExtra ? 0 : perPersonUsd,
                subtotal: isExtra ? 0 : subtotal,
                package_description: isExtra ? "" : packageDescription,
                bank_charges: 0,
                tax_percentage: 0,
                tax_amount: 0,
                total_amount: isExtra ? 0 : subtotal,
                invoice_date: new Date().toISOString().split("T")[0],
                currency: "USD",
                status: "draft",
            });

            setIsLoading(false);
        };

        fetchData();
    }, [itineraryId]);

    // Calculate effective values (using overrides if editing)
    const effectivePerPerson = isEditingRate && editPerPerson !== "" ? parseFloat(editPerPerson) || 0 : invoiceData?.per_person_usd || 0;
    const effectivePax = isEditingRate && editPax !== "" ? parseInt(editPax) || 0 : invoiceData?.no_of_pax || 0;
    const extraAmountNum = parseFloat(extraAmount) || 0;
    const effectiveSubtotal = isExtra ? extraAmountNum : effectivePerPerson * effectivePax;

    // Calculate totals when manual inputs change
    const calculateTotals = () => {
        if (!invoiceData) return { taxAmount: 0, totalAmount: 0 };
        const bc = parseFloat(bankCharges) || 0;
        const tp = parseFloat(taxPercentage) || 0;
        const taxAmount = (effectiveSubtotal * tp) / 100;
        const totalAmount = effectiveSubtotal + bc + taxAmount;
        return { taxAmount, totalAmount };
    };

    const { taxAmount, totalAmount } = calculateTotals();

    const handleSubmit = async () => {
        if (!invoiceData) return;

        setIsSaving(true);

        try {
            const payload = {
                itinerary_id: invoiceData.itinerary_id,
                tour_id: invoiceData.tour_id,
                costing_sheet_id: invoiceData.costing_sheet_id,
                tour_reference: invoiceData.tour_reference,
                customer_name: invoiceData.customer_name,
                customer_company: invoiceData.customer_company,
                notes: clientName || "Guest",
                package_description: isExtra ? extraDescription : invoiceData.package_description,
                currency: invoiceData.currency,
                invoice_date: invoiceData.invoice_date,
                status: "draft",
                payment_terms: isExtra ? "extra_invoice" : null,
                // Rates
                rate_dbl: isExtra ? extraAmountNum : effectivePerPerson,
                qty_dbl: isExtra ? 1 : effectivePax,
                rate_sgl: 0,
                qty_sgl: 0,
                rate_tpl: 0,
                qty_tpl: 0,
                rate_qud: 0,
                qty_qud: 0,
                // Calculations
                subtotal: effectiveSubtotal,
                bank_charges: parseFloat(bankCharges) || 0,
                tax_percentage: parseFloat(taxPercentage) || 0,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                no_of_pax: isExtra ? invoiceData.no_of_pax : effectivePax,
            };

            const response = await fetch("/api/customer-invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to create invoice");
            }

            toast.success("Invoice created successfully!");

            // Download PDF
            const pdfResponse = await fetch(`/api/customer-invoices/${result.invoice.id}/pdf`);
            if (pdfResponse.ok) {
                const blob = await pdfResponse.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `Invoice-${result.invoice.invoice_no}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            }

            router.push("/operations");
        } catch (error: any) {
            console.error("Error:", error);
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-surface-500">Loading invoice data...</p>
                </div>
            </div>
        );
    }

    if (!invoiceData) {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <Card className="p-8 text-center">
                    <h2 className="text-xl font-semibold text-surface-900 mb-2">Cannot Create Invoice</h2>
                    <p className="text-surface-600 mb-4">Please ensure the itinerary has a finalized costing sheet before creating an invoice.</p>
                    <Button variant="secondary" onClick={() => router.back()}>Go Back</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-6">
            <Card className="overflow-hidden">
                {/* Header */}
                <div className={`px-6 py-4 ${isExtra ? "bg-gradient-to-r from-amber-700 to-amber-800" : "bg-gradient-to-r from-surface-800 to-surface-900"}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-white">{isExtra ? "Create Extra Invoice" : "Create Invoice"}</h1>
                            <p className={`text-sm ${isExtra ? "text-amber-200" : "text-surface-300"}`}>
                                {isExtra ? "Enter a custom description and amount for this additional invoice" : "Review details and enter charges"}
                            </p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => router.back()}>
                            Cancel
                        </Button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Invoice Preview Header */}
                    <div className="border border-surface-200 rounded-lg overflow-hidden">
                        <div className="bg-surface-50 px-4 py-2 border-b border-surface-200">
                            <span className="text-xs font-bold text-surface-600 uppercase tracking-wide">Invoice Details</span>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-surface-400 uppercase">Date</label>
                                <p className="text-sm font-medium text-surface-900">{format(new Date(invoiceData.invoice_date), "do MMMM yyyy")}</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-surface-400 uppercase">Tour Reference</label>
                                <p className="text-sm font-medium text-surface-900">{invoiceData.tour_reference || "N/A"}</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-surface-400 uppercase">Name of Travel Agent</label>
                                <p className="text-sm font-medium text-surface-900">{invoiceData.customer_name}</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-surface-400 uppercase">Name of Agent Company</label>
                                <p className="text-sm font-medium text-surface-900">{invoiceData.customer_company || "-"}</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-surface-400 uppercase">No of Pax</label>
                                <p className="text-sm font-medium text-surface-900">{invoiceData.no_of_pax.toString().padStart(2, '0')}</p>
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-surface-400 uppercase">Name of Client</label>
                                {isGroup ? (
                                    <input
                                        type="text"
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        className="w-full px-3 py-1.5 border border-surface-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="Enter client name"
                                    />
                                ) : (
                                    <p className="text-sm font-medium text-surface-900">{clientName || "Guest"}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Package Description */}
                    <div className="border border-surface-200 rounded-lg overflow-hidden">
                        <div className={`px-4 py-2 flex justify-between items-center ${isExtra ? "bg-amber-50 border-b border-amber-200" : "bg-surface-100"}`}>
                            <span className="text-xs font-bold text-surface-700">Description</span>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-surface-700">Amount in USD</span>
                                {!isExtra && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!isEditingRate && invoiceData) {
                                                setEditPerPerson(invoiceData.per_person_usd.toString());
                                                setEditPax(invoiceData.no_of_pax.toString());
                                            }
                                            setIsEditingRate(!isEditingRate);
                                        }}
                                        className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${isEditingRate ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-primary-50 text-primary-600 hover:bg-primary-100"}`}
                                    >
                                        {isEditingRate ? "✓ Using Custom" : "Edit"}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="p-4">
                            {isExtra ? (
                                /* Extra Invoice: Free-form description + single amount */
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-surface-600 mb-1.5">Invoice Description</label>
                                        <textarea
                                            value={extraDescription}
                                            onChange={(e) => setExtraDescription(e.target.value)}
                                            placeholder="Enter the description for this extra invoice (e.g., Additional excursion charges, Early check-in fees, etc.)"
                                            className="w-full px-3 py-2.5 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                                            rows={4}
                                        />
                                    </div>
                                    <div className="flex items-end gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-surface-600 mb-1.5">Amount (USD)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={extraAmount}
                                                onChange={(e) => setExtraAmount(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full px-3 py-2.5 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                                            />
                                        </div>
                                        <div className="flex-shrink-0 pb-0.5">
                                            <span className="text-lg font-bold text-amber-700">
                                                {effectiveSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : isEditingRate ? (
                                <div className="space-y-3">
                                    <div className="whitespace-pre-line text-sm text-surface-700 mb-3">
                                        {invoiceData.package_description}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">Per Person (USD)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={editPerPerson}
                                                onChange={(e) => setEditPerPerson(e.target.value)}
                                                className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">No. of Pax</label>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={editPax}
                                                onChange={(e) => setEditPax(e.target.value)}
                                                className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-xs text-surface-500">Auto-calculated: USD {(invoiceData.per_person_usd * invoiceData.no_of_pax).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        <span className="text-lg font-bold text-amber-700">
                                            {effectiveSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-start">
                                    <div className="whitespace-pre-line text-sm text-surface-700">
                                        {invoiceData.package_description}
                                    </div>
                                    <div className="text-lg font-bold text-surface-900 ml-4">
                                        {effectiveSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Manual Inputs & Totals */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Manual Inputs */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-surface-700 border-b border-surface-200 pb-2">Enter Charges</h3>

                            <div>
                                <label className="block text-xs font-medium text-surface-600 mb-1">Bank Charges (USD)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={bankCharges}
                                    onChange={(e) => setBankCharges(e.target.value)}
                                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-surface-600 mb-1">Tax (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={taxPercentage}
                                    onChange={(e) => setTaxPercentage(e.target.value)}
                                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="bg-surface-50 rounded-lg p-4 space-y-3">
                            <h3 className="text-sm font-bold text-surface-700 border-b border-surface-200 pb-2">Summary</h3>

                            <div className="flex justify-between text-sm">
                                <span className="text-surface-600">Sub Total</span>
                                <span className="font-medium">{effectiveSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-surface-600">Bank Charges</span>
                                <span className="font-medium">{(parseFloat(bankCharges) || 0) > 0 ? (parseFloat(bankCharges)).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-surface-600">Tax ({taxPercentage}%)</span>
                                <span className="font-medium">{taxAmount > 0 ? taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}</span>
                            </div>
                            <div className="border-t border-surface-300 pt-3 flex justify-between text-base font-bold">
                                <span className="text-surface-900">Total (USD)</span>
                                <span className="text-primary-600">{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="text-xs text-surface-500 italic">
                                {formatUSDAmountInWords(totalAmount)}
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 border-t border-surface-200">
                        <Button
                            onClick={handleSubmit}
                            disabled={isSaving}
                            className="w-full py-3 text-base font-semibold"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating Invoice...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Save Invoice & Download PDF
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}

export default function NewInvoicePage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-surface-500">Loading...</p>
                </div>
            </div>
        }>
            <NewInvoiceContent />
        </Suspense>
    );
}
