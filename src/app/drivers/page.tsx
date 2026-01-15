import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { DriversList } from "./DriversList";

export default async function DriversPage() {
  const supabase = await createClient();

  const { data: drivers, error } = await supabase
    .from("drivers")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching drivers:", error);
  }

  return (
    <AppLayout>
      <Header
        title="Drivers"
        subtitle="Manage your tour drivers"
      />
      <DriversList drivers={drivers || []} />
    </AppLayout>
  );
}
