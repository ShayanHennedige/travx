import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { costingSheetSchema } from "@/lib/validations/costingSheet";

// GET - Retrieve costing sheet by itinerary_id
export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const itineraryId = searchParams.get("itinerary_id");

    if (!itineraryId) {
        return NextResponse.json(
            { error: "itinerary_id is required" },
            { status: 400 }
        );
    }

    const { data: costingSheet, error } = await supabase
        .from("tour_costing_sheets")
        .select("*")
        .eq("itinerary_id", itineraryId)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            // No rows returned
            return NextResponse.json({ costingSheet: null });
        }
        console.error("Error fetching costing sheet:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ costingSheet });
}

// POST - Create new costing sheet
export async function POST(request: Request) {
    const supabase = await createClient();

    try {
        const body = await request.json();

        // Validate input
        const validatedData = costingSheetSchema.parse(body);

        // Check if costing sheet already exists for this itinerary
        const { data: existing } = await supabase
            .from("tour_costing_sheets")
            .select("id")
            .eq("itinerary_id", validatedData.itinerary_id)
            .single();

        if (existing) {
            return NextResponse.json(
                { error: "Costing sheet already exists for this itinerary" },
                { status: 409 }
            );
        }

        // Get current user
        const {
            data: { user },
        } = await supabase.auth.getUser();

        // Create costing sheet
        const { data: costingSheet, error } = await supabase
            .from("tour_costing_sheets")
            .insert({
                ...validatedData,
                created_by: user?.id,
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating costing sheet:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, costingSheet }, { status: 201 });
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

// PUT - Update existing costing sheet
export async function PUT(request: Request) {
    const supabase = await createClient();

    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Costing sheet ID is required" },
                { status: 400 }
            );
        }

        // Validate input (partial update)
        const validatedData = costingSheetSchema.partial().parse(updateData);

        // Update costing sheet
        const { data: costingSheet, error } = await supabase
            .from("tour_costing_sheets")
            .update(validatedData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Error updating costing sheet:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, costingSheet });
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
