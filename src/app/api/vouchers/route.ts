import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureTourExists } from "@/lib/operations-utils";

// GET - List all vouchers
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const inquiryId = searchParams.get("inquiry_id");
  const groupInquiryId = searchParams.get("group_inquiry_id");
  const itineraryId = searchParams.get("itinerary_id");

  let query = supabase
    .from("hotel_vouchers")
    .select(`
      *,
      inquiries (
        id,
        inquiry_number,
        first_name,
        last_name
      ),
      group_inquiries (
        id,
        inquiry_number,
        head_first_name,
        head_last_name
      )
    `)
    .order("created_at", { ascending: false });

  if (inquiryId) {
    query = query.eq("inquiry_id", inquiryId);
  }
  if (groupInquiryId) {
    query = query.eq("group_inquiry_id", groupInquiryId);
  }
  if (itineraryId) {
    query = query.eq("itinerary_id", itineraryId);
  }

  const { data: vouchers, error } = await query;

  if (error) {
    console.error("Error fetching vouchers:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(vouchers);
}

// POST - Create new voucher(s)
export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  // Handle bulk creation from itinerary
  if (body.generate_from_itinerary) {
    const { itinerary_id, inquiry_id, group_inquiry_id, guest_name, nationality, pax_adults, pax_children, hotels } = body;

    // Fetch the inquiry/group inquiry number to use as base for voucher numbers
    let baseNumber = "V";
    if (inquiry_id) {
      const { data: inq } = await supabase.from("inquiries").select("inquiry_number").eq("id", inquiry_id).single();
      if (inq) baseNumber = inq.inquiry_number;
    } else if (group_inquiry_id) {
      const { data: ginq } = await supabase.from("group_inquiries").select("inquiry_number").eq("id", group_inquiry_id).single();
      if (ginq) baseNumber = ginq.inquiry_number;
    }

    // Get count of existing vouchers to start sequencing
    const { count } = await supabase
      .from("hotel_vouchers")
      .select("*", { count: "exact", head: true })
      .match({ itinerary_id });

    const startCount = (count || 0) + 1;

    // Fetch costing sheet to pull hotel rates
    const { data: costingSheet } = await supabase
      .from("tour_costing_sheets")
      .select("accommodation_data")
      .eq("itinerary_id", itinerary_id)
      .maybeSingle();

    const costingHotels = (costingSheet?.accommodation_data as any[]) || [];

    const vouchersToCreate = hotels.map((hotel: any, index: number) => {
      // Find matching hotel in costing sheet to get rates
      // Try exact match first, then partial
      const costingMatch = costingHotels.find(ch =>
        ch.hotel?.toLowerCase().trim() === hotel.hotel_name?.toLowerCase().trim() ||
        ch.hotel?.toLowerCase().includes(hotel.hotel_name?.toLowerCase()) ||
        hotel.hotel_name?.toLowerCase().includes(ch.hotel?.toLowerCase())
      );

      return {
        itinerary_id,
        inquiry_id: inquiry_id || null,
        group_inquiry_id: group_inquiry_id || null,
        hotel_name: hotel.hotel_name,
        guest_name,
        nationality,
        pax_adults,
        pax_children,
        pax_infants: 0,
        room_type: hotel.room_type || "DBL",
        room_category: hotel.room_category || "Deluxe",
        no_of_rooms: hotel.no_of_rooms || 1,
        meal_plan: hotel.meal_plan || "BB",
        check_in_date: hotel.check_in_date,
        check_out_date: hotel.check_out_date,
        no_of_nights: hotel.no_of_nights,
        room_rate_currency: "USD", // Default to USD from costing sheet
        room_rate_sgl: costingMatch?.sgl || 0,
        room_rate_dbl: costingMatch?.dbl || 0,
        room_rate_tpl: costingMatch?.tri || 0,
        status: "draft", // Changed from 'completed' to 'draft' as per user request (manual remarks/confirmation needed)
        voucher_number: `${baseNumber}-V${(startCount + index).toString().padStart(2, '0')}`,
      };
    });


    // Ensure itinerary status is updated to 'completed' when vouchers are being generated
    await supabase
      .from("itineraries")
      .update({ status: "completed" })
      .eq("id", itinerary_id);

    const { data: vouchers, error } = await supabase
      .from("hotel_vouchers")
      .insert(vouchersToCreate)
      .select();

    if (error) {
      console.error("Error creating vouchers:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Automatically ensure a tour record exists (which makes it visible in Drivers section)
    await ensureTourExists({
      itinerary_id,
      inquiry_id,
      group_inquiry_id
    });

    return NextResponse.json({ success: true, vouchers });
  }

  // Single voucher creation
  if (!body.voucher_number) {
    // Attempt to generate a number based on inquiry
    let baseRef = "V";
    if (body.inquiry_id) {
      const { data: inq } = await supabase.from("inquiries").select("inquiry_number").eq("id", body.inquiry_id).single();
      if (inq) baseRef = inq.inquiry_number;
    } else if (body.group_inquiry_id) {
      const { data: ginq } = await supabase.from("group_inquiries").select("inquiry_number").eq("id", body.group_inquiry_id).single();
      if (ginq) baseRef = ginq.inquiry_number;
    }

    const { count } = await supabase
      .from("hotel_vouchers")
      .select("*", { count: "exact", head: true })
      .match({ itinerary_id: body.itinerary_id });

    body.voucher_number = `${baseRef}-V${((count || 0) + 1).toString().padStart(2, '0')}`;
  }

  const { data: voucher, error } = await supabase
    .from("hotel_vouchers")
    .insert(body)
    .select()
    .single();

  if (error) {
    console.error("Error creating voucher:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, voucher });
}
