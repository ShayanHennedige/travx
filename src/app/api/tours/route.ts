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

    return NextResponse.json({ success: true, tour }, { status: 201 });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
