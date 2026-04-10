import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const languages = ["English", "German", "French", "Spanish", "Italian", "Russian", "Japanese", "Chinese", "Arabic"] as const;

const tourGuideSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone_number: z.string().min(1, "Phone number is required"),
  language: z.enum(languages, { errorMap: () => ({ message: "Invalid language" }) }),
  is_active: z.boolean().optional().default(true),
});

// GET - List all tour guides
export async function GET() {
  const supabase = await createClient();

  const { data: guides, error } = await supabase
    .from("tour_guides")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching tour guides:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ guides });
}

// POST - Create new tour guide
export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const result = tourGuideSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      );
    }

    const { data: guide, error } = await supabase
      .from("tour_guides")
      .insert(result.data)
      .select()
      .single();

    if (error) {
      console.error("Error creating tour guide:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, guide }, { status: 201 });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
