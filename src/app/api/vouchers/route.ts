import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const vouchersToCreate = hotels.map((hotel: {
      hotel_name: string;
      check_in_date: string;
      check_out_date: string;
      no_of_nights: number;
      room_type?: string;
      room_category?: string;
      no_of_rooms?: number;
      meal_plan?: string;
    }) => ({
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
      status: "draft",
    }));

    const { data: vouchers, error } = await supabase
      .from("hotel_vouchers")
      .insert(vouchersToCreate)
      .select();

    if (error) {
      console.error("Error creating vouchers:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, vouchers });
  }

  // Single voucher creation
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
