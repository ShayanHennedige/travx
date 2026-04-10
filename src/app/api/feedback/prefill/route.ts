import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET - Get inquiry/itinerary data for pre-filling feedback form
export async function GET(request: Request) {
  // Use admin client if available to bypass RLS for this public lookup
  const adminSupabase = createAdminClient();
  const anonSupabase = await createClient();
  const supabase = adminSupabase || anonSupabase;

  const { searchParams } = new URL(request.url);

  const token = searchParams.get("token");
  const reference = searchParams.get("reference");
  const inquiryId = searchParams.get("inquiry_id");
  const itineraryId = searchParams.get("itinerary_id");
  const tourId = searchParams.get("tour_id");
  const groupInquiryId = searchParams.get("group_inquiry_id");
  const email = searchParams.get("email");

  console.log("Feedback prefill request params:", { email, reference, token, tourId });

  let effectiveInquiryId = inquiryId;
  let effectiveGroupInquiryId = groupInquiryId;
  let referenceTourId: string | null = null;
  let referenceItineraryId: string | null = null;

  // 1. Reference Number Lookup (Primary method)
  if (reference) {
    const refStr = reference.trim();
    console.log("Searching for tour by reference:", refStr);

    const { data: indv } = await supabase.from("inquiries").select("id").eq("inquiry_number", refStr).maybeSingle();
    const { data: grp } = await supabase.from("group_inquiries").select("id").eq("inquiry_number", refStr).maybeSingle();

    const inquiryIdFound = indv?.id || grp?.id;
    const type = indv?.id ? "inquiry_id" : "group_inquiry_id";

    if (inquiryIdFound) {
      const { data: itinerary } = await supabase.from("itineraries").select("id").eq(type, inquiryIdFound).maybeSingle();
      if (itinerary) {
        referenceItineraryId = itinerary.id;
        const { data: tour } = await supabase.from("tours").select("id").eq("itinerary_id", itinerary.id).maybeSingle();
        if (tour) referenceTourId = tour.id;
      }
    }
  }

  // 2. Email Lookup (Fallback for legacy support)
  else if (email) {
    console.log("Searching for tour by email:", email.trim());
    const emailStr = email.trim();

    // Find inquiries matching this email
    const { data: inquiries } = await supabase
      .from("inquiries")
      .select("id, status, created_at")
      .eq("client_email", emailStr)
      .order("created_at", { ascending: false });

    const { data: groupInquiries } = await supabase
      .from("group_inquiries")
      .select("id, status, created_at, client_email, head_client_email")
      .or(`client_email.eq.${emailStr},head_client_email.eq.${emailStr}`)
      .order("created_at", { ascending: false });

    const candidates: Array<{ id: string; type: "individual" | "group"; date: string }> = [];
    if (inquiries) inquiries.forEach(i => candidates.push({ id: i.id, type: "individual", date: i.created_at }));
    if (groupInquiries) groupInquiries.forEach(i => candidates.push({ id: i.id, type: "group", date: i.created_at }));

    candidates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    for (const candidate of candidates) {
      const { data: itinerary } = await supabase
        .from("itineraries")
        .select("id")
        .eq(candidate.type === "individual" ? "inquiry_id" : "group_inquiry_id", candidate.id)
        .maybeSingle();

      if (itinerary) {
        const { data: tour } = await supabase
          .from("tours")
          .select("id")
          .eq("itinerary_id", itinerary.id)
          .maybeSingle();

        if (tour) {
          referenceTourId = tour.id;
          console.log(`Found tour ${tour.id} for email ${emailStr}`);
          break;
        }
      }
    }

    if (!referenceTourId && candidates.length === 0) {
      return NextResponse.json({ error: "No bookings found for this email" }, { status: 404 });
    }
  }

  // 3. Token Lookup
  let tokenId: string | null = null;
  let tokenTourId: string | null = null;
  if (token) {
    const { data: record } = await supabase.from("feedback_tokens").select("*").eq("token", token).maybeSingle();
    if (record && !record.used_at && new Date(record.expires_at) > new Date()) {
      tokenTourId = record.tour_id;
      tokenId = record.id;
    }
  }

  try {
    let customerData: any = null;
    let hotels: string[] = [];
    let driverData: any = null;
    let vehicleData: any = null;
    let finalTourId: string | null = null;
    let finalItineraryId: string | null = null;

    // A candidate list to rank the best tour to show
    const tourCandidates: any[] = [];

    // Gather Candidate Tour IDs
    const searchTourIds = new Set<string>();
    if (tourId) searchTourIds.add(tourId);
    if (tokenTourId) searchTourIds.add(tokenTourId);
    if (referenceTourId) searchTourIds.add(referenceTourId);

    // If Email was provided and we found candidate inquiry IDs
    if (email) {
      const emailStr = email.trim();
      const { data: inquires } = await supabase.from("inquiries").select("id").eq("client_email", emailStr);
      const { data: groupInquires } = await supabase.from("group_inquiries").select("id").or(`client_email.eq.${emailStr},head_client_email.eq.${emailStr}`);

      const inquiryIds = (inquires || []).map(i => i.id);
      const groupInquiryIds = (groupInquires || []).map(i => i.id);

      if (inquiryIds.length > 0 || groupInquiryIds.length > 0) {
        const { data: toursByInquiry } = await supabase.from("tours").select("id").in("inquiry_id", inquiryIds);
        const { data: toursByGroup } = await supabase.from("tours").select("id").in("group_inquiry_id", groupInquiryIds);

        (toursByInquiry || []).forEach(t => searchTourIds.add(t.id));
        (toursByGroup || []).forEach(t => searchTourIds.add(t.id));
      }
    }

    console.log(`Searching across ${searchTourIds.size} candidate tours:`, Array.from(searchTourIds));

    // Fetch details for ALL candidate tours to pick the best one
    for (const tid of Array.from(searchTourIds)) {
      const { data: tour } = await supabase
        .from("tours")
        .select(`
          *,
          inquiries(*),
          group_inquiries(*),
          drivers(*),
          itineraries(*)
        `)
        .eq("id", tid)
        .maybeSingle();

      if (tour) {
        let score = 0;
        if (tour.driver_id || tour.drivers) score += 10;
        if (tour.itinerary_id || tour.itineraries) score += 5;
        if (tour.client_name) score += 1;

        tourCandidates.push({ tour, score });
      }
    }

    // Sort by score descending, then by created_at descending
    tourCandidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.tour.created_at).getTime() - new Date(a.tour.created_at).getTime();
    });

    const bestMatch = tourCandidates[0]?.tour;

    if (bestMatch) {
      console.log(`Selected best tour: ${bestMatch.id} (Score: ${tourCandidates[0].score})`);
      finalTourId = bestMatch.id;
      finalItineraryId = bestMatch.itinerary_id;

      // Extract Customer Info
      const inquiryObj = Array.isArray(bestMatch.inquiries) ? bestMatch.inquiries[0] : bestMatch.inquiries;
      const groupObj = Array.isArray(bestMatch.group_inquiries) ? bestMatch.group_inquiries[0] : bestMatch.group_inquiries;

      if (inquiryObj) {
        customerData = {
          name: inquiryObj.client_name || `${inquiryObj.first_name || ""} ${inquiryObj.last_name || ""}`.trim() || bestMatch.client_name,
          email: inquiryObj.client_email || "",
          country: inquiryObj.client_nationality || inquiryObj.country || null,
          inquiry_id: inquiryObj.id,
          group_inquiry_id: null,
          type: "individual",
        };
      } else if (groupObj) {
        customerData = {
          name: `${groupObj.head_first_name || ""} ${groupObj.head_last_name || ""}`.trim() || bestMatch.client_name,
          email: groupObj.client_email || groupObj.head_client_email || "",
          country: groupObj.country || null,
          inquiry_id: null,
          group_inquiry_id: groupObj.id,
          type: "group",
        };
      } else if (bestMatch.client_name) {
        customerData = {
          name: bestMatch.client_name,
          email: "",
          country: null,
          inquiry_id: bestMatch.inquiry_id,
          group_inquiry_id: bestMatch.group_inquiry_id,
          type: bestMatch.group_inquiry_id ? "group" : "individual",
        };
      }

      // Extract Hotels
      const itineraryObj = Array.isArray(bestMatch.itineraries) ? bestMatch.itineraries[0] : bestMatch.itineraries;
      if (itineraryObj?.content) {
        const content = typeof itineraryObj.content === 'string' ? JSON.parse(itineraryObj.content) : itineraryObj.content;
        if (content?.days) {
          const hSet = new Set<string>();
          const days = content.days.length > 1 ? content.days.slice(0, -1) : content.days;
          days.forEach((d: any) => { if (d.hotel_suggestion) hSet.add(d.hotel_suggestion.trim()); });
          hotels = Array.from(hSet);
        }
      }

      // Extract Driver info
      const driverObj = Array.isArray(bestMatch.drivers) ? bestMatch.drivers[0] : bestMatch.drivers;
      if (driverObj) {
        driverData = { id: driverObj.id, name: driverObj.name, vehicle_type: driverObj.vehicle_type, vehicle_number: driverObj.vehicle_number };
        vehicleData = { type: driverObj.vehicle_type, number: driverObj.vehicle_number };
      }

      // Fallback 1: Direct lookup if tour has driver_id but join failed
      if (!driverData && bestMatch.driver_id) {
        console.log("Joined driver data null, attempting direct lookup for driver_id:", bestMatch.driver_id);
        const { data: directDriver } = await supabase.from("drivers").select("*").eq("id", bestMatch.driver_id).maybeSingle();
        if (directDriver) {
          driverData = { id: directDriver.id, name: directDriver.name, vehicle_type: directDriver.vehicle_type, vehicle_number: directDriver.vehicle_number };
          vehicleData = { type: directDriver.vehicle_type, number: directDriver.vehicle_number };
        }
      }

      // Fallback 2: "Own Logic" - Search across ALL other tours for this inquiry to find a driver assignment
      if (!driverData && (bestMatch.inquiry_id || bestMatch.group_inquiry_id)) {
        console.log("No driver found on best tour, searching alternatives for inquiry:", bestMatch.inquiry_id || bestMatch.group_inquiry_id);
        const { data: altTours } = await supabase
          .from("tours")
          .select("*, drivers(*)")
          .or(`inquiry_id.eq.${bestMatch.inquiry_id},group_inquiry_id.eq.${bestMatch.group_inquiry_id}`)
          .not("driver_id", "is", null);

        if (altTours && altTours.length > 0) {
          const altWithDriver = altTours.find(t => t.drivers && (Array.isArray(t.drivers) ? t.drivers.length > 0 : true));
          if (altWithDriver) {
            const d = Array.isArray(altWithDriver.drivers) ? altWithDriver.drivers[0] : altWithDriver.drivers;
            console.log("Found alternative tour with driver:", d.name);
            driverData = { id: d.id, name: d.name, vehicle_type: d.vehicle_type, vehicle_number: d.vehicle_number };
            vehicleData = { type: d.vehicle_type, number: d.vehicle_number };
          }
        }
      }
    }

    return NextResponse.json({
      customer: customerData,
      hotels: hotels,
      driver: driverData,
      vehicle: vehicleData,
      tour_id: finalTourId,
      itinerary_id: finalItineraryId,
      inquiry_id: customerData?.inquiry_id || null,
      group_inquiry_id: customerData?.group_inquiry_id || null,
      token_id: tokenId || null,
      is_from_token: !!token,
    });

  } catch (error: any) {
    console.error("Critical error in feedback prefill:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

