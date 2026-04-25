import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `You are a senior destination travel planner specializing in Sri Lanka, with expert knowledge of:
- Realistic road routes and driving times
- Practical daily travel pacing
- Hotel categorization by star level and guest preferences
- Logical geographic sequencing

You generate luxury, realistic, and operationally feasible itineraries suitable for professional travel agencies.

Core Rules (Must Follow Strictly):
1. Day-by-Day Structure: Generate a Day 01 → Final Day itinerary
2. Each day must include:
   - Morning, afternoon, and evening activities
   - Driving times between locations
   - Accurate driving distances in kilometers (km) between locations
   - Overnight location with hotel recommendation matching the targeted tier
   - SITE DESCRIPTIONS: Every activity MUST include a brief 1-2 sentence description of the attraction, city, or site being visited.
3. DISTANCE FORMAT (MANDATORY - THIS IS CRITICAL):
   - Every driving_distance_km field MUST use format: "X km from [Origin Location] to [Destination Location]"
4. Distance Accuracy (Strict):
   - Provide km for each travel leg (from the previous location to the next location)
   - Provide total km for the full day (sum of all legs)
   - The mileage for each day itinerary should be displayed in km.

Output your response as a valid JSON object with this structure:
{
  "title": "Sri Lanka [X] Day Adventure",
  "summary": "Brief 1-2 sentence overview",
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "Day title",
      "overnight_location": "City/Area name",
      "hotel_suggestion": "Hotel name or area (X star)",
      "hotel_tier": "The specific star category for this day (e.g., 5 Star, 3 Star, Boutique)",
      "room_category": "Room category for this day (e.g., Deluxe, Standard, Superior)",
      "meal_plan": "Meal plan for this day (e.g., BB, HB, FB, AI)",
      "day_total_km": "X km",
      "activities": [
        {
          "time": "Morning/Afternoon/Evening",
          "activity": "Description",
          "location": "Place name",
          "site_description": "1-2 sentence description of the attraction",
          "duration": "X hours",
          "driving_time": "X hours from previous" (optional),
          "driving_distance_km": "X km from [Origin Location] to [Destination Location]" (optional)
        }
      ],
      "meals": {
        "breakfast": "Location/Hotel",
        "lunch": "Location suggestion",
        "dinner": "Location/Hotel"
      },
      "notes": "Any special notes for the day" (optional)
    }
  ],
  "practical_notes": ["Array of practical tips"],
  "total_driving_hours": "Approximate total",
  "total_distance_km": "Approximate total km"
}`;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: proposalId } = await context.params;
    const body = await request.json();
    const { version_labels } = body; // Array of strings e.g. ["Budget", "Standard", "Luxury"]

    if (!version_labels || !Array.isArray(version_labels) || version_labels.length === 0) {
      return NextResponse.json({ error: "version_labels array is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch proposal
    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Fetch corresponding inquiry
    let inquiry;
    if (proposal.inquiry_id) {
       const { data, error } = await supabase.from("inquiries").select("*").eq("id", proposal.inquiry_id).single();
       if (error) throw error;
       inquiry = data;
    } else if (proposal.group_inquiry_id) {
       const { data, error } = await supabase.from("group_inquiries").select("*").eq("id", proposal.group_inquiry_id).single();
       if (error) throw error;
       inquiry = data;
    } else {
        return NextResponse.json({ error: "Proposal has no valid inquiry linkage" }, { status: 400 });
    }

    const isGroup = !!proposal.group_inquiry_id;
    const noOfPax = isGroup ? inquiry.no_of_adults : inquiry.no_of_pax;
    
    // Construct base instructions
    const activitiesStr = (inquiry.activities && (inquiry.activities as string[]).length > 0)
        ? (inquiry.activities as string[]).map((a: string) => `- ${a}`).join("\n")
        : "- General sightseeing and cultural experiences";

    const basePrompt = `
**Trip Details:**
- Arrival Date: ${inquiry.arriving_date}
- Departure Date: ${inquiry.departure_date}
- Number of Nights: ${inquiry.no_of_nights}
- Arrival Airport: CMB (Colombo Bandaranaike International Airport)
- Arrival Flight: ${inquiry.arrival_flight_no || "TBA"} at ${inquiry.arrival_time || "TBA"}
- Departure Flight: ${inquiry.departure_flight_no || "TBA"} at ${inquiry.departure_time || "TBA"}

CRITICAL FLIGHT LOGISTICS: You MUST explicitly factor in the Arrival Time and Departure Time when scheduling activities. 
- If arrival time is late afternoon or evening, limit Day 1 to just airport transfer and hotel check-in/rest.
- If departure time is early morning, the final day should focus strictly on airport transit.

**Travelers:**
- Adults: ${noOfPax || 1}
- Children: ${inquiry.no_of_children || 0}
- Total Travelers: ${(noOfPax || 1) + (inquiry.no_of_children || 0)}

**Rooms Required:** ${(inquiry.rooms_dbl || 0)} Double, ${(inquiry.rooms_sgl || 0)} Single, ${(inquiry.rooms_tpl || 0)} Triple, ${(inquiry.rooms_qtpl || 0)} Quad

**Client Desires & Preferences:**
${inquiry.client_desires || "No specific desires mentioned. Please follow standard best practices for the chosen activities."}

**Preferred Activities:**
${activitiesStr}
`;

    // Process each version in parallel
    const generateVersion = async (label: string) => {
      // Modify constraints based on the requested tier
      let hotelPreference = "";
      if (label.toLowerCase() === "budget") {
          hotelPreference = "Strictly use budget-friendly 3-Star hotels or guesthouses. BB Meal Plan preferred unless specified otherwise.";
      } else if (label.toLowerCase() === "luxury") {
          hotelPreference = "Strictly use 5-Star luxury hotels, boutique properties, and premium villas. HB or AI Meal Plan preferred.";
      } else {
          hotelPreference = "Use 4-Star standard hotels. HB or BB Meal Plan.";
      }

      const versionPrompt = `Generate a detailed day-by-day itinerary for Sri Lanka.
This is a **${label.toUpperCase()}** tier itinerary.
${hotelPreference}

${basePrompt}

CRITICAL: For EVERY day in your output, you MUST include these structured fields:
- "hotel_tier": The specific hotel star category for THIS day
- "room_category": The room category for THIS day 
- "meal_plan": The meal plan for THIS day

Return ONLY the JSON object, no additional text.`;

       const startTime = Date.now();
       const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
         },
         body: JSON.stringify({
           model: "gpt-4o",
           messages: [
             { role: "system", content: SYSTEM_PROMPT },
             { role: "user", content: versionPrompt },
           ],
           temperature: 0.7,
           max_tokens: 4000,
         }),
       });

       if (!openaiResponse.ok) {
         throw new Error(`OpenAI API error for version ${label}`);
       }

       const openaiData = await openaiResponse.json();
       const rawContent = openaiData.choices[0]?.message?.content || "";
       let itineraryContent;
       try {
         const cleanContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
         itineraryContent = JSON.parse(cleanContent);
       } catch (err) {
           throw new Error(`Failed to parse JSON for version ${label}`);
       }

       // Save to itineraries table
       const { data: itinerary, error: saveError } = await supabase
         .from("itineraries")
         .insert({
           inquiry_id: proposal.inquiry_id || null,
           group_inquiry_id: proposal.group_inquiry_id || null,
           proposal_id: proposalId,
           content: itineraryContent,
           raw_response: rawContent,
           model: openaiData.model,
           generation_time_ms: Date.now() - startTime,
           status: "draft",
         })
         .select()
         .single();

       if (saveError) throw new Error(`DB Save error for ${label}: ${saveError.message}`);

       // Now create the itinerary_versions link
       const { data: versionLink, error: linkError } = await supabase
         .from("itinerary_versions")
         .insert({
            proposal_id: proposalId,
            version_label: label,
            itinerary_id: itinerary.id
         })
         .select()
         .single();

       if (linkError) throw new Error(`Version link error: ${linkError.message}`);

       return { label, itinerary, versionInfo: versionLink };
    };

    // Run generations in parallel
    const results = await Promise.allSettled(version_labels.map(generateVersion));
    
    const successfulVersions = results.filter(r => r.status === "fulfilled").map(r => (r as PromiseFulfilledResult<any>).value);
    const failedVersions = results.filter(r => r.status === "rejected").map(r => (r as PromiseRejectedResult).reason);

    // Update proposal status to 'generated' instead of draft
    await supabase.from("proposals").update({ status: "generated" }).eq("id", proposalId);

    // Also update original inquiry
    if (proposal.inquiry_id) {
       await supabase.from("inquiries").update({ status: "in_progress" }).eq("id", proposal.inquiry_id);
    }

    return NextResponse.json({
      success: true,
      versions: successfulVersions,
      failed: failedVersions.length > 0 ? failedVersions : undefined
    });

  } catch (err: any) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Internal server error", details: err.message }, { status: 500 });
  }
}
