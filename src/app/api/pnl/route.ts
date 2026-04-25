import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pnlRecordSchema, calculatePnlSummary } from "@/lib/validations/invoice";

const INCOME_STATUSES = ["confirmed", "sent", "paid", "overdue"] as const;
const REF_PREFIX = "ref:";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GET - Get PNL records with optional filtering or calculate for a tour
export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const tourId = searchParams.get("tour_id");
    const calculateFor = searchParams.get("calculate_for"); // Tour ID to calculate fresh PNL
    const status = searchParams.get("status");

    // If calculate_for is provided, calculate PNL from linked invoices/vouchers
    if (calculateFor) {
        const isReferenceLookup = calculateFor.startsWith(REF_PREFIX) || !UUID_RE.test(calculateFor);
        const referenceValue = calculateFor.startsWith(REF_PREFIX)
            ? decodeURIComponent(calculateFor.slice(REF_PREFIX.length))
            : calculateFor;

        // Get income from issued customer invoices
        let invoiceQuery = supabase
            .from("customer_invoices")
            .select("total_amount, status, tour_reference, costing_sheet_id")
            .in("status", INCOME_STATUSES as any);

        invoiceQuery = isReferenceLookup
            ? invoiceQuery.eq("tour_reference", referenceValue)
            : invoiceQuery.eq("tour_id", calculateFor);

        const { data: invoices } = await invoiceQuery;

        // Get expenses from payment vouchers (excluding admin category)
        let voucherQuery = supabase
            .from("payment_vouchers")
            .select("total_usd, payee_type, tour_reference, voucher_category")
            .neq("voucher_category", "admin");

        voucherQuery = isReferenceLookup
            ? voucherQuery.eq("tour_reference", referenceValue)
            : voucherQuery.eq("tour_id", calculateFor);

        const { data: vouchers } = await voucherQuery;

        let costingIncome = 0;
        let logSheetDriverUSD = 0;

        if (isReferenceLookup) {
            const { data: inquiry } = await supabase
                .from("inquiries")
                .select("id")
                .eq("inquiry_number", referenceValue)
                .maybeSingle();

            const { data: groupInquiry } = await supabase
                .from("group_inquiries")
                .select("id")
                .eq("inquiry_number", referenceValue)
                .maybeSingle();

            let itineraryQuery = supabase
                .from("itineraries")
                .select("id")
                .order("created_at", { ascending: false })
                .limit(1);

            if (inquiry?.id) {
                itineraryQuery = itineraryQuery.eq("inquiry_id", inquiry.id);
            } else if (groupInquiry?.id) {
                itineraryQuery = itineraryQuery.eq("group_inquiry_id", groupInquiry.id);
            }

            const { data: itinerary } = await itineraryQuery.maybeSingle();

            if (itinerary?.id) {
                const { data: costing } = await supabase
                    .from("tour_costing_sheets")
                    .select("per_person_usd, total_usd")
                    .eq("itinerary_id", itinerary.id)
                    .maybeSingle();
                costingIncome = Number(costing?.total_usd || 0) || Number(costing?.per_person_usd || 0) || 0;
            }
        } else {
            const { data: tour } = await supabase
                .from("tours")
                .select("itinerary_id, log_sheet_finalized, log_sheet_data")
                .eq("id", calculateFor)
                .maybeSingle();

            if (tour?.itinerary_id) {
                const { data: costing } = await supabase
                    .from("tour_costing_sheets")
                    .select("per_person_usd, total_usd")
                    .eq("itinerary_id", tour.itinerary_id)
                    .maybeSingle();
                costingIncome = Number(costing?.total_usd || 0) || Number(costing?.per_person_usd || 0) || 0;
            }

            // Read driver expenses from finalized log sheet (ground truth)
            if ((tour as any).log_sheet_data?.totalExpenses) {
                const logSheetTotalLKR = (tour as any).log_sheet_data.totalExpenses;
                logSheetDriverUSD = Math.round((logSheetTotalLKR / 300) * 100) / 100;
            }
        }

        const invoiceIncome = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
        const customer_invoice_total = costingIncome > 0 ? costingIncome : invoiceIncome;

        // Updated expense categories: Hotel, Driver, Miscellaneous
        const hotel_expenses = vouchers?.filter(v => v.payee_type === "Hotel")
            .reduce((sum, v) => sum + (v.total_usd || 0), 0) || 0;
        const driver_expenses_from_vouchers = vouchers?.filter(v => v.payee_type === "Driver" || v.payee_type === "Staff")
            .filter(v => !(logSheetDriverUSD > 0 && v.voucher_category === "transport"))
            .reduce((sum, v) => sum + (v.total_usd || 0), 0) || 0;

        // Use log sheet driver expenses if available (ground truth) + any other non-transport vouchers
        const driver_expenses = logSheetDriverUSD + driver_expenses_from_vouchers;
        const misc_expenses = vouchers?.filter(v =>
            v.payee_type === "Miscellaneous" || v.payee_type === "Supplier" || v.payee_type === "Other"
        ).reduce((sum, v) => sum + (v.total_usd || 0), 0) || 0;

        const total_expenses = hotel_expenses + driver_expenses + misc_expenses;
        const net_profit = customer_invoice_total - total_expenses;

        const pnlData = {
            tour_id: isReferenceLookup ? null : calculateFor,
            tour_reference: isReferenceLookup ? referenceValue : invoices?.[0]?.tour_reference,
            customer_invoice_total,
            hotel_expenses,
            driver_expenses,
            misc_expenses,
            total_income: customer_invoice_total,
            total_expenses,
            net_profit,
        };

        return NextResponse.json({
            calculated: true,
            pnl: pnlData,
            invoices: invoices || [],
            vouchers: vouchers || [],
        });
    }

    // Otherwise, list saved PNL records
    let query = supabase
        .from("pnl_records")
        .select("*")
        .order("created_at", { ascending: false });

    if (tourId) {
        query = query.eq("tour_id", tourId);
    }
    if (status) {
        query = query.eq("status", status);
    }

    const { data: records, error } = await query;

    if (error) {
        console.error("Error fetching PNL records:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ records });
}

// POST - Create or update a PNL record
export async function POST(request: Request) {
    const supabase = await createClient();

    try {
        const body = await request.json();

        // Validate input
        const validatedData = pnlRecordSchema.parse(body);

        // Check if PNL record exists for this tour
        if (validatedData.tour_id) {
            const { data: existing } = await supabase
                .from("pnl_records")
                .select("id")
                .eq("tour_id", validatedData.tour_id)
                .single();

            if (existing) {
                // Update existing record
                const { data: record, error } = await supabase
                    .from("pnl_records")
                    .update(validatedData)
                    .eq("id", existing.id)
                    .select()
                    .single();

                if (error) {
                    console.error("Error updating PNL record:", error);
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }

                return NextResponse.json({ success: true, record, updated: true });
            }
        }

        // Create new record
        const { data: record, error } = await supabase
            .from("pnl_records")
            .insert(validatedData)
            .select()
            .single();

        if (error) {
            console.error("Error creating PNL record:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, record }, { status: 201 });
    } catch (err: any) {
        console.error("Server error:", err);
        if (err.name === "ZodError") {
            return NextResponse.json(
                { error: "Validation error", details: err.errors },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// PUT - Update a PNL record
export async function PUT(request: Request) {
    const supabase = await createClient();

    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { error: "PNL record ID is required" },
                { status: 400 }
            );
        }

        const validatedData = pnlRecordSchema.partial().parse(updateData);

        const { data: record, error } = await supabase
            .from("pnl_records")
            .update(validatedData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Error updating PNL record:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, record });
    } catch (err: any) {
        console.error("Server error:", err);
        if (err.name === "ZodError") {
            return NextResponse.json(
                { error: "Validation error", details: err.errors },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
