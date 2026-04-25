import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureTourExists } from "@/lib/operations-utils";

type ItineraryHotelInput = {
  hotel_name: string;
  check_in_date?: string;
  check_out_date?: string;
  no_of_nights?: number;
  room_type?: string;
  room_category?: string;
  no_of_rooms?: number;
  meal_plan?: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function normalizeHotelName(name: string | undefined | null): string {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function parseIsoDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(`${dateStr}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function calculateNights(checkIn: string | undefined, checkOut: string | undefined, fallback: number | undefined): number {
  const inDate = parseIsoDate(checkIn);
  const outDate = parseIsoDate(checkOut);
  if (inDate && outDate) {
    const diff = Math.round((outDate.getTime() - inDate.getTime()) / MS_PER_DAY);
    if (diff > 0) return diff;
  }
  return fallback && fallback > 0 ? fallback : 1;
}

function maxDate(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b;
  if (!b) return a;
  const aDate = parseIsoDate(a);
  const bDate = parseIsoDate(b);
  if (!aDate || !bDate) return b;
  return aDate.getTime() >= bDate.getTime() ? a : b;
}

function groupHotelsByContinuousStay(hotels: ItineraryHotelInput[]): ItineraryHotelInput[] {
  if (!Array.isArray(hotels) || hotels.length === 0) return [];

  const sorted = hotels
    .map((hotel, originalIndex) => ({ hotel, originalIndex }))
    .sort((a, b) => {
      const aDate = parseIsoDate(a.hotel.check_in_date);
      const bDate = parseIsoDate(b.hotel.check_in_date);
      if (aDate && bDate) return aDate.getTime() - bDate.getTime();
      if (aDate) return -1;
      if (bDate) return 1;
      return a.originalIndex - b.originalIndex;
    });

  const grouped: ItineraryHotelInput[] = [];

  for (const { hotel } of sorted) {
    const current: ItineraryHotelInput = {
      ...hotel,
      no_of_nights: calculateNights(hotel.check_in_date, hotel.check_out_date, hotel.no_of_nights),
    };

    const previous = grouped[grouped.length - 1];
    const sameHotel = previous && normalizeHotelName(previous.hotel_name) === normalizeHotelName(current.hotel_name);
    const continuousStay =
      sameHotel &&
      previous.check_out_date &&
      current.check_in_date &&
      previous.check_out_date === current.check_in_date;

    if (continuousStay) {
      previous.check_out_date = maxDate(previous.check_out_date, current.check_out_date);
      previous.no_of_nights = calculateNights(previous.check_in_date, previous.check_out_date, (previous.no_of_nights || 0) + (current.no_of_nights || 0));
      continue;
    }

    grouped.push(current);
  }

  return grouped;
}

async function resolveGuestNameFromInquiry(
  supabase: any,
  inquiryId?: string | null,
  groupInquiryId?: string | null,
  fallback?: string
): Promise<string> {
  if (inquiryId) {
    const { data: inquiry } = await supabase
      .from("inquiries")
      .select("first_name, last_name")
      .eq("id", inquiryId)
      .maybeSingle();

    const inquiryName = `${inquiry?.first_name || ""} ${inquiry?.last_name || ""}`.trim();
    if (inquiryName) return inquiryName;
  }

  if (groupInquiryId) {
    const { data: groupInquiry } = await supabase
      .from("group_inquiries")
      .select("head_first_name, head_last_name")
      .eq("id", groupInquiryId)
      .maybeSingle();

    const headName = `${groupInquiry?.head_first_name || ""} ${groupInquiry?.head_last_name || ""}`.trim();
    if (headName) return headName;
  }

  return (fallback || "Guest").trim() || "Guest";
}

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

    // Filter out hotels with no valid name (e.g. "N/A" placeholders) before grouping
    const validHotels = ((hotels || []) as ItineraryHotelInput[]).filter(h => {
      const name = h.hotel_name?.trim().toLowerCase();
      return name && name !== "n/a" && name !== "tbd" && name !== "na";
    });

    const groupedHotels = groupHotelsByContinuousStay(validHotels);
    const resolvedGuestName = await resolveGuestNameFromInquiry(supabase, inquiry_id, group_inquiry_id, guest_name);

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

    // Fetch room counts from the linked inquiry so each voucher shows all room types
    let inquiryRooms = { rooms_sgl: 0, rooms_dbl: 0, rooms_tpl: 0, rooms_qtpl: 0 };
    if (inquiry_id) {
      const { data: inq } = await supabase
        .from("inquiries")
        .select("rooms_sgl, rooms_dbl, rooms_tpl, rooms_qtpl")
        .eq("id", inquiry_id)
        .maybeSingle();
      if (inq) {
        inquiryRooms = {
          rooms_sgl: inq.rooms_sgl || 0,
          rooms_dbl: inq.rooms_dbl || 0,
          rooms_tpl: inq.rooms_tpl || 0,
          rooms_qtpl: inq.rooms_qtpl || 0,
        };
      }
    } else if (group_inquiry_id) {
      const { data: ginq } = await supabase
        .from("group_inquiries")
        .select("rooms_sgl, rooms_dbl, rooms_tpl, rooms_qtpl")
        .eq("id", group_inquiry_id)
        .maybeSingle();
      if (ginq) {
        inquiryRooms = {
          rooms_sgl: ginq.rooms_sgl || 0,
          rooms_dbl: ginq.rooms_dbl || 0,
          rooms_tpl: ginq.rooms_tpl || 0,
          rooms_qtpl: ginq.rooms_qtpl || 0,
        };
      }
    }

    const vouchersToCreate = groupedHotels.map((hotel: any, index: number) => {
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
        guest_name: resolvedGuestName,
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
        room_rate_qtpl: costingMatch?.qtpl || 0,
        rooms_sgl: inquiryRooms.rooms_sgl,
        rooms_dbl: inquiryRooms.rooms_dbl,
        rooms_tpl: inquiryRooms.rooms_tpl,
        rooms_qtpl: inquiryRooms.rooms_qtpl,
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

  body.guest_name = await resolveGuestNameFromInquiry(
    supabase,
    body.inquiry_id || null,
    body.group_inquiry_id || null,
    body.guest_name
  );

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
