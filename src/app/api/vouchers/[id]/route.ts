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

  const inquiry = Array.isArray((voucher as any).inquiries) ? (voucher as any).inquiries[0] : (voucher as any).inquiries;
  const groupInquiry = Array.isArray((voucher as any).group_inquiries) ? (voucher as any).group_inquiries[0] : (voucher as any).group_inquiries;
  const inquiryName = inquiry ? `${inquiry.first_name || ""} ${inquiry.last_name || ""}`.trim() : "";
  const groupHeadName = groupInquiry ? `${groupInquiry.head_first_name || ""} ${groupInquiry.head_last_name || ""}`.trim() : "";

  return NextResponse.json({
    ...voucher,
    guest_name: inquiryName || groupHeadName || (voucher as any).guest_name,
  });
}

// PUT - Update voucher
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  
  try {
    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    const {
      id: _id,
      created_at,
      inquiries,
      group_inquiries,
      ...updateData
    } = body;

    // Sanitize data before update
    const sanitizedData = { ...updateData };

    // Handle numeric fields
    const numericFields = [
      "pax_adults", "pax_children", "pax_infants",
      "no_of_rooms", "no_of_nights",
      "room_rate_sgl", "room_rate_dbl", "room_rate_tpl", "room_rate_qtpl",
      "rooms_sgl", "rooms_dbl", "rooms_tpl", "rooms_qtpl"
    ];

    numericFields.forEach(field => {
      if (sanitizedData[field] === "") {
        sanitizedData[field] = null;
      } else if (typeof sanitizedData[field] === "string") {
        const val = parseFloat(sanitizedData[field]);
        sanitizedData[field] = isNaN(val) ? null : val;
      }
    });

    // Handle date fields
    const dateFields = ["confirmed_date", "booked_date", "check_in_date", "check_out_date"];
    dateFields.forEach(field => {
        if (sanitizedData[field] === "") {
            sanitizedData[field] = null;
        }
    });

    const { data: voucher, error } = await supabase
      .from("hotel_vouchers")
      .update({
        ...sanitizedData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating voucher:", error);
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
