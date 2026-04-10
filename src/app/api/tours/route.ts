import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - List all active tours (confirmed itineraries)
export async function GET() {
  const supabase = await createClient();

  const { data: tours, error } = await supabase
    .from("tours")
    .select(`
      *,
      drivers (
        id,
        name,
        contact_number,
        vehicle_type,
        vehicle_number
      ),
      itineraries (
        id,
        content,
        inquiry_id,
        group_inquiry_id
      )
    `)
    .order("start_date", { ascending: true });

  if (error) {
    console.error("Error fetching tours:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tours });
}

// POST - Create a tour from a finalized itinerary
export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const {
      itinerary_id,
      inquiry_id,
      group_inquiry_id,
      client_name,
      start_date,
      end_date,
      pax_adults,
      pax_children,
      driver_id,
      notes,
    } = body;

    // Validate prerequisites before finalizing tour
    // 1. Check if costing sheet exists
    const { data: costingSheet, error: costingError } = await supabase
      .from("tour_costing_sheets")
      .select("id, status")
      .eq("itinerary_id", itinerary_id)
      .single();

    if (costingError || !costingSheet) {
      return NextResponse.json(
        {
          error: "Costing sheet is required before finalizing tour",
          missingPrerequisites: ["costing_sheet"]
        },
        { status: 400 }
      );
    }

    // 2. [REMOVED] Check if vouchers exist - Vouchers are now generated AFTER tour finalization


    // Check for existing tour to prevent duplicates
    const { data: existingTour } = await supabase
      .from("tours")
      .select("id")
      .eq("itinerary_id", itinerary_id)
      .maybeSingle();

    if (existingTour) {
      return NextResponse.json({
        success: true,
        tour: existingTour,
        message: "Tour already exists"
      }, { status: 200 });
    }

    const { data: tour, error } = await supabase
      .from("tours")
      .insert({
        itinerary_id,
        inquiry_id: inquiry_id || null,
        group_inquiry_id: group_inquiry_id || null,
        client_name,
        start_date,
        end_date,
        pax_adults: pax_adults || 0,
        pax_children: pax_children || 0,
        driver_id: driver_id || null,
        notes: notes || null,
        status: "upcoming",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating tour:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Automatically update inquiry/group_inquiry status to 'confirmed'
    if (inquiry_id) {
      await supabase
        .from("inquiries")
        .update({ status: "confirmed" })
        .eq("id", inquiry_id);
    } else if (group_inquiry_id) {
      await supabase
        .from("group_inquiries")
        .update({ status: "confirmed" })
        .eq("id", group_inquiry_id);
    }

    return NextResponse.json({ success: true, tour }, { status: 201 });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
