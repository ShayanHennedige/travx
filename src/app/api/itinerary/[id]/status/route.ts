import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PUT - Update itinerary status
export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { status } = body;

    if (!status || !["new", "in_progress", "completed"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'new', 'in_progress', or 'completed'" },
        { status: 400 }
      );
    }

    const { data: itinerary, error } = await supabase
      .from("itineraries")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating itinerary status:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, itinerary });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
