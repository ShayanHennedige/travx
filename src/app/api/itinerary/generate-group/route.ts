import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `You are a senior destination travel planner specializing in Sri Lanka, with expert knowledge of:
- Realistic road routes and driving times
- Practical daily travel pacing
- Hotel categorization by star level and guest preferences
- Logical geographic sequencing (no backtracking or inefficient routing)
- Group travel logistics and coordination

You generate luxury, realistic, and operationally feasible itineraries suitable for professional travel agencies handling group tours.

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
5. Realistic Pacing: Don't overload days - factor in rest, meals, and travel fatigue (especially important for groups)
6. Hotel Recommendations: Suggest specific hotels or areas matching the star category that can accommodate groups
7. Group Considerations: Factor in group dynamics, coordination time, and group-friendly venues
8. DISTANCE FORMAT (MANDATORY - THIS IS CRITICAL):
   - Every driving_distance_km field MUST use format: "X km from [Origin Location] to [Destination Location]"
   - Examples: "10 km from Katunayake to CMB", "150 km from Negombo to Sigiriya", "80 km from Kandy to Nuwara Eliya"
   - NEVER use incomplete formats like "10 km from CMB" or "150 km from Negombo" - ALWAYS include both origin and destination
   - For airport transfers: "X km from Katunayake Airport to [Hotel Location]" or "X km from [Hotel Location] to Katunayake Airport"
   - For city transfers: "X km from [Previous City] to [Next City]"
9. Distance Accuracy (Strict):
   - Provide accurate driving distances in kilometers (km) between locations
   - Provide km for each travel leg (from the previous location to the next location)
   - Provide total km for the full day (sum of all legs) in day_total_km field
   - Use the most realistic drivable route (not straight-line distance)
   - IMPORTANT: The mileage for each day itinerary should be displayed in km.

Output your response as a valid JSON object with this structure:
{
  "title": "Sri Lanka [X] Day Group Adventure",
  "summary": "Brief 1-2 sentence overview",
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "Day title",
      "overnight_location": "City/Area name",
      "hotel_suggestion": "Hotel name or area (X star)",
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
  "practical_notes": ["Array of practical tips for group travel"],
  "total_driving_hours": "Approximate total",
  "total_distance_km": "Approximate total km"
}`;

export async function POST(request: Request) {
  try {
    const { group_inquiry_id } = await request.json();

    if (!group_inquiry_id) {
      return NextResponse.json(
        { error: "group_inquiry_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch group inquiry details
    const { data: inquiry, error: inquiryError } = await supabase
      .from("group_inquiries")
      .select("*")
      .eq("id", group_inquiry_id)
      .single();

    if (inquiryError || !inquiry) {
      return NextResponse.json(
        { error: "Group inquiry not found" },
        { status: 404 }
      );
    }

    // Fetch group members
    const { data: members } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_inquiry_id", group_inquiry_id);

    const adultCount = members?.filter(m => m.member_type === "adult").length || inquiry.no_of_adults || 1;
    const childCount = members?.filter(m => m.member_type === "child").length || inquiry.no_of_children || 0;
    const totalPax = adultCount + childCount;

    // Normalize array fields from DB (hotel_type, room_category, meal_plan are text[] in DB)
    const hotelTypeStr = Array.isArray(inquiry.hotel_type)
      ? inquiry.hotel_type.join(", ")
      : (inquiry.hotel_type || "4-5 Star");
    const roomCategoryStr = Array.isArray(inquiry.room_category)
      ? inquiry.room_category.join(", ")
      : (inquiry.room_category || "Deluxe");
    const mealPlanStr = Array.isArray(inquiry.meal_plan)
      ? inquiry.meal_plan.join(", ")
      : (inquiry.meal_plan || "Not specified");

    // Build the user prompt with inquiry data
    const userPrompt = `Generate a detailed day-by-day GROUP TOUR itinerary for Sri Lanka with the following requirements:

**Trip Details:**
- Arrival Date: ${inquiry.arriving_date}
- Departure Date: ${inquiry.departure_date}
- Number of Nights: ${inquiry.no_of_nights}
- Arrival Airport: CMB (Colombo Bandaranaike International Airport)

**Group Information:**
- Group Leader: ${inquiry.head_first_name ? `${inquiry.head_first_name} ${inquiry.head_last_name}` : "Valued Guest"}
- Total Group Size: ${totalPax} travelers
- Adults: ${adultCount}
- Children: ${childCount}

**Accommodation:**
- Hotel Star Category: ${hotelTypeStr}
- Room Category: ${roomCategoryStr}
- Meal Plan: ${mealPlanStr}
- Rooms Required: ${(inquiry.rooms_dbl || 0)} Double, ${(inquiry.rooms_sgl || 0)} Single, ${(inquiry.rooms_tpl || 0)} Triple, ${(inquiry.rooms_qtpl || 0)} Quad
- Total Rooms: ${(inquiry.rooms_dbl || 0) + (inquiry.rooms_sgl || 0) + (inquiry.rooms_tpl || 0) + (inquiry.rooms_qtpl || 0)}

**Client Desires & Preferences:**
${inquiry.client_desires || "No specific desires mentioned. Please follow standard best practices for group travel in Sri Lanka."}

**Preferred Activities:**
${inquiry.activities && (inquiry.activities as string[]).length > 0
        ? (inquiry.activities as string[]).map((a: string) => `- ${a}`).join("\n")
        : "- General sightseeing and cultural experiences suitable for groups"}

Please create a realistic, well-paced GROUP TOUR itinerary that:
1. Starts from Colombo airport (Katunayake) on Day 1
2. Ends back at Colombo airport (Katunayake) on the final day
3. Incorporates the selected activities logically
4. Suggesting appropriate hotels for the ${hotelTypeStr} category and considering the ${mealPlanStr} meal plan
5. ${childCount > 0 ? `Includes family-friendly options for the ${childCount} children in the group` : "Focuses on adult-oriented experiences"}
6. Closely following the "Client Desires & Preferences" mentioned above to reform and personalize the group itinerary
7. Considers group dynamics - allow buffer time for group coordination
8. Recommends group-friendly restaurants and venues
9. Suggests a suitable transport arrangement for ${totalPax} travelers
10. The mileage for each day itinerary should be displayed in km.
11. MANDATORY FORMAT: Every driving_distance_km field MUST be "X km from [Origin] to [Destination]". Examples: "10 km from Katunayake Airport to Negombo", "150 km from Negombo to Sigiriya", "80 km from Kandy to Nuwara Eliya". Never use incomplete formats.
12. MANDATORY: Every activity MUST include a site_description field with 1-2 engaging sentences describing the attraction, city, or site being visited.

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

    // Save to database - use group_inquiry_id field for group inquiries
    const { data: itinerary, error: saveError } = await supabase
      .from("itineraries")
      .insert({
        group_inquiry_id: group_inquiry_id,
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
      return NextResponse.json(
        { error: "Failed to save itinerary", details: saveError.message },
        { status: 500 }
      );
    }

    // Automatically update group inquiry status to 'in_progress'
    await supabase
      .from("group_inquiries")
      .update({ status: "in_progress" })
      .eq("id", group_inquiry_id);

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
