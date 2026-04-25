import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Create amendment for a voucher
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  // Get the original voucher
  const { data: originalVoucher, error: fetchError } = await supabase
    .from("hotel_vouchers")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !originalVoucher) {
    return NextResponse.json({ error: "Original voucher not found" }, { status: 404 });
  }

  let resolvedGuestName = originalVoucher.guest_name || "Guest";
  if (originalVoucher.inquiry_id) {
    const { data: inquiry } = await supabase
      .from("inquiries")
      .select("first_name, last_name")
      .eq("id", originalVoucher.inquiry_id)
      .maybeSingle();
    const inquiryName = `${inquiry?.first_name || ""} ${inquiry?.last_name || ""}`.trim();
    if (inquiryName) resolvedGuestName = inquiryName;
  } else if (originalVoucher.group_inquiry_id) {
    const { data: groupInquiry } = await supabase
      .from("group_inquiries")
      .select("head_first_name, head_last_name")
      .eq("id", originalVoucher.group_inquiry_id)
      .maybeSingle();
    const headName = `${groupInquiry?.head_first_name || ""} ${groupInquiry?.head_last_name || ""}`.trim();
    if (headName) resolvedGuestName = headName;
  }

  // Calculate next amendment number
  const { data: amendments } = await supabase
    .from("hotel_vouchers")
    .select("amendment_number")
    .eq("original_voucher_id", id)
    .order("amendment_number", { ascending: false })
    .limit(1);

  const nextAmendmentNumber = amendments && amendments.length > 0
    ? (amendments[0].amendment_number || 0) + 1
    : 1;

  // Create the amendment voucher
  const amendmentData = {
    ...originalVoucher,
    id: undefined, // Let the database generate a new ID
    voucher_number: `${originalVoucher.voucher_number || `V-${id.slice(0, 8)}`}-A${nextAmendmentNumber}`,
    original_voucher_id: id,
    is_amendment: true,
    amendment_number: nextAmendmentNumber,
    amendment_confirmed_by: body.amendment_confirmed_by || null,
    status: "amended",
    guest_name: body.guest_name || resolvedGuestName,
    created_at: undefined,
    updated_at: undefined,
    // Override with new values from request
    ...body,
  };

  delete amendmentData.id;
  delete amendmentData.created_at;
  delete amendmentData.updated_at;

  const { data: amendedVoucher, error: createError } = await supabase
    .from("hotel_vouchers")
    .insert(amendmentData)
    .select()
    .single();

  if (createError) {
    console.error("Error creating amendment:", createError);
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Update original voucher status
  await supabase
    .from("hotel_vouchers")
    .update({ status: "amended" })
    .eq("id", id);

  return NextResponse.json({ success: true, voucher: amendedVoucher });
}
