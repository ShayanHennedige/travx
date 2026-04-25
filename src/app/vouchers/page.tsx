import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { VouchersList } from "./VouchersList";

export default async function VouchersPage() {
  const supabase = await createClient();

  const { data: vouchers, error } = await supabase
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
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching vouchers:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
  }

  // Transform data
  const transformedVouchers = (vouchers || []).map((voucher) => {
    const inquiry = voucher.inquiries as { id: string; inquiry_number: string; first_name: string; last_name: string } | null;
    const groupInquiry = voucher.group_inquiries as { id: string; inquiry_number: string; head_first_name: string; head_last_name: string } | null;

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
