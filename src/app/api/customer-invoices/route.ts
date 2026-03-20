import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { customerInvoiceSchema, calculateInvoiceTotals } from "@/lib/validations/invoice";

// GET - List all customer invoices with optional filtering
export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const tourId = searchParams.get("tour_id");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
        .from("customer_invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (tourId) {
        query = query.eq("tour_id", tourId);
    }
    if (status) {
        query = query.eq("status", status);
    }

    const { data: invoices, error, count } = await query;

    if (error) {
        console.error("Error fetching customer invoices:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invoices, count });
}

// POST - Create a new customer invoice
export async function POST(request: Request) {
    const supabase = await createClient();

    try {
        const body = await request.json();

        // Validate input
        const validatedData = customerInvoiceSchema.parse(body);

        // Calculate totals
        const totals = calculateInvoiceTotals(validatedData);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        // Generate invoice_no server-side (format YYYY/NNN) in case the DB trigger is not deployed
        const year = new Date().getFullYear().toString();
        const { data: existingInvoices } = await supabase
            .from("customer_invoices")
            .select("invoice_no")
            .like("invoice_no", `${year}/%`);

        let nextNumber = 101;
        if (existingInvoices && existingInvoices.length > 0) {
            const maxNum = existingInvoices.reduce((max, inv) => {
                const parts = (inv.invoice_no || "").split("/");
                const num = parseInt(parts[1] || "0", 10);
                return isNaN(num) ? max : Math.max(max, num);
            }, 100);
            nextNumber = maxNum + 1;
        }
        const invoice_no = `${year}/${nextNumber}`;

        // Create invoice
        const { data: invoice, error } = await supabase
            .from("customer_invoices")
            .insert({
                ...validatedData,
                ...totals,
                invoice_no,
                created_by: user?.id,
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating customer invoice:", error);

            if (error.code === '23503') {
                return NextResponse.json({
                    error: "Foreign key violation: The linked Tour or Itinerary does not exist in the database.",
                    details: error.message
                }, { status: 400 });
            }

            if (error.message?.includes("package_description") || error.message?.includes("itinerary_id")) {
                return NextResponse.json({
                    error: "Your database schema is out of date. Please run the migration file 'migrations/add_invoices_and_pnl.sql' in your Supabase SQL Editor.",
                    details: error.message
                }, { status: 500 });
            }

            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, invoice }, { status: 201 });
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

// PUT - Update a customer invoice
export async function PUT(request: Request) {
    const supabase = await createClient();

    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Invoice ID is required" },
                { status: 400 }
            );
        }

        // 1. Fetch the current invoice record
        const { data: existingInvoice, error: fetchError } = await supabase
            .from("customer_invoices")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !existingInvoice) {
            console.error("Error fetching existing invoice:", fetchError);
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        // 2. Validate input and merge with existing data
        const validatedUpdate = customerInvoiceSchema.partial().parse(updateData);

        // Construct the full object for recalculation
        const mergedData = {
            ...existingInvoice,
            ...validatedUpdate
        };

        // 3. Recalculate totals based on merged data
        // Only recalculate if rates, quantities or financial fields were explicitly provided for update
        const totalsKeys = [
            "rate_sgl", "rate_dbl", "rate_tpl", "rate_qud",
            "qty_sgl", "qty_dbl", "qty_tpl", "qty_qud",
            "subtotal", "bank_charges", "tax_percentage", "paid_amount"
        ];

        const hasFinancialChanges = Object.keys(validatedUpdate).some(key => totalsKeys.includes(key));

        const totals = hasFinancialChanges
            ? calculateInvoiceTotals(mergedData)
            : {};

        // 4. Update the record
        const { data: updatedInvoice, error: updateError } = await supabase
            .from("customer_invoices")
            .update({
                ...validatedUpdate,
                ...totals
            })
            .eq("id", id)
            .select()
            .single();

        if (updateError) {
            console.error("Error updating customer invoice:", updateError);
            if (updateError.message?.includes("package_description")) {
                return NextResponse.json({
                    error: "Database column 'package_description' is missing. Please run the migration 'migrations/add_package_description_to_invoices.sql' in Supabase.",
                    details: updateError.message
                }, { status: 500 });
            }
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, invoice: updatedInvoice });
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

// DELETE - Delete a customer invoice
export async function DELETE(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json(
            { error: "Invoice ID is required" },
            { status: 400 }
        );
    }

    const { error } = await supabase
        .from("customer_invoices")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting customer invoice:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
