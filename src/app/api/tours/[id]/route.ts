import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single tour with details
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tour, error } = await supabase
    .from("tours")
    .select(`
      *,
      drivers (
        id,
        name,
        contact_number,
        vehicle_type,
        vehicle_number,
        languages
      ),
      itineraries (
        id,
        content,
        inquiry_id,
        group_inquiry_id
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching tour:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tour });
}

// PUT - Update tour (assign driver, update status, etc.)
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { id: _, created_at, drivers, itineraries, ...updateData } = body;

    // Get current tour to check previous driver_id
    const { data: currentTour } = await supabase
      .from("tours")
      .select("driver_id")
      .eq("id", id)
      .single();

    const { data: tour, error } = await supabase
      .from("tours")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating tour:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If driver is being assigned, update driver status
    // If driver is being unassigned (driver_id is null), handle accordingly
    if (updateData.driver_id) {
      // Driver is being assigned
      await supabase
        .from("drivers")
        .update({ status: "on_tour" })
        .eq("id", updateData.driver_id);
    } else if (updateData.driver_id === null && currentTour?.driver_id) {
      // Driver is being unassigned - clear driver status if needed
      // Note: This assumes drivers table has a status field, adjust if needed
      await supabase
        .from("drivers")
        .update({ status: null })
        .eq("id", currentTour.driver_id);
    }

    return NextResponse.json({ success: true, tour });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete tour
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("tours")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting tour:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
