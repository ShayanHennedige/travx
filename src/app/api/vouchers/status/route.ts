import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PUT - Update voucher status for all vouchers of an inquiry
export async function PUT(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { status, inquiry_id, group_inquiry_id } = body;

    if (!status || !["new", "in_progress", "completed"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'new', 'in_progress', or 'completed'" },
        { status: 400 }
      );
    }

    if (!inquiry_id && !group_inquiry_id) {
      return NextResponse.json(
        { error: "Either inquiry_id or group_inquiry_id is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("hotel_vouchers")
      .update({ status, updated_at: new Date().toISOString() });

    if (inquiry_id) {
      query = query.eq("inquiry_id", inquiry_id);
    } else if (group_inquiry_id) {
      query = query.eq("group_inquiry_id", group_inquiry_id);
    }

    const { data: vouchers, error } = await query.select();

    if (error) {
      console.error("Error updating voucher status:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, vouchers });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
