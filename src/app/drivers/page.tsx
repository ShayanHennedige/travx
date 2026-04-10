import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { DriversList } from "./DriversList";
import { TourAssignmentSection } from "./TourAssignmentSection";

export const dynamic = "force-dynamic";

export default async function DriversPage() {
  const supabase = await createClient();

  const { data: drivers, error } = await supabase
    .from("drivers")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching drivers:", error);
  }

  // Fetch tours (flat query — no FK constraints defined in schema)
  const { data: tours, error: toursError } = await supabase
    .from("tours")
    .select("id, client_name, start_date, end_date, pax_adults, pax_children, driver_id, driver_status, status, itinerary_id, inquiry_id, group_inquiry_id")
    .order("start_date", { ascending: true });

  if (toursError) {
    console.error("Error fetching tours:", toursError.message, toursError.code);
  }

  // Fetch assigned drivers separately
  const driverIds = (tours || []).map(t => t.driver_id).filter(Boolean) as string[];
  const { data: assignedDrivers } = driverIds.length > 0
    ? await supabase.from("drivers").select("id, name, vehicle_type, vehicle_number").in("id", driverIds)
    : { data: [] as any[] };

  const driverMap = new Map((assignedDrivers || []).map((d: any) => [d.id, d]));

  // Transform tours for the component
  const transformedTours = (tours || []).map((tour) => {
    const driverData = tour.driver_id ? driverMap.get(tour.driver_id) ?? null : null;

    return {
      ...tour,
      driver_id: tour.driver_id || null,
      driver_status: tour.driver_status as "new" | "in_progress" | "completed" | null,
      status: tour.status as "upcoming" | "ongoing" | "completed" | "cancelled",
      vouchers_completed: true, // Since it's in the tours table, it's finalized (vouchers exist)
      drivers: driverData || null,
    };
  });

  return (
    <AppLayout>
      <Header
        title="Driver Management"
        subtitle="Organize and monitor your tour transport team"
      />
      <div className="space-y-6">
        <TourAssignmentSection tours={transformedTours} drivers={drivers || []} />
        <DriversList drivers={drivers || []} />
      </div>
    </AppLayout>
  );
}
