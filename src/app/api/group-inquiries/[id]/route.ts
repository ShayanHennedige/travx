import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Find proposals linked to this group inquiry
    const { data: proposals } = await supabase
      .from("proposals")
      .select("id")
      .eq("group_inquiry_id", id);

    const proposalIds = (proposals || []).map((p: any) => p.id);

    if (proposalIds.length > 0) {
      // 2. Nullify proposal_id on itineraries and costing sheets
      await supabase
        .from("itineraries")
        .update({ proposal_id: null })
        .in("proposal_id", proposalIds);

      await supabase
        .from("tour_costing_sheets")
        .update({ proposal_id: null })
        .in("proposal_id", proposalIds);

      // 3. Delete itinerary_versions
      await supabase
        .from("itinerary_versions")
        .delete()
        .in("proposal_id", proposalIds);

      // 4. Delete proposals
      await supabase
        .from("proposals")
        .delete()
        .eq("group_inquiry_id", id);
    }

    // 5. Now delete the group inquiry itself
    const { error } = await supabase
      .from("group_inquiries")
      .delete()
      .eq("id", id);
      
    if (error) {
      console.error("Error deleting group inquiry:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Group inquiry deleted successfully" });
  } catch (error: any) {
    console.error("Server error deleting group inquiry:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
