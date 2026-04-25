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
        country,
        rooms_dbl,
        rooms_sgl,
        rooms_tpl,
        rooms_qtpl,
        room_interconnections
      )
    `)
    .eq("id", id)
    .single();

  if (error || !voucher) {
    notFound();
  }

  // ── Amendment chain data ──
  // If this voucher IS an amendment, fetch the original
  let originalVoucher: { id: string; voucher_number: string; hotel_name: string; status: string; created_at: string } | null = null;
  if (voucher.is_amendment && voucher.original_voucher_id) {
    const { data } = await supabase
      .from("hotel_vouchers")
      .select("id, voucher_number, hotel_name, status, created_at")
      .eq("id", voucher.original_voucher_id)
      .maybeSingle();
    originalVoucher = data;
  }

  // If this voucher HAS been amended, fetch all amendments
  let amendments: { id: string; voucher_number: string; amendment_number: number; status: string; created_at: string }[] = [];
  if (voucher.status === "amended" || !voucher.is_amendment) {
    const { data } = await supabase
      .from("hotel_vouchers")
      .select("id, voucher_number, amendment_number, status, created_at")
      .eq("original_voucher_id", id)
      .order("amendment_number", { ascending: true });
    if (data && data.length > 0) {
      amendments = data;
    }
  }

  const hasAmendmentHistory = !!originalVoucher || amendments.length > 0;

  // Fetch Group Members if it's a group inquiry
  let groupMembers: any[] = [];
  if (voucher.group_inquiry_id) {
    const { data } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_inquiry_id", voucher.group_inquiry_id)
      .order("created_at", { ascending: true });
    if (data) groupMembers = data;
  }

  const roomingListOverlay = typeof voucher.rooming_list_data === "object" && voucher.rooming_list_data !== null
    ? voucher.rooming_list_data
    : null;

  // Process members with override
  const members = groupMembers.map((m) => {
    if (roomingListOverlay && roomingListOverlay.assignments) {
      const overlay = roomingListOverlay.assignments.find((a: any) => a.member_id === m.id);
      if (overlay) {
        return {
          ...m,
          room_number: overlay.room_number,
          room_category: overlay.room_category,
          remarks: overlay.remarks,
        };
      } else {
        return {
          ...m,
          room_number: null,
          room_category: null,
          remarks: null,
        };
      }
    }
    return m;
  });

  const interconnections = roomingListOverlay?.interconnections || voucher.group_inquiries?.room_interconnections || [];

  const inquiry = voucher.inquiries as {
    id: string;
    inquiry_number: string;
    first_name: string;
    last_name: string;
    client_email: string;
    contact_number: string;
    country: string;
  } | null;

  const groupInquiry = voucher.group_inquiries as {
    id: string;
    inquiry_number: string;
    head_first_name: string;
    head_last_name: string;
    client_email: string;
    contact_number: string;
    country: string;
    rooms_dbl?: number;
    rooms_sgl?: number;
    rooms_tpl?: number;
    rooms_qtpl?: number;
    room_interconnections?: number[][];
  } | null;

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
    cancelled: "bg-red-100 text-red-700",
  };

  const formatRoomTypes = (v: any) => {
    const parts = [];
    if (v.rooms_sgl) parts.push(`${v.rooms_sgl} SGL`);
    if (v.rooms_dbl) parts.push(`${v.rooms_dbl} DBL`);
    if (v.rooms_tpl) parts.push(`${v.rooms_tpl} TPL`);
    if (v.rooms_qtpl) parts.push(`${v.rooms_qtpl} QUAD`);
    return parts.length > 0 ? parts.join(" ") : `${v.no_of_rooms} ${v.room_type || ""}`;
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
        <div className="lg:col-span-2 space-y-6">
          <VoucherEditor voucher={voucher} originalVoucher={originalVoucher} />
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

          {/* Amendment History Card */}
          {hasAmendmentHistory && (
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-surface-900 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Amendment History
              </h3>

              <div className="space-y-3">
                {/* Link to original voucher (if this is an amendment) */}
                {originalVoucher && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-blue-500">Original Voucher</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${statusColors[originalVoucher.status] || "bg-surface-100 text-surface-600"}`}>
                        {originalVoucher.status}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-blue-900 mb-2">{originalVoucher.voucher_number}</p>
                    <p className="text-xs text-blue-600 mb-3">
                      Created {format(new Date(originalVoucher.created_at), "MMM d, yyyy")}
                    </p>
                    <div className="flex gap-2">
                      <Link href={`/vouchers/${originalVoucher.id}`}>
                        <Button size="sm" variant="secondary" className="text-xs">
                          View Original
                        </Button>
                      </Link>
                      <Link href={`/api/vouchers/${originalVoucher.id}/pdf?view=true`} target="_blank">
                        <Button size="sm" variant="ghost" className="text-xs text-blue-600 hover:bg-blue-50">
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          PDF
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {/* List of amendments (if this is the original or has amendments) */}
                {amendments.map((amd) => (
                  <div key={amd.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-orange-500">
                        Amendment #{amd.amendment_number}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${statusColors[amd.status] || "bg-surface-100 text-surface-600"}`}>
                        {amd.status}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-orange-900 mb-2">{amd.voucher_number}</p>
                    <p className="text-xs text-orange-600 mb-3">
                      Created {format(new Date(amd.created_at), "MMM d, yyyy")}
                    </p>
                    <div className="flex gap-2">
                      <Link href={`/vouchers/${amd.id}`}>
                        <Button size="sm" variant="secondary" className="text-xs">
                          View Amendment
                        </Button>
                      </Link>
                      <Link href={`/api/vouchers/${amd.id}/pdf?view=true`} target="_blank">
                        <Button size="sm" variant="ghost" className="text-xs text-orange-600 hover:bg-orange-50">
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          PDF
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                <span className="text-surface-900">{formatRoomTypes(voucher)}</span>
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
