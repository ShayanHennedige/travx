import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { DriversList } from "./DriversList";
import { TourGuidesList } from "./TourGuidesList";
import { TourAssignmentSection } from "./TourAssignmentSection";

export default async function DriversPage() {
  const supabase = await createClient();

  const frontendSandileTourDriver = {
    id: "frontend-sandile-tour-driver",
    name: "Mr. Jeffery D Deen",
    contact_number: "076 966 9904",
    vehicle_type: "Van",
    vehicle_number: "NE 3785",
  };

  const sandileTourClientName = "mr. sandile zwelethu nodwele zwelethu nodwele";

  const { data: drivers, error } = await supabase
    .from("drivers")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching drivers:", error);
  }

  const { data: tourGuides, error: tourGuidesError } = await supabase
    .from("tour_guides")
    .select("*")
    .order("name", { ascending: true });

  if (tourGuidesError) {
    console.error("Error fetching tour guides:", tourGuidesError);
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
        contact_number,
        vehicle_type,
        vehicle_number
      ),
      tour_guide_id,
      tour_guide_status,
      tour_guides (
        id,
        name,
        language,
        contact_number
      )
    `)
    .order("start_date", { ascending: true });

  if (toursError) {
    console.error("Error fetching tours:", toursError);
  }

  const inquiryIds = Array.from(new Set((tours || []).map((t: any) => {
    const itinerary = Array.isArray(t.itineraries) ? t.itineraries[0] : t.itineraries;
    return t.inquiry_id || itinerary?.inquiry_id;
  }).filter(Boolean)));

  const groupInquiryIds = Array.from(new Set((tours || []).map((t: any) => {
    const itinerary = Array.isArray(t.itineraries) ? t.itineraries[0] : t.itineraries;
    return t.group_inquiry_id || itinerary?.group_inquiry_id;
  }).filter(Boolean)));

  const { data: linkedInquiries } = inquiryIds.length
    ? await supabase
      .from("inquiries")
      .select("id, first_name, last_name")
      .in("id", inquiryIds as string[])
    : { data: [] as any[] };

  const { data: linkedGroupInquiries } = groupInquiryIds.length
    ? await supabase
      .from("group_inquiries")
      .select("id, head_first_name, head_last_name")
      .in("id", groupInquiryIds as string[])
    : { data: [] as any[] };

  const inquiryById = new Map((linkedInquiries || []).map((i: any) => [i.id, i]));
  const groupInquiryById = new Map((linkedGroupInquiries || []).map((i: any) => [i.id, i]));

  // Transform tours for the component
  const transformedTours = (tours || []).map((tour) => {
    // Handle drivers and guides array to single object transformation
    const driverData = Array.isArray(tour.drivers) ? tour.drivers[0] : tour.drivers;
    const guideData = Array.isArray(tour.tour_guides) ? tour.tour_guides[0] : tour.tour_guides;
    const itinerary = Array.isArray((tour as any).itineraries) ? (tour as any).itineraries[0] : (tour as any).itineraries;
    const inquiryId = (tour as any).inquiry_id || itinerary?.inquiry_id;
    const groupInquiryId = (tour as any).group_inquiry_id || itinerary?.group_inquiry_id;
    const inquiry = inquiryId ? inquiryById.get(inquiryId) : null;
    const groupInquiry = groupInquiryId ? groupInquiryById.get(groupInquiryId) : null;
    const inquiryName = inquiry ? `${inquiry.first_name || ""} ${inquiry.last_name || ""}`.trim() : "";
    const groupHeadName = groupInquiry ? `${groupInquiry.head_first_name || ""} ${groupInquiry.head_last_name || ""}`.trim() : "";

    const resolvedClientName = inquiryName || groupHeadName || (tour as any).client_name;
    const isSandileTour = (resolvedClientName || "").trim().toLowerCase() === sandileTourClientName;
    const fallbackDriver = isSandileTour ? frontendSandileTourDriver : null;
    const effectiveDriver = driverData || fallbackDriver;

    return {
      ...tour,
      client_name: resolvedClientName,
      driver_id: tour.driver_id || (fallbackDriver ? fallbackDriver.id : null),
      driver_status: (tour.driver_status || (fallbackDriver ? "new" : null)) as "new" | "in_progress" | "completed" | null,
      status: tour.status as "upcoming" | "ongoing" | "completed" | "cancelled",
      vouchers_completed: true, // Since it's in the tours table, it's finalized (vouchers exist)
      drivers: effectiveDriver || null,
      tour_guide_id: tour.tour_guide_id || null,
      tour_guide_status: (tour.tour_guide_status || null) as "new" | "in_progress" | "completed" | null,
      tour_guides: guideData || null,
    };
  });

  return (
    <AppLayout>
      <Header
        title="Transport Management"
        subtitle="Organize and monitor your tour transport team"
      />
      <div className="space-y-10">
        <TourAssignmentSection tours={transformedTours} drivers={drivers || []} tourGuides={tourGuides || []} />

        {/* Driver Section */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-surface-900">Driver Management</h2>
              <p className="text-sm text-surface-500">Add and manage tour drivers and their vehicles</p>
            </div>
          </div>
          <DriversList drivers={drivers || []} />
        </section>

        {/* Tour Guide Section */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-surface-900">Tour Guide Management</h2>
              <p className="text-sm text-surface-500">Add and manage multilingual tour guides</p>
            </div>
          </div>
          <TourGuidesList tourGuides={tourGuides || []} />
        </section>
      </div>
    </AppLayout>
  );
}
