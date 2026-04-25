import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APP_CONFIG } from "@/lib/config";

// POST - Reactivate a declined itinerary (requires passcode)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  try {
    const body = await request.json();
    const { passcode } = body;

    // Verify passcode
    if (!passcode || passcode !== APP_CONFIG.ADMIN_PASSCODE) {
      return NextResponse.json(
        { error: "Invalid approval passcode" },
        { status: 403 }
      );
    }

    // 1. Check that the itinerary is actually declined
    const { data: existing, error: fetchError } = await supabase
      .from("itineraries")
      .select("id, status, inquiry_id, group_inquiry_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Itinerary not found" }, { status: 404 });
    }

    if (existing.status !== "declined") {
      return NextResponse.json(
        { error: "Itinerary is not in declined status" },
        { status: 400 }
      );
    }

    // 2. Reactivate the itinerary
    const { error: updateError } = await supabase
      .from("itineraries")
      .update({
        status: "in_progress",
        decline_reason: null,
        declined_at: null,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error reactivating itinerary:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. Reactivate the linked inquiry
    if (existing.inquiry_id) {
      await supabase
        .from("inquiries")
        .update({ status: "in_progress" })
        .eq("id", existing.inquiry_id);
    } else if (existing.group_inquiry_id) {
      await supabase
        .from("group_inquiries")
        .update({ status: "in_progress" })
        .eq("id", existing.group_inquiry_id);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Server error reactivating tour:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
