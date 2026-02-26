import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout";
import { DashboardContent } from "./DashboardContent";
import { InquiryStatus } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch individual inquiries
  const { data: inquiries } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch group inquiries
  const { data: groupInquiries } = await supabase
    .from("group_inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch tours
  const { data: tours } = await supabase
    .from("tours")
    .select(`
      *,
      drivers (
        id,
        name,
        contact_number,
        vehicle_type,
        vehicle_number
      ),
      itineraries (
        id,
        content,
        inquiry_id,
        group_inquiry_id
      )
    `)
    .order("start_date", { ascending: true });

  // Fetch drivers
  const { data: drivers } = await supabase
    .from("drivers")
    .select("*")
    .order("name", { ascending: true });

  // Combined stats
  const allInquiries = [
    ...(inquiries || []).map(i => ({ ...i, type: "individual" as const })),
    ...(groupInquiries || []).map(i => ({ 
      ...i, 
      type: "group" as const,
      first_name: i.head_first_name,
      last_name: i.head_last_name,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const stats = {
    total: allInquiries.length,
    individual: inquiries?.length ?? 0,
    group: groupInquiries?.length ?? 0,
    new: allInquiries.filter((i) => i.status === "new").length,
    in_progress: allInquiries.filter((i) => i.status === "in_progress").length,
    confirmed: allInquiries.filter((i) => i.status === "confirmed").length,
    activeTours: tours?.filter((t) => t.status === "ongoing" || t.status === "upcoming").length ?? 0,
  };

  const recentInquiries = allInquiries.slice(0, 10);

  // Fetch all itineraries
  const { data: itineraries } = await supabase
    .from("itineraries")
    .select("id, inquiry_id, group_inquiry_id, status")
    .order("created_at", { ascending: false });

  // Fetch all vouchers with counts
  const { data: vouchers } = await supabase
    .from("hotel_vouchers")
    .select("id, inquiry_id, group_inquiry_id, itinerary_id, status");

  // Build status tracker items
  const statusTrackerItems = allInquiries.map((inquiry) => {
    const inquiryId = inquiry.type === "individual" ? inquiry.id : undefined;
    const groupInquiryId = inquiry.type === "group" ? inquiry.id : undefined;

    // Find itinerary
    const itinerary = itineraries?.find(
      (it) =>
        (inquiryId && it.inquiry_id === inquiryId) ||
        (groupInquiryId && it.group_inquiry_id === groupInquiryId)
    );

    // Count vouchers for this inquiry
    const voucherList = vouchers?.filter(
      (v) =>
        (inquiryId && v.inquiry_id === inquiryId) ||
        (groupInquiryId && v.group_inquiry_id === groupInquiryId)
    ) || [];
    
    // Get voucher status (if all vouchers have same status, use it, otherwise null)
    const voucherStatuses = voucherList.map(v => v.status).filter(Boolean);
    const voucherStatus = voucherStatuses.length > 0 && voucherStatuses.every(s => s === voucherStatuses[0])
      ? (voucherStatuses[0] as "new" | "in_progress" | "completed")
      : null;

    // Find tour via itinerary_id (tour has itinerary_id)
    const tour = itinerary ? tours?.find((t) => t.itinerary_id === itinerary.id) : null;

    const driverStatus = tour?.driver_id
      ? (tour.driver_status as "new" | "in_progress" | "completed" | null) || "new"
      : null;

    return {
      id: inquiry.id,
      type: inquiry.type,
      inquiry_id: inquiryId || inquiry.id,
      group_inquiry_id: groupInquiryId,
      reference: inquiry.inquiry_number,
      client_name: inquiry.type === "group" 
        ? `${inquiry.head_first_name || ""} ${inquiry.head_last_name || ""}`.trim()
        : `${inquiry.first_name || ""} ${inquiry.last_name || ""}`.trim(),
      client_email: inquiry.client_email || inquiry.head_client_email || "",
      inquiry_status: inquiry.status as InquiryStatus,
      itinerary_status: itinerary?.status as "new" | "in_progress" | "completed" | null || null,
      itinerary_id: itinerary?.id || null,
      voucher_status: voucherStatus,
      vouchers_count: voucherList.length,
      driver_status: driverStatus,
      driver_id: tour?.driver_id || null,
      driver_name: tour?.drivers?.name || null,
      tour_id: tour?.id || null,
    };
  });

  return (
    <AppLayout>
      <DashboardContent 
        stats={stats}
        recentInquiries={recentInquiries}
        tours={tours || []}
        drivers={drivers || []}
        statusTrackerItems={statusTrackerItems}
      />
    </AppLayout>
  );
}
