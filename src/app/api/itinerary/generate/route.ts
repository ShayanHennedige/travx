import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `You are a senior destination travel planner specializing in Sri Lanka, with expert knowledge of:
- Realistic road routes and driving times
- Practical daily travel pacing
- Hotel categorization by star level and guest preferences
- Logical geographic sequencing (no backtracking or inefficient routing)

You generate luxury, realistic, and operationally feasible itineraries suitable for professional travel agencies.

Core Rules (Must Follow Strictly):
1. Day-by-Day Structure: Generate a Day 01 → Final Day itinerary
2. Each day must include:
   - Morning, afternoon, and evening activities
   - Driving times between locations (be realistic - Sri Lanka roads can be slow)
   - Accurate driving distances in kilometers (km) between locations
   - Overnight location with hotel recommendation matching the star category
   - SITE DESCRIPTIONS: Every activity MUST include a brief 1-2 sentence description of the attraction, city, or site being visited. This description should highlight what makes the location special, its historical/cultural significance, or natural beauty. This is mandatory for all activities.
3. Geographic Logic: Plan routes that minimize backtracking
4. Activity Distribution: Spread selected activities logically across days
5. Realistic Pacing: Don't overload days - factor in rest, meals, and travel fatigue
6. Hotel Recommendations: Suggest specific hotels or areas matching the star category
7. DISTANCE FORMAT (MANDATORY - THIS IS CRITICAL):
   - Every driving_distance_km field MUST use format: "X km from [Origin Location] to [Destination Location]"
   - Examples: "10 km from Katunayake to CMB", "150 km from Negombo to Sigiriya", "80 km from Kandy to Nuwara Eliya"
   - NEVER use incomplete formats like "10 km from CMB" or "150 km from Negombo" - ALWAYS include both origin and destination
   - For airport transfers: "X km from Katunayake Airport to [Hotel Location]" or "X km from [Hotel Location] to Katunayake Airport"
   - For city transfers: "X km from [Previous City] to [Next City]"
8. Distance Accuracy (Strict):
   - Provide km for each travel leg (from the previous location to the next location)
   - Provide total km for the full day (sum of all legs)
   - Use the most realistic drivable route (not straight-line distance)
   - If an external routing source is available (e.g., Google Maps/OSRM), base km on it; otherwise use best-available realistic estimates and keep them consistent with the stated driving times.
   - IMPORTANT: The mileage for each day itinerary should be displayed in km.

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
          "site_description": "1-2 sentence description of the attraction, city, or site highlighting its significance, history, or natural beauty",
          "duration": "X hours",
          "driving_time": "X hours from previous" (optional),
          "driving_distance_km": "X km from [Origin Location] to [Destination Location]" (optional, e.g., "10 km from Katunayake to CMB", "150 km from Negombo to Sigiriya")
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


export async function POST(request: Request) {
  try {
    const { inquiry_id } = await request.json();

    if (!inquiry_id) {
      return NextResponse.json(
        { error: "inquiry_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch inquiry details
    const { data: inquiry, error: inquiryError } = await supabase
      .from("inquiries")
      .select("*")
      .eq("id", inquiry_id)
      .single();

    if (inquiryError || !inquiry) {
      return NextResponse.json(
        { error: "Inquiry not found" },
        { status: 404 }
      );
    }

    // Build the user prompt with inquiry data
    const hotelTypesStr = Array.isArray(inquiry.hotel_type) ? inquiry.hotel_type.join(", ") : (inquiry.hotel_type || "4-5 Star");
    const mealPlanStr = Array.isArray(inquiry.meal_plan) ? inquiry.meal_plan.join(", ") : (inquiry.meal_plan || "Not specified");
    const roomCategoryStr = Array.isArray(inquiry.room_category) ? inquiry.room_category.join(", ") : (inquiry.room_category || "Deluxe");
    const isMixedMode = inquiry.mixed_mode === true;

    const mixedModeInstruction = isMixedMode
      ? `\n\nIMPORTANT - MIXED MODE ENABLED: The client has requested a MIXED setup. You MUST assign DIFFERENT hotel tiers and meal plans to DIFFERENT days based on the "Client Desires" text below. Do NOT use the same hotel tier for every day. Read the client's preferences carefully and map specific tiers to specific days. For example, if they want luxury in the city and budget in the countryside, assign "5-Star" to city days and "3-Star" to rural days.`
      : "";

    const userPrompt = `Generate a detailed day-by-day itinerary for Sri Lanka with the following requirements:

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
- Adults: ${inquiry.no_of_pax || 1}
- Children: ${inquiry.no_of_children || 0}
- Total Travelers: ${(inquiry.no_of_pax || 1) + (inquiry.no_of_children || 0)}

**Accommodation:**
- Hotel Star Category Options: ${hotelTypesStr}
- Room Category Options: ${roomCategoryStr}
- Meal Plan Options: ${mealPlanStr}
- Rooms Required: ${(inquiry.rooms_dbl || 0)} Double, ${(inquiry.rooms_sgl || 0)} Single, ${(inquiry.rooms_tpl || 0)} Triple, ${(inquiry.rooms_qtpl || 0)} Quad
${mixedModeInstruction}

**Client Desires & Preferences:**
${inquiry.client_desires || "No specific desires mentioned. Please follow standard best practices for the chosen activities."}

**Preferred Activities:**
${inquiry.activities && (inquiry.activities as string[]).length > 0
        ? (inquiry.activities as string[]).map((a: string) => `- ${a}`).join("\n")
        : "- General sightseeing and cultural experiences"}

CRITICAL: For EVERY day in your output, you MUST include these structured fields:
- "hotel_tier": The specific hotel star category for THIS day (e.g., "5 Star", "3 Star", "Boutique")
- "room_category": The room category for THIS day (e.g., "Deluxe", "Standard", "Superior")  
- "meal_plan": The meal plan for THIS day (e.g., "BB", "HB", "FB")

Please create a realistic, well-paced itinerary that:
1. Starts from Colombo airport (Katunayake) on Day 1
2. Ends back at Colombo airport (Katunayake) on the final day
3. Incorporates the selected activities logically
4. Suggests appropriate hotels for the ${hotelTypesStr} category and considering the ${mealPlanStr} meal plan
5. Considers the group has ${inquiry.no_of_children || 0} children (if any, include family-friendly options)
6. Closely following the "Client Desires & Preferences" mentioned above to reform and personalize the itinerary
7. The mileage for each day itinerary should be displayed in km.
8. MANDATORY FORMAT: Every driving_distance_km field MUST be "X km from [Origin] to [Destination]". Examples: "10 km from Katunayake Airport to Negombo", "150 km from Negombo to Sigiriya", "80 km from Kandy to Nuwara Eliya". Never use incomplete formats.
9. MANDATORY: Every activity MUST include a site_description field with 1-2 engaging sentences describing the attraction, city, or site being visited. Highlight its historical significance, cultural importance, or natural beauty.

Return ONLY the JSON object, no additional text.`;

    const startTime = Date.now();

    // Call OpenAI API
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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error("OpenAI API error:", errorData);
      return NextResponse.json(
        { error: "Failed to generate itinerary", details: errorData },
        { status: 500 }
      );
    }

    const openaiData = await openaiResponse.json();
    const generationTime = Date.now() - startTime;
    const rawContent = openaiData.choices[0]?.message?.content || "";

    // Parse the JSON from the response
    let itineraryContent;
    try {
      // Remove markdown code blocks if present
      const cleanContent = rawContent
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      itineraryContent = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse itinerary JSON:", parseError);
      return NextResponse.json(
        { error: "Failed to parse generated itinerary", raw: rawContent },
        { status: 500 }
      );
    }

    // Prevent duplicate: if an itinerary already exists for this inquiry, update it instead
    const { data: existing } = await supabase
      .from("itineraries")
      .select("id")
      .eq("inquiry_id", inquiry_id)
      .limit(1)
      .single();

    let itinerary;
    if (existing?.id) {
      const { data: updated, error: updateError } = await supabase
        .from("itineraries")
        .update({
          content: itineraryContent,
          raw_response: rawContent,
          model: openaiData.model,
          tokens_used: openaiData.usage?.total_tokens,
          generation_time_ms: generationTime,
          status: "completed",
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (updateError) {
        console.error("Failed to update itinerary:", updateError);
        return NextResponse.json({ error: "Failed to update itinerary", details: updateError.message }, { status: 500 });
      }
      itinerary = updated;
    } else {
      const { data: inserted, error: saveError } = await supabase
        .from("itineraries")
        .insert({
          inquiry_id,
          content: itineraryContent,
          raw_response: rawContent,
          model: openaiData.model,
          tokens_used: openaiData.usage?.total_tokens,
          generation_time_ms: generationTime,
          status: "completed",
        })
        .select()
        .single();
      if (saveError) {
        console.error("Failed to save itinerary:", saveError);
        return NextResponse.json({ error: "Failed to save itinerary", details: saveError.message }, { status: 500 });
      }
      itinerary = inserted;
    }

    // Update inquiry status to 'in_progress' only if still at 'new'
    await supabase
      .from("inquiries")
      .update({ status: "in_progress" })
      .eq("id", inquiry_id)
      .eq("status", "new");

    return NextResponse.json({
      success: true,
      itinerary: {
        id: itinerary.id,
        content: itineraryContent,
        created_at: itinerary.created_at,
      },
    });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
