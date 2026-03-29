import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { InquiriesListWithToggle } from "./InquiriesListWithToggle";

export default async function InquiriesPage() {
  const supabase = await createClient();

  // Fetch individual inquiries
  const { data: individualInquiries, error: individualError } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  if (individualError) {
    console.error("Error fetching individual inquiries:", individualError);
  }

  // Fetch group inquiries
  const { data: groupInquiries, error: groupError } = await supabase
    .from("group_inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  if (groupError) {
    console.error("Error fetching group inquiries:", groupError);
  }

  return (
    <AppLayout>
      <Header
        title="Inquiry Management"
        subtitle="Organize and process client travel requests"
      />
      <InquiriesListWithToggle
        individualInquiries={individualInquiries || []}
        groupInquiries={groupInquiries || []}
      />
    </AppLayout>
  );
}
