import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - List all active tours (confirmed itineraries)
export async function GET() {
  const supabase = await createClient();

  const { data: tours, error } = await supabase
    .from("tours")
    .select(`
      *,
      inquiries (
        id,
        first_name,
        last_name
      ),
      group_inquiries (
        id,
        head_first_name,
        head_last_name
      ),
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

  const normalizedTours = (tours || []).map((tour: any) => {
    const inquiry = Array.isArray(tour.inquiries) ? tour.inquiries[0] : tour.inquiries;
    const groupInquiry = Array.isArray(tour.group_inquiries) ? tour.group_inquiries[0] : tour.group_inquiries;

    const inquiryName = inquiry
      ? `${inquiry.first_name || ""} ${inquiry.last_name || ""}`.trim()
      : "";
    const groupHeadName = groupInquiry
      ? `${groupInquiry.head_first_name || ""} ${groupInquiry.head_last_name || ""}`.trim()
      : "";

    return {
      ...tour,
      client_name: inquiryName || groupHeadName || tour.client_name,
    };
  });

  return NextResponse.json({ tours: normalizedTours });
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
      arrival_flight_no,
      arrival_time,
      departure_flight_no,
      departure_time,
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

    let resolvedClientName = (client_name || "").trim();
    if (inquiry_id) {
      const { data: inquiry } = await supabase
        .from("inquiries")
        .select("first_name, last_name")
        .eq("id", inquiry_id)
        .maybeSingle();

      const inquiryName = `${inquiry?.first_name || ""} ${inquiry?.last_name || ""}`.trim();
      if (inquiryName) resolvedClientName = inquiryName;
    } else if (group_inquiry_id) {
      const { data: groupInquiry } = await supabase
        .from("group_inquiries")
        .select("head_first_name, head_last_name")
        .eq("id", group_inquiry_id)
        .maybeSingle();

      const headName = `${groupInquiry?.head_first_name || ""} ${groupInquiry?.head_last_name || ""}`.trim();
      if (headName) resolvedClientName = headName;
    }

    const { data: tour, error } = await supabase
      .from("tours")
      .insert({
        itinerary_id,
        inquiry_id: inquiry_id || null,
        group_inquiry_id: group_inquiry_id || null,
        client_name: resolvedClientName || null,
        start_date,
        end_date,
        pax_adults: pax_adults || 0,
        pax_children: pax_children || 0,
        driver_id: driver_id || null,
        notes: notes || null,
        arrival_flight_no: arrival_flight_no || null,
        arrival_time: arrival_time || null,
        departure_flight_no: departure_flight_no || null,
        departure_time: departure_time || null,
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
