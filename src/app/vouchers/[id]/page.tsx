import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { Button, Badge } from "@/components/ui";
import Link from "next/link";
import { format } from "date-fns";
import { VoucherEditor } from "./VoucherEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VoucherDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch voucher without embedded joins (no FK constraints defined in schema)
  const { data: voucher, error } = await supabase
    .from("hotel_vouchers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !voucher) {
    notFound();
  }

  // Fetch related inquiry or group inquiry separately
  let inquiry = null;
  let groupInquiry = null;

  if (voucher.inquiry_id) {
    const { data } = await supabase
      .from("inquiries")
      .select("id, inquiry_number, first_name, last_name, client_email, contact_number, country")
      .eq("id", voucher.inquiry_id)
      .single();
    inquiry = data;
  }

  if (voucher.group_inquiry_id) {
    const { data } = await supabase
      .from("group_inquiries")
      .select("id, inquiry_number, head_first_name, head_last_name, client_email, contact_number, country")
      .eq("id", voucher.group_inquiry_id)
      .single();
    groupInquiry = data;
  }

  const inquiryNumber = inquiry?.inquiry_number || groupInquiry?.inquiry_number || "N/A";
  const clientName = inquiry 
    ? `${inquiry.first_name} ${inquiry.last_name}`
    : groupInquiry 
      ? `${groupInquiry.head_first_name} ${groupInquiry.head_last_name}`
      : voucher.guest_name;
  const isGroup = !!groupInquiry;
  const inquiryLink = isGroup 
    ? `/group-inquiries/${groupInquiry?.id}`
    : `/inquiries/${inquiry?.id}`;

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-green-100 text-green-700",
    amended: "bg-blue-100 text-blue-700",
    cancelled: "bg-accent-500/15 text-accent-700",
  };

  return (
    <AppLayout>
      <Header
        title={voucher.voucher_number}
        subtitle={`Hotel voucher for ${voucher.hotel_name}`}
        action={
          <div className="flex items-center gap-3">
            <Link href="/vouchers">
              <Button variant="secondary">Back to List</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Editor */}
        <div className="lg:col-span-2">
          <VoucherEditor voucher={voucher} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-surface-900">Status</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[voucher.status] || "bg-surface-100 text-surface-700"}`}>
                {voucher.status}
              </span>
            </div>

            {voucher.is_amendment && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="orange">Amendment #{voucher.amendment_number}</Badge>
                </div>
                {voucher.amendment_confirmed_by && (
                  <p className="text-sm text-orange-700 mt-2">
                    Confirmed by: {voucher.amendment_confirmed_by}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-500">Created</span>
                <span className="text-surface-900">
                  {format(new Date(voucher.created_at), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Last Updated</span>
                <span className="text-surface-900">
                  {format(new Date(voucher.updated_at), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>

          {/* Linked Inquiry */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-surface-900 mb-4">
              Linked Inquiry
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={isGroup ? "purple" : "blue"}>
                  {isGroup ? "Group" : "Individual"}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Inquiry No.</span>
                <Link href={inquiryLink} className="text-primary-600 hover:underline">
                  {inquiryNumber}
                </Link>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Client</span>
                <span className="text-surface-900">{clientName}</span>
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-surface-900 mb-4">
              Booking Summary
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-500">Hotel</span>
                <span className="text-surface-900 font-medium">{voucher.hotel_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Check-in</span>
                <span className="text-surface-900">
                  {format(new Date(voucher.check_in_date), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Check-out</span>
                <span className="text-surface-900">
                  {format(new Date(voucher.check_out_date), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Nights</span>
                <span className="text-surface-900">{voucher.no_of_nights}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Rooms</span>
                <span className="text-surface-900">{voucher.no_of_rooms} {voucher.room_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Meal Plan</span>
                <span className="text-surface-900">{voucher.meal_plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Total Pax</span>
                <span className="text-surface-900">
                  {(voucher.pax_adults || 0) + (voucher.pax_children || 0) + (voucher.pax_infants || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
