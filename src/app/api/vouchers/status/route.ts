import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureTourExists } from "@/lib/operations-utils";

export async function PUT(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { ids, status, inquiry_id, group_inquiry_id, itinerary_id } = body;

  try {
    let query = supabase.from("hotel_vouchers").update({ status });

    if (ids && Array.isArray(ids) && ids.length > 0) {
      query = query.in("id", ids);
    } else if (inquiry_id) {
      query = query.eq("inquiry_id", inquiry_id);
    } else if (group_inquiry_id) {
      query = query.eq("group_inquiry_id", group_inquiry_id);
    } else if (itinerary_id) {
      query = query.eq("itinerary_id", itinerary_id);
    } else {
      return NextResponse.json(
        { error: "Missing identifying parameters (ids, inquiry_id, etc.)" },
        { status: 400 }
      );
    }

    const { data: updatedVouchers, error } = await query.select();

    if (error) {
      console.error("Error updating voucher statuses:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Automatically ensure a tour record exists if status is completed/confirmed
    if ((status === "completed" || status === "confirmed") && updatedVouchers.length > 0) {
      const v = updatedVouchers[0];
      await ensureTourExists({
        itinerary_id: v.itinerary_id,
        inquiry_id: v.inquiry_id,
        group_inquiry_id: v.group_inquiry_id
      });
    }

    return NextResponse.json({ success: true, count: updatedVouchers.length });
  } catch (error: any) {
    console.error("Server error updating vouchers:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
