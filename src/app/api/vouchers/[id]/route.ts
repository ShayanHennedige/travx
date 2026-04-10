import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single voucher
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: voucher, error } = await supabase
    .from("hotel_vouchers")
    .select(`
      *,
      inquiries (
        id,
        inquiry_number,
        first_name,
        last_name,
        client_email,
        contact_number,
        country
      ),
      group_inquiries (
        id,
        inquiry_number,
        head_first_name,
        head_last_name,
        client_email,
        contact_number,
        country
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching voucher:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(voucher);
}

// PUT - Update voucher
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  
  try {
    const body = await request.json();

    const optionalStringFields = [
      "arrival_time",
      "departure_time",
      "confirmed_by",
      "confirmed_date",
      "booked_by",
      "booked_date",
      "remarks",
      "nationality",
      "room_rate_currency",
    ] as const;

    const numericFields = [
      "pax_adults",
      "pax_children",
      "pax_infants",
      "no_of_rooms",
      "no_of_nights",
      "room_rate_sgl",
      "room_rate_dbl",
      "room_rate_tpl",
    ] as const;

    // Remove fields that shouldn't be updated directly
    const {
      id: _id,
      created_at,
      inquiries,
      group_inquiries,
      ...updateData
    } = body;

    for (const field of optionalStringFields) {
      if (field in updateData && updateData[field] === "") {
        updateData[field] = null;
      }
    }

    for (const field of numericFields) {
      if (!(field in updateData)) continue;
      const value = updateData[field];
      if (value === "" || value === null || value === undefined) {
        updateData[field] = null;
        continue;
      }
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        updateData[field] = parsed;
      }
    }

    const { data: voucher, error } = await supabase
      .from("hotel_vouchers")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating voucher:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, voucher });
  } catch (err) {
    console.error("Error in PUT request:", err);
    return NextResponse.json({ error: "Failed to update voucher" }, { status: 500 });
  }
}

// DELETE - Delete voucher
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("hotel_vouchers")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting voucher:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
