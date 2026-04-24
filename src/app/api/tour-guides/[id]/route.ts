import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const languages = ["English", "German", "French", "Spanish", "Italian", "Russian", "Japanese", "Chinese", "Arabic"] as const;

const tourGuideUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  phone_number: z.string().min(1, "Phone number is required").optional(),
  language: z.enum(languages).optional(),
  is_active: z.boolean().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid("Invalid tour guide ID"),
});

// GET - Fetch single tour guide
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const parsedParams = idParamSchema.safeParse(await params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { error: parsedParams.error.issues[0]?.message ?? "Invalid tour guide ID" },
      { status: 400 }
    );
  }

  const { id } = parsedParams.data;

  const { data: guide, error } = await supabase
    .from("tour_guides")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: "Guide not found" }, { status: 404 });
  }

  return NextResponse.json({ guide });
}

// PUT - Update tour guide
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const parsedParams = idParamSchema.safeParse(await params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { error: parsedParams.error.issues[0]?.message ?? "Invalid tour guide ID" },
      { status: 400 }
    );
  }

  const { id } = parsedParams.data;

  try {
    const body = await request.json();
    const result = tourGuideUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("tour_guides")
      .update(result.data)
      .eq("id", id);

    if (updateError) {
      console.error("Error updating tour guide:", {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
      });
      return NextResponse.json(
        {
          error: updateError.message || "Failed to update tour guide",
          code: updateError.code,
        },
        { status: 500 }
      );
    }

    const guide = {
      id,
      ...result.data,
    };

    return NextResponse.json({ success: true, guide });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete tour guide
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const parsedParams = idParamSchema.safeParse(await params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { error: parsedParams.error.issues[0]?.message ?? "Invalid tour guide ID" },
      { status: 400 }
    );
  }

  const { id } = parsedParams.data;

  try {
    const { error } = await supabase
      .from("tour_guides")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting tour guide:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
