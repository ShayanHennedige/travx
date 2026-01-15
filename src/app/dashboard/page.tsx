import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout";
import { DashboardContent } from "./DashboardContent";

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
        content
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

  return (
    <AppLayout>
      <DashboardContent 
        stats={stats}
        recentInquiries={recentInquiries}
        tours={tours || []}
        drivers={drivers || []}
      />
    </AppLayout>
  );
}
