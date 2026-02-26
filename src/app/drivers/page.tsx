import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { DriversList } from "./DriversList";
import { TourAssignmentSection } from "./TourAssignmentSection";

export default async function DriversPage() {
  const supabase = await createClient();

  const { data: drivers, error } = await supabase
    .from("drivers")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching drivers:", error);
  }

  // Fetch tours with itinerary info and also check if they have inquiry_id/group_inquiry_id directly
  const { data: tours, error: toursError } = await supabase
    .from("tours")
    .select(`
      id,
      client_name,
      start_date,
      end_date,
      pax_adults,
      pax_children,
      driver_id,
      driver_status,
      status,
      itinerary_id,
      inquiry_id,
      group_inquiry_id,
      itineraries (
        inquiry_id,
        group_inquiry_id
      ),
      drivers (
        id,
        name,
        vehicle_type,
        vehicle_number
      )
    `)
    .order("start_date", { ascending: true });

  if (toursError) {
    console.error("Error fetching tours:", toursError);
  }

  // Fetch vouchers to check their completion status
  const { data: vouchers } = await supabase
    .from("hotel_vouchers")
    .select("id, inquiry_id, group_inquiry_id, itinerary_id, status");

  // Create maps to check if vouchers are completed
  // We need to check by inquiry_id, group_inquiry_id, AND itinerary_id
  const voucherCompletionMapByInquiry = new Map<string, boolean>();
  const voucherCompletionMapByItinerary = new Map<string, boolean>();
  const voucherGroupsByInquiry = new Map<string, typeof vouchers>();
  const voucherGroupsByItinerary = new Map<string, typeof vouchers>();

  if (vouchers && vouchers.length > 0) {
    // Group vouchers by inquiry/group_inquiry and by itinerary
    vouchers.forEach((voucher) => {
      // Group by inquiry_id or group_inquiry_id
      const inquiryKey = (voucher.inquiry_id != null && voucher.inquiry_id !== "")
        ? voucher.inquiry_id
        : (voucher.group_inquiry_id != null && voucher.group_inquiry_id !== "")
          ? voucher.group_inquiry_id
          : null;

      if (inquiryKey) {
        if (!voucherGroupsByInquiry.has(inquiryKey)) {
          voucherGroupsByInquiry.set(inquiryKey, []);
        }
        voucherGroupsByInquiry.get(inquiryKey)!.push(voucher);
      }

      // Also group by itinerary_id
      if (voucher.itinerary_id) {
        if (!voucherGroupsByItinerary.has(voucher.itinerary_id)) {
          voucherGroupsByItinerary.set(voucher.itinerary_id, []);
        }
        voucherGroupsByItinerary.get(voucher.itinerary_id)!.push(voucher);
      }
    });

    // Check if all vouchers for each inquiry are completed
    voucherGroupsByInquiry.forEach((groupVouchers, key) => {
      const hasVouchers = groupVouchers && groupVouchers.length > 0;
      const allCompleted = !!hasVouchers && groupVouchers.every(v =>
        v.status === "completed" || v.status === "confirmed"
      );
      voucherCompletionMapByInquiry.set(key, allCompleted);
    });

    // Check if all vouchers for each itinerary are completed
    voucherGroupsByItinerary.forEach((groupVouchers, key) => {
      const hasVouchers = groupVouchers && groupVouchers.length > 0;
      const allCompleted = !!hasVouchers && groupVouchers.every(v =>
        v.status === "completed" || v.status === "confirmed"
      );
      voucherCompletionMapByItinerary.set(key, allCompleted);
    });
  }

  // Transform tours for the component, adding voucher completion info
  const transformedTours = (tours || []).map((tour) => {
    // Try to get inquiry_id/group_inquiry_id from tour directly, or from itinerary
    let inquiryKey: string | null = null;
    let itineraryId: string | null = tour.itinerary_id || null;

    if (tour.inquiry_id) {
      inquiryKey = tour.inquiry_id;
    } else if (tour.group_inquiry_id) {
      inquiryKey = tour.group_inquiry_id;
    } else if (tour.itineraries) {
      // Handle both array and single object responses
      const itinerary = Array.isArray(tour.itineraries)
        ? tour.itineraries[0]
        : tour.itineraries;

      // Safe casting with unknown
      const itineraryObj = itinerary as unknown as { inquiry_id: string | null; group_inquiry_id: string | null; id: string | null };

      inquiryKey = itineraryObj?.inquiry_id || itineraryObj?.group_inquiry_id || null;

      // Also get itinerary_id if not already set
      if (!itineraryId && itineraryObj?.id) {
        itineraryId = itineraryObj.id;
      }
    }

    // Check voucher completion by inquiry first, then by itinerary
    let vouchersCompleted = false;
    if (inquiryKey && voucherCompletionMapByInquiry.has(inquiryKey)) {
      vouchersCompleted = voucherCompletionMapByInquiry.get(inquiryKey) || false;
    } else if (itineraryId && voucherCompletionMapByItinerary.has(itineraryId)) {
      vouchersCompleted = voucherCompletionMapByItinerary.get(itineraryId) || false;
    }

    // Debug info
    if (process.env.NODE_ENV === "development") {
      const voucherGroupByInquiry = inquiryKey ? voucherGroupsByInquiry.get(inquiryKey) : undefined;
      const voucherGroupByItinerary = itineraryId ? voucherGroupsByItinerary.get(itineraryId) : undefined;
      console.log(`Tour: ${tour.client_name}`, {
        inquiryKey,
        itineraryId,
        vouchersCompleted,
        voucherCountByInquiry: voucherGroupByInquiry?.length || 0,
        voucherStatusesByInquiry: voucherGroupByInquiry?.map(v => v.status) || [],
        voucherCountByItinerary: voucherGroupByItinerary?.length || 0,
        voucherStatusesByItinerary: voucherGroupByItinerary?.map(v => v.status) || [],
      });
    }

    // Handle drivers array to single object transformation
    const driverData = Array.isArray(tour.drivers) ? tour.drivers[0] : tour.drivers;

    return {
      ...tour,
      driver_id: tour.driver_id || null,
      driver_status: tour.driver_status as "new" | "in_progress" | "completed" | null,
      status: tour.status as "upcoming" | "ongoing" | "completed" | "cancelled",
      vouchers_completed: vouchersCompleted,
      drivers: driverData || null,
    };
  });

  return (
    <AppLayout>
      <Header
        title="Drivers"
        subtitle="Manage your tour drivers"
      />
      <div className="space-y-6">
        <TourAssignmentSection tours={transformedTours} drivers={drivers || []} />
        <DriversList drivers={drivers || []} />
      </div>
    </AppLayout>
  );
}
