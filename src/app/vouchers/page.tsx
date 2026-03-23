import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { VouchersList } from "./VouchersList";

export default async function VouchersPage() {
  const supabase = await createClient();

  // Fetch vouchers without embedded joins (no FK constraints defined in schema)
  const { data: vouchers, error } = await supabase
    .from("hotel_vouchers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching vouchers:", error.message, error.code, error.details);
  }

  // Collect inquiry IDs for separate lookups
  const inquiryIds = (vouchers || []).map(v => v.inquiry_id).filter(Boolean) as string[];
  const groupInquiryIds = (vouchers || []).map(v => v.group_inquiry_id).filter(Boolean) as string[];

  const { data: inquiriesData } = inquiryIds.length > 0
    ? await supabase
        .from("inquiries")
        .select("id, inquiry_number, first_name, last_name")
        .in("id", inquiryIds)
    : { data: [] as any[] };

  const { data: groupInquiriesData } = groupInquiryIds.length > 0
    ? await supabase
        .from("group_inquiries")
        .select("id, inquiry_number, head_first_name, head_last_name")
        .in("id", groupInquiryIds)
    : { data: [] as any[] };

  const inquiryMap = new Map((inquiriesData || []).map((i: any) => [i.id, i]));
  const groupInquiryMap = new Map((groupInquiriesData || []).map((i: any) => [i.id, i]));

  // Transform data
  const transformedVouchers = (vouchers || []).map((voucher) => {
    const inquiry = voucher.inquiry_id ? (inquiryMap.get(voucher.inquiry_id) as { id: string; inquiry_number: string; first_name: string; last_name: string } | undefined) : null;
    const groupInquiry = voucher.group_inquiry_id ? (groupInquiryMap.get(voucher.group_inquiry_id) as { id: string; inquiry_number: string; head_first_name: string; head_last_name: string } | undefined) : null;

    return {
      ...voucher,
      inquiry_number: inquiry?.inquiry_number || groupInquiry?.inquiry_number || "PENDING",
      client_name: inquiry
        ? `${inquiry.first_name} ${inquiry.last_name}`
        : groupInquiry
          ? `${groupInquiry.head_first_name} ${groupInquiry.head_last_name}`
          : voucher.guest_name,
      type: groupInquiry ? "group" : "individual",
    };
  });

  return (
    <AppLayout>
      <Header
        title="Voucher Management"
        subtitle={`Tracking ${transformedVouchers.length} active hotel vouchers`}
      />
      <VouchersList vouchers={transformedVouchers} />
    </AppLayout>
  );
}
