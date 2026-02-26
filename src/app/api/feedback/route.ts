import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { feedbackSchema } from "@/lib/validations/feedback";

// POST - Submit feedback
export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const result = feedbackSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      );
    }

    // Extract token_id if present
    const { token_id, ...feedbackData } = result.data;

    const { data: feedback, error } = await supabase
      .from("feedback")
      .insert({
        ...feedbackData,
        driver_id: (result.data as any).driver_id || null,
        vehicle_id: (result.data as any).vehicle_id || null,
        token_id: token_id || null,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating feedback:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mark token as used if token_id is provided
    if (token_id) {
      await supabase
        .from("feedback_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("id", token_id);
    }

    return NextResponse.json({ success: true, feedback }, { status: 201 });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - List feedback (for analytics)
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  // Build query
  let query = supabase
    .from("feedback")
    .select("*")
    .order("submitted_at", { ascending: false });

  // Apply filters
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const country = searchParams.get("country");
  const ageGroup = searchParams.get("age_group");
  const tourId = searchParams.get("tour_id");

  if (dateFrom) {
    query = query.gte("submitted_at", dateFrom);
  }
  if (dateTo) {
    query = query.lte("submitted_at", dateTo);
  }
  if (country) {
    query = query.eq("country", country);
  }
  if (ageGroup) {
    query = query.eq("age_group", ageGroup);
  }
  if (tourId) {
    query = query.eq("tour_id", tourId);
  }

  const { data: feedback, error } = await query;

  if (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ feedback });
}
