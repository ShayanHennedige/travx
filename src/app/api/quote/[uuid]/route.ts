import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, context: { params: Promise<{ uuid: string }> }) {
  try {
    const { uuid } = await context.params;

    // Use anon key for this public route, or admin privileges since no user is logged in
    const supabase = await createClient(); // this will fall back to anon if not signed in

    // Fetch proposal by ID
    const { data: proposal, error: propError } = await supabase
      .from("proposals")
      .select("*, itinerary_versions(*, itineraries(content), tour_costing_sheets(*))")
      .eq("id", uuid)
      .single();

    if (propError || !proposal) {
      return NextResponse.json({ error: "Quote not found or link has expired." }, { status: 404 });
    }

    // We only want to return safe, public data.
    // Map over versions and construct a client-safe payload.
    const safeVersions = proposal.itinerary_versions?.map((v: any) => {
       const costing = v.tour_costing_sheets && v.tour_costing_sheets.length > 0 ? v.tour_costing_sheets[0] : null;
       const perPersonUsd = costing?.per_person_usd || 0;
       
       return {
          id: v.id,
          version_label: v.version_label,
          itinerary_summary: v.itineraries?.content?.summary || "No summary available",
          itinerary_days: v.itineraries?.content?.days?.map((d: any) => ({
             day: d.day,
             title: d.title,
             hotel_tier: d.hotel_tier,
             meal_plan: d.meal_plan
          })),
          per_person_usd: perPersonUsd,
          is_accepted: v.is_accepted
       };
    });

    return NextResponse.json({
       success: true,
       quote: {
          id: proposal.id,
          title: proposal.title,
          status: proposal.status,
          versions: safeVersions
       }
    });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
