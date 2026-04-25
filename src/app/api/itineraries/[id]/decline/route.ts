import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APP_CONFIG } from "@/lib/config";

// POST - Decline an itinerary (client decided not to proceed)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  try {
    const body = await request.json();
    const { reason, passcode } = body;

    // Verify passcode
    if (!passcode || passcode !== APP_CONFIG.ADMIN_PASSCODE) {
      return NextResponse.json(
        { error: "Invalid approval passcode" },
        { status: 403 }
      );
    }

    // 1. Update itinerary status to 'declined'
    const { data: itinerary, error: itinError } = await supabase
      .from("itineraries")
      .update({
        status: "declined",
        decline_reason: reason || null,
        declined_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, inquiry_id, group_inquiry_id")
      .single();

    if (itinError) {
      console.error("Error declining itinerary:", itinError);
      return NextResponse.json({ error: itinError.message }, { status: 500 });
    }

    // 2. Update the linked inquiry status to 'declined'
    if (itinerary.inquiry_id) {
      await supabase
        .from("inquiries")
        .update({ status: "declined" })
        .eq("id", itinerary.inquiry_id);
    } else if (itinerary.group_inquiry_id) {
      await supabase
        .from("group_inquiries")
        .update({ status: "declined" })
        .eq("id", itinerary.group_inquiry_id);
    }

    return NextResponse.json({ success: true, itinerary }, { status: 200 });
  } catch (err) {
    console.error("Server error declining tour:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
