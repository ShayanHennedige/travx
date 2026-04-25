import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoucherRoomingListClient from "./VoucherRoomingListClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VoucherRoomingListPage({ params }: PageProps) {
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
        last_name
      ),
      group_inquiries (
        id,
        inquiry_number,
        head_first_name,
        head_last_name
      )
    `)
    .eq("id", id)
    .single();

  if (error || !voucher) {
    notFound();
  }

  // Only Group Vouchers use this system
  if (!voucher.group_inquiry_id) {
    return (
      <div className="p-10 text-center text-slate-500">
        Individual vouchers do not currently support advanced rooming lists.
      </div>
    );
  }

  // Fetch Group Members
  const { data: membersData } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_inquiry_id", voucher.group_inquiry_id)
    .order("created_at", { ascending: true });

  const groupMembers = membersData || [];

  const roomingListOverlay = typeof voucher.rooming_list_data === "object" && voucher.rooming_list_data !== null
    ? voucher.rooming_list_data
    : null;

  // Process members with override
  const members = groupMembers.map((m) => {
    let override = null;
    if (roomingListOverlay && roomingListOverlay.assignments) {
      override = roomingListOverlay.assignments.find((a: any) => a.member_id === m.id);
    }

    return {
      id: m.id,
      full_name: m.full_name,
      member_type: m.member_type,
      passport_no: m.passport_no,
      date_of_birth: m.date_of_birth,
      age_label: m.age_label,
      room_number: m.room_number,
      // If we have an overlay, use it, even if blank. Otherwise fall back to group level.
      room_category: override ? override.room_category : (roomingListOverlay ? "" : (m.room_category || "")),
      remarks: override ? override.remarks : (roomingListOverlay ? "" : (m.remarks || "")),
    };
  });

  const tourGuide = roomingListOverlay?.tourGuide || null;
  const groupInquiry = voucher.group_inquiries as any;

  return (
    <VoucherRoomingListClient
      voucherId={voucher.id}
      hotelName={voucher.hotel_name}
      inquiryNumber={groupInquiry?.inquiry_number || "N/A"}
      groupInquiryId={voucher.group_inquiry_id}
      initialMembers={members}
      initialTourGuide={tourGuide}
      travelDates={{
         in: voucher.check_in_date,
         out: voucher.check_out_date
      }}
      totalPax={(voucher.pax_adults || 0) + (voucher.pax_children || 0)}
    />
  );
}
