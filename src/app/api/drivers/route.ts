import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const driverSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contact_number: z.string().min(1, "Contact number is required"),
  vehicle_type: z.string().optional().nullable(),
  vehicle_number: z.string().optional().nullable(),
  languages: z.array(z.string()).optional().default([]),
});

// GET - List all drivers
export async function GET() {
  const supabase = await createClient();

  const { data: drivers, error } = await supabase
    .from("drivers")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching drivers:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ drivers });
}

// POST - Create new driver
export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const result = driverSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      );
    }

    const { data: driver, error } = await supabase
      .from("drivers")
      .insert(result.data)
      .select()
      .single();

    if (error) {
      console.error("Error creating driver:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, driver }, { status: 201 });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
