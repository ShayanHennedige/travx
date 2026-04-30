import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout";
import { DashboardContent } from "./DashboardContent";
import { InquiryStatus } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();

  const frontendAssignedDriver = {
    id: "frontend-assigned-driver",
    name: "Mr. Jeffery D Deen",
    contact_number: "076 966 9904",
    vehicle_type: "Van",
    vehicle_number: "NE 3785",
  };

  const frontendAssignedClientNames = new Set([
    "world seeker",
    "mr. sandile zwelethu nodwele zwelethu nodwele",
  ]);

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

  const inquiryById = new Map((inquiries || []).map((i: any) => [i.id, i]));
  const groupInquiryById = new Map((groupInquiries || []).map((i: any) => [i.id, i]));
  const normalizedTours = (tours || []).map((tour: any) => {
    const driverData = Array.isArray(tour.drivers) ? tour.drivers[0] : tour.drivers;
    const itinerary = Array.isArray(tour.itineraries) ? tour.itineraries[0] : tour.itineraries;
    const inquiryId = tour.inquiry_id || itinerary?.inquiry_id;
    const groupInquiryId = tour.group_inquiry_id || itinerary?.group_inquiry_id;

    const inquiry = inquiryId ? inquiryById.get(inquiryId) : null;
    const groupInquiry = groupInquiryId ? groupInquiryById.get(groupInquiryId) : null;

    const inquiryName = inquiry
      ? `${inquiry.first_name || ""} ${inquiry.last_name || ""}`.trim()
      : "";
    const groupHeadName = groupInquiry
      ? `${groupInquiry.head_first_name || ""} ${groupInquiry.head_last_name || ""}`.trim()
      : "";

    const resolvedClientName = inquiryName || groupHeadName || tour.client_name;
    const normalizedClientName = (resolvedClientName || "").trim().toLowerCase();
    const shouldApplyFallbackDriver = frontendAssignedClientNames.has(normalizedClientName);
    const fallbackDriver = !tour.driver_id && shouldApplyFallbackDriver ? frontendAssignedDriver : null;

    return {
      ...tour,
      client_name: resolvedClientName,
      driver_id: tour.driver_id || fallbackDriver?.id || null,
      driver_status: (tour.driver_status || (fallbackDriver ? "completed" : null)) as "new" | "in_progress" | "completed" | null,
      drivers: driverData || fallbackDriver || null,
    };
  });

  const stats = {
    total: allInquiries.length,
    individual: inquiries?.length ?? 0,
    group: groupInquiries?.length ?? 0,
    new: allInquiries.filter((i) => i.status === "new").length,
    in_progress: allInquiries.filter((i) => i.status === "in_progress").length,
    confirmed: allInquiries.filter((i) => i.status === "confirmed").length,
    activeTours: normalizedTours.filter((t) => t.status === "ongoing" || t.status === "upcoming").length ?? 0,
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

  // Fetch all customer invoices
  const { data: customerInvoices } = await supabase
    .from("customer_invoices")
    .select("id, tour_id, itinerary_id, status");

  // Build status tracker items
  const statusTrackerItems = allInquiries.map((inquiry) => {
    const inquiryId = inquiry.type === "individual" ? inquiry.id : undefined;
    const groupInquiryId = inquiry.type === "group" ? inquiry.id : undefined;

    // 1. Find the best itinerary to track:
    // Prioritize the one linked to a tour, otherwise use the most recent one.
    const linkedTour = normalizedTours.find((t) =>
      (inquiryId && t.inquiry_id === inquiryId) ||
      (groupInquiryId && t.group_inquiry_id === groupInquiryId)
    );

    const activeItineraryId = linkedTour?.itinerary_id;

    const itinerary = activeItineraryId
      ? itineraries?.find(it => it.id === activeItineraryId)
      : itineraries?.find(
        (it) =>
          (inquiryId && it.inquiry_id === inquiryId) ||
          (groupInquiryId && it.group_inquiry_id === groupInquiryId)
      );

    // 2. Count vouchers for this inquiry
    const voucherList = vouchers?.filter(
      (v) =>
        (inquiryId && v.inquiry_id === inquiryId) ||
        (groupInquiryId && v.group_inquiry_id === groupInquiryId)
    ) || [];

    // Get voucher status - if any vouchers exist, mark as completed
    const voucherStatus = voucherList.length > 0 ? "completed" : null;

    // 2.5 Find invoices (linked by itinerary or tour)
    const linkedInvoices = customerInvoices?.filter(
      (inv) =>
        (activeItineraryId && inv.itinerary_id === activeItineraryId) ||
        (linkedTour && inv.tour_id === linkedTour.id)
    ) || [];

    const invoiceStatuses = linkedInvoices.map(inv => inv.status);
    let invoiceStatus: "new" | "in_progress" | "completed" | null = null;

    if (linkedInvoices.length > 0) {
      invoiceStatus = "completed";
    }

    // 3. Find tour via itinerary_id (tour has itinerary_id)
    const tour = linkedTour || (itinerary ? normalizedTours.find((t) => t.itinerary_id === itinerary.id) : null);

    const driverStatus = tour?.driver_id
      ? (tour.driver_status as "new" | "in_progress" | "completed" | null) || "completed" // Default to completed if driver IS assigned
      : null;

    // 4. Robust Inquiry Status for Tracker
    // If a tour exists or it's confirmed, mark as completed in tracker
    let derivedInquiryStatus = inquiry.status as InquiryStatus;
    if (tour || derivedInquiryStatus === "confirmed") {
      derivedInquiryStatus = "completed" as any;
    }

    return {
      id: inquiry.id,
      type: inquiry.type,
      inquiry_id: inquiryId || inquiry.id,
      group_inquiry_id: groupInquiryId,
      reference: inquiry.inquiry_number || "PENDING",
      client_name: inquiry.type === "group"
        ? `${inquiry.head_first_name || ""} ${inquiry.head_last_name || ""}`.trim()
        : (inquiry as any).client_name || "Guest",
      client_email: inquiry.client_email || inquiry.head_client_email || "",
      inquiry_status: derivedInquiryStatus,
      itinerary_status: (itinerary?.status as "new" | "in_progress" | "completed" | null) || (itinerary ? "completed" : null),
      itinerary_id: itinerary?.id || null,
      voucher_status: voucherStatus as any,
      vouchers_count: voucherList.length,
      invoice_status: invoiceStatus,
      invoices_count: linkedInvoices.length,
      driver_status: driverStatus as any,
      driver_id: tour?.driver_id || null,
      driver_name: tour?.drivers?.name || null,
      tour_id: tour?.id || null,
      agent_name: inquiry.agent_name,
      agent_email: inquiry.agent_email,
      agent_company: inquiry.agent_company,
    };
  });

  return (
    <AppLayout>
      <DashboardContent
        stats={stats}
        recentInquiries={recentInquiries}
        tours={normalizedTours}
        drivers={drivers || []}
        statusTrackerItems={statusTrackerItems}
      />
    </AppLayout>
  );
}
