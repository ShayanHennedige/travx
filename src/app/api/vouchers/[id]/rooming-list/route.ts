import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await context.params;

  try {
    const body = await request.json();
    const { assignments, interconnections, tourGuide } = body;

    if (!Array.isArray(assignments)) {
      return NextResponse.json(
        { error: "assignments must be an array" },
        { status: 400 }
      );
    }

    // Prepare JSON object to save into hotel_vouchers.rooming_list_data
    const roomingListData = {
      assignments,
      interconnections,
      tourGuide: tourGuide && typeof tourGuide === "object" ? tourGuide : null,
    };

    const { error } = await supabase
      .from("hotel_vouchers")
      .update({
        rooming_list_data: roomingListData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error saving rooming list data to voucher:", error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating voucher rooming list:", err);
    return NextResponse.json(
      { error: "Failed to update voucher room assignments" },
      { status: 500 }
    );
  }
}
