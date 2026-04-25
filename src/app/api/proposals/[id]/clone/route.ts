import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: proposalId } = await context.params;
    const body = await request.json();
    const { version_id, new_label } = body;

    if (!version_id) {
      return NextResponse.json({ error: "version_id is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch the source version
    const { data: sourceVersion, error: versionError } = await supabase
      .from("itinerary_versions")
      .select("*")
      .eq("id", version_id)
      .single();

    if (versionError || !sourceVersion) {
       return NextResponse.json({ error: "Source version not found" }, { status: 404 });
    }

    // 2. Fetch and clone the itinerary
    let newItineraryId = null;
    if (sourceVersion.itinerary_id) {
        const { data: sourceItinerary, error: itineraryError } = await supabase
            .from("itineraries")
            .select("*")
            .eq("id", sourceVersion.itinerary_id)
            .single();

        if (!itineraryError && sourceItinerary) {
            // Remove id and timestamps for duplication
            const { id, created_at, updated_at, ...itineraryCopy } = sourceItinerary;
            const { data: newItinerary, error: saveItineraryErr } = await supabase
                .from("itineraries")
                .insert(itineraryCopy)
                .select()
                .single();
            if (!saveItineraryErr && newItinerary) {
                newItineraryId = newItinerary.id;
            }
        }
    }

    // 3. Fetch and clone the costing sheet (if exists)
    let newCostingId = null;
    if (sourceVersion.costing_sheet_id) {
        const { data: sourceCosting, error: costingError } = await supabase
            .from("tour_costing_sheets")
            .select("*")
            .eq("id", sourceVersion.costing_sheet_id)
            .single();
        
        if (!costingError && sourceCosting) {
            const { id, created_at, updated_at, ...costingCopy } = sourceCosting;
            if (newItineraryId) costingCopy.itinerary_id = newItineraryId; // relink
            
            const { data: newCosting, error: saveCostingErr } = await supabase
                .from("tour_costing_sheets")
                .insert(costingCopy)
                .select()
                .single();
            
            if (!saveCostingErr && newCosting) {
                newCostingId = newCosting.id;
            }
        }
    }

    // 4. Create the new version record
    const { data: clonedVersion, error: cloneError } = await supabase
        .from("itinerary_versions")
        .insert({
            proposal_id: proposalId,
            version_label: new_label || `${sourceVersion.version_label} (Copy)`,
            itinerary_id: newItineraryId,
            costing_sheet_id: newCostingId,
            is_accepted: false,
             is_locked: false
        })
        .select()
        .single();
    
    if (cloneError) {
        throw new Error(`Failed to create cloned version record: ${cloneError.message}`);
    }

    return NextResponse.json({ success: true, version: clonedVersion });

  } catch (err: any) {
    console.error("Server error during clone:", err);
    return NextResponse.json({ error: "Internal server error", details: err.message }, { status: 500 });
  }
}
