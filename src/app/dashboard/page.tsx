import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout";
import { DashboardContent } from "./DashboardContent";
import { InquiryStatus } from "@/types/database";

export const dynamic = "force-dynamic";

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
    .select("id, client_name, start_date, end_date, pax_adults, pax_children, status, driver_id, driver_status, itinerary_id, inquiry_id, group_inquiry_id")
    .order("start_date", { ascending: true });

  // Resolve tour driver details with an explicit lookup (more reliable than implicit joins in this schema)
  const tourDriverIds = (tours || []).map((t: any) => t.driver_id).filter(Boolean) as string[];
  const { data: tourDrivers } = tourDriverIds.length > 0
    ? await supabase
      .from("drivers")
      .select("id, name, contact_number, vehicle_type, vehicle_number")
      .in("id", tourDriverIds)
    : { data: [] as any[] };

  // Resolve itinerary content for tour tracker cards
  const tourItineraryIds = (tours || []).map((t: any) => t.itinerary_id).filter(Boolean) as string[];
  const { data: tourItineraries } = tourItineraryIds.length > 0
    ? await supabase
      .from("itineraries")
      .select("id, content, inquiry_id, group_inquiry_id")
      .in("id", tourItineraryIds)
    : { data: [] as any[] };

  const tourDriverMap = new Map((tourDrivers || []).map((d: any) => [d.id, d]));
  const tourItineraryMap = new Map((tourItineraries || []).map((it: any) => [it.id, it]));

  const enrichedTours = (tours || []).map((tour: any) => ({
    ...tour,
    drivers: tour.driver_id ? (tourDriverMap.get(tour.driver_id) || null) : null,
    itineraries: tour.itinerary_id ? (tourItineraryMap.get(tour.itinerary_id) || null) : null,
  }));

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
    activeTours: enrichedTours?.filter((t) => t.status === "ongoing" || t.status === "upcoming").length ?? 0,
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

    const matchingItineraries = (itineraries || []).filter(
      (it) =>
        (inquiryId && it.inquiry_id === inquiryId) ||
        (groupInquiryId && it.group_inquiry_id === groupInquiryId)
    );

    // 1. Find the best itinerary to track:
    // Prioritize the one linked to a tour, otherwise use the most recent one.
    const linkedTourByInquiry = enrichedTours?.find((t) =>
      (inquiryId && t.inquiry_id === inquiryId) ||
      (groupInquiryId && t.group_inquiry_id === groupInquiryId)
    );

    // Fallback: some tours may not have inquiry/group IDs populated but do have itinerary_id.
    const linkedTourByItinerary = enrichedTours?.find((t) =>
      matchingItineraries.some((it) => it.id === t.itinerary_id)
    );

    const linkedTour = linkedTourByInquiry || linkedTourByItinerary;

    const activeItineraryId = linkedTour?.itinerary_id || matchingItineraries[0]?.id || null;

    const itinerary = activeItineraryId
      ? matchingItineraries.find((it) => it.id === activeItineraryId) ||
      itineraries?.find((it) => it.id === activeItineraryId)
      : matchingItineraries[0];

    // 2. Count vouchers for this inquiry
    const voucherList = vouchers?.filter(
      (v) =>
        (inquiryId && v.inquiry_id === inquiryId) ||
        (groupInquiryId && v.group_inquiry_id === groupInquiryId)
    ) || [];

    // Get voucher status (if all vouchers have same status, use it, otherwise null)
    // Refine: If any vouchers exist and all are NOT draft, consider it in_progress or completed
    const voucherStatuses = voucherList.map(v => v.status).filter(Boolean);
    const voucherStatus = voucherStatuses.length > 0 && voucherStatuses.every(s => s === "completed")
      ? "completed"
      : voucherList.length > 0
        ? "in_progress"
        : null;

    // 2.5 Find invoices (linked by itinerary or tour)
    const linkedInvoices = customerInvoices?.filter(
      (inv) =>
        (activeItineraryId && inv.itinerary_id === activeItineraryId) ||
        (linkedTour && inv.tour_id === linkedTour.id)
    ) || [];

    const invoiceStatuses = linkedInvoices.map(inv => inv.status);
    let invoiceStatus: "new" | "in_progress" | "completed" | null = null;

    if (invoiceStatuses.length > 0) {
      if (invoiceStatuses.some(s => s === "paid" || s === "sent" || s === "confirmed")) {
        invoiceStatus = "completed";
      } else if (invoiceStatuses.some(s => s === "overdue")) {
        invoiceStatus = "in_progress";
      } else {
        invoiceStatus = "new";
      }
    }

    // 3. Find tour via itinerary_id (tour has itinerary_id)
    const tour = linkedTour || (itinerary ? enrichedTours?.find((t) => t.itinerary_id === itinerary.id) : null);

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
        tours={enrichedTours || []}
        drivers={drivers || []}
        statusTrackerItems={statusTrackerItems}
      />
    </AppLayout>
  );
}
