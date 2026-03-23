import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pnlRecordSchema, calculatePnlSummary } from "@/lib/validations/invoice";

// GET - Get PNL records with optional filtering or calculate for a tour
export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const tourId = searchParams.get("tour_id");
    const calculateFor = searchParams.get("calculate_for"); // Tour ID to calculate fresh PNL
    const status = searchParams.get("status");

    // If calculate_for is provided, calculate PNL from linked invoices/vouchers
    if (calculateFor) {
        // Get income from customer invoices (confirmed or paid)
        const { data: invoices } = await supabase
            .from("customer_invoices")
            .select("total_amount, status")
            .eq("tour_id", calculateFor)
            .in("status", ["confirmed", "paid"]);

        // Get expenses from payment vouchers (all linked to tour)
        const { data: vouchers } = await supabase
            .from("payment_vouchers")
            .select("total_usd, payee_type")
            .eq("tour_id", calculateFor);

        const customer_invoice_total = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

        // Updated expense categories: Hotel, Driver, Miscellaneous
        const hotel_expenses = vouchers?.filter(v => v.payee_type === "Hotel")
            .reduce((sum, v) => sum + (v.total_usd || 0), 0) || 0;
        const driver_expenses = vouchers?.filter(v => v.payee_type === "Driver" || v.payee_type === "Staff")
            .reduce((sum, v) => sum + (v.total_usd || 0), 0) || 0;
        const misc_expenses = vouchers?.filter(v =>
            v.payee_type === "Miscellaneous" || v.payee_type === "Supplier" || v.payee_type === "Other"
        ).reduce((sum, v) => sum + (v.total_usd || 0), 0) || 0;

        const total_expenses = hotel_expenses + driver_expenses + misc_expenses;
        const net_profit = customer_invoice_total - total_expenses;

        const pnlData = {
            tour_id: calculateFor,
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
