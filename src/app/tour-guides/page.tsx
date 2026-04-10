import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { TourGuidesList } from "./TourGuidesList";
import { TourGuideAssignmentSection } from "./TourGuideAssignmentSection";

export const dynamic = "force-dynamic";

export default async function TourGuidesPage() {
  const supabase = await createClient();

  // Fetch tour guides
  const { data: guides, error: guidesError } = await supabase
    .from("tour_guides")
    .select("*")
    .order("name", { ascending: true });

  if (guidesError) {
    console.error("Error fetching tour guides:", guidesError);
  }

  // Fetch tours with their guide assignments
  const { data: tours, error: toursError } = await supabase
    .from("tours")
    .select(
      `id, client_name, start_date, end_date, pax_adults, pax_children, status`
    )
    .order("start_date", { ascending: true });

  if (toursError) {
    console.error("Error fetching tours:", toursError);
  }

  // Fetch active guide assignments with a flat query to avoid relation-introspection issues
  const { data: assignments, error: assignmentsError } = await supabase
    .from("tour_guide_assignments")
    .select("tour_id, tour_guide_id")
    .eq("assignment_status", "active");

  if (assignmentsError) {
    console.warn("Tour guide assignments could not be loaded:", assignmentsError.message || assignmentsError);
  }

  // Fetch assigned guide details separately
  const assignmentGuideIds = (assignments || []).map((assignment: any) => assignment.tour_guide_id).filter(Boolean) as string[];
  const { data: assignmentGuides } = assignmentGuideIds.length > 0
    ? await supabase
      .from("tour_guides")
      .select("id, name, phone_number, language")
      .in("id", assignmentGuideIds)
    : { data: [] as any[] };

  const assignmentGuideMap = new Map((assignmentGuides || []).map((guide: any) => [guide.id, guide]));

  // Create assignment map for quick lookup
  const assignmentMap = new Map(
    (assignments || []).map((assignment: any) => [assignment.tour_id, assignmentGuideMap.get(assignment.tour_guide_id) || null])
  );

  // Transform tours to include guide info
  const transformedTours = (tours || []).map((tour: any) => ({
    ...tour,
    guide_id: assignmentMap.get(tour.id)?.id || null,
    tour_guides: assignmentMap.get(tour.id) || null,
  }));

  return (
    <AppLayout>
      <Header
        title="Tour Guide Management"
        subtitle="Manage your tour guides and assign them to tours"
      />
      <div className="space-y-8">
        <TourGuideAssignmentSection tours={transformedTours} guides={guides || []} />
        <TourGuidesList guides={guides || []} />
      </div>
    </AppLayout>
  );
}
