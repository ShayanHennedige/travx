import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const assignmentSchema = z.object({
  tour_id: z.string().min(1, "Tour ID is required"),
  tour_guide_id: z.string().min(1, "Tour Guide ID is required"),
});

const unassignSchema = z.object({
  tour_id: z.string().min(1, "Tour ID is required"),
});

// POST - Assign guide to tour
export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const result = assignmentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      );
    }

    const { tour_id, tour_guide_id } = result.data;

    // First, cancel any existing active assignment for this tour
    await supabase
      .from("tour_guide_assignments")
      .update({
        assignment_status: "cancelled",
        unassigned_at: new Date().toISOString(),
      })
      .eq("tour_id", tour_id)
      .eq("assignment_status", "active");

    // Now create new assignment
    const { data: assignment, error } = await supabase
      .from("tour_guide_assignments")
      .insert({
        tour_id,
        tour_guide_id,
        assignment_status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Error assigning guide:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, assignment }, { status: 201 });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Unassign guide from tour
export async function DELETE(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const result = unassignSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      );
    }

    const { tour_id } = result.data;

    const { error } = await supabase
      .from("tour_guide_assignments")
      .update({
        assignment_status: "cancelled",
        unassigned_at: new Date().toISOString(),
      })
      .eq("tour_id", tour_id)
      .eq("assignment_status", "active");

    if (error) {
      console.error("Error unassigning guide:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
