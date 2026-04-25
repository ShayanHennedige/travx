import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { passengerManifestSchema } from "@/lib/validations/inquiry";

export async function POST(request: Request, context: { params: Promise<{ uuid: string }> }) {
  try {
    const { uuid } = await context.params;
    const body = await request.json();
    const { version_id, passengers } = body;

    if (!version_id || !passengers || !Array.isArray(passengers) || passengers.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate passengers
    for (const p of passengers) {
        const result = passengerManifestSchema.safeParse(p);
        if (!result.success) {
            return NextResponse.json({ error: "Validation failed", details: result.error.issues }, { status: 400 });
        }
    }

    const supabase = await createClient();

    // 1. Fetch the proposal to ensure it exists and get inquiry_id
    const { data: proposal, error: propError } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", uuid)
      .single();

    if (propError || !proposal) {
      return NextResponse.json({ error: "Invalid quote link." }, { status: 404 });
    }

    // 2. Mark specific version as accepted and lock others
    const { error: versionError } = await supabase
        .from("itinerary_versions")
        .update({ is_accepted: true, is_locked: true })
        .eq("id", version_id);
    
    if (versionError) throw versionError;

    // Lock other versions for this proposal
    await supabase
        .from("itinerary_versions")
        .update({ is_locked: true })
        .eq("proposal_id", uuid)
        .neq("id", version_id);

    // 3. Mark proposal as accepted
    const { error: propUpdateError } = await supabase
        .from("proposals")
        .update({ status: "accepted" })
        .eq("id", uuid);
    
    if (propUpdateError) throw propUpdateError;

    // 4. Update inquiry status to confirmed
    if (proposal.inquiry_id) {
       await supabase.from("inquiries").update({ status: "confirmed" }).eq("id", proposal.inquiry_id);
    }

    // 5. Create the Tour Record (stub logic for now to establish relation)
    // In a full implementation, you would copy full costing/itinerary data into a finalized Tour structure
    const { data: tour, error: tourError } = await supabase
        .from("tours")
        .insert({
           inquiry_id: proposal.inquiry_id,
           tour_code: `TR-${Math.floor(1000 + Math.random() * 9000)}-${new Date().getFullYear()}`,
           status: "active",
           start_date: new Date().toISOString().split("T")[0], // Placeholder
           end_date: new Date().toISOString().split("T")[0],   // Placeholder
           pax_count: passengers.length
        })
        .select()
        .single();
    
    if (tourError) throw tourError;

    // 6. Write passenger manifests
    const manifestPayload = passengers.map((p: any) => ({
        tour_id: tour.id,
        inquiry_id: proposal.inquiry_id,
        first_name: p.first_name,
        last_name: p.last_name,
        passport_number: p.passport_number,
        passport_expiry: p.passport_expiry,
        nationality: p.nationality,
        date_of_birth: p.date_of_birth,
        dietary_requirements: p.dietary_requirements || null,
        is_lead_passenger: p.is_lead_passenger || false
    }));

    const { error: manifestError } = await supabase
        .from("passenger_manifests")
        .insert(manifestPayload);

    if (manifestError) throw manifestError;

    return NextResponse.json({ success: true, message: "Quote accepted successfully and Tour created." });

  } catch (err: any) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Internal server error", details: err.message }, { status: 500 });
  }
}
