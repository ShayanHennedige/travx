import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const EDIT_SYSTEM_PROMPT = `You are a senior destination travel planner specializing in Sri Lanka. You have been given an existing travel itinerary and a modification request from the user.

Your task is to:
1. Understand the user's requested changes (written in plain English)
2. Apply those changes to the existing itinerary
3. Maintain the same JSON structure
4. Ensure the modified itinerary remains realistic and operationally feasible
5. Preserve any parts of the itinerary that weren't mentioned for modification

Rules:
- Keep driving times realistic
- Maintain logical geographic sequencing
- Don't overload days when adding activities
- Adjust hotel recommendations if locations change significantly
- Update meal locations if overnight stays change
- Provide accurate driving distances in kilometers (km) between locations
- Include day_total_km for each day (sum of all driving legs that day)
- IMPORTANT: The mileage for each day itinerary should be displayed in km.

Distance Accuracy (Strict):
- Provide km for each travel leg (from the previous location to the next location) in activities with driving_distance_km
- Provide total km for the full day (sum of all legs) in day_total_km
- Use the most realistic drivable route (not straight-line distance)
- If an external routing source is available (e.g., Google Maps/OSRM), base km on it; otherwise use best-available realistic estimates and keep them consistent with the stated driving times.
- CRITICAL FORMAT: All driving_distance_km values MUST follow the format "X km from [Origin Location] to [Destination Location]" (e.g., "10 km from Katunayake to CMB", "150 km from Negombo to Sigiriya", "80 km from Kandy to Nuwara Eliya"). Never use abbreviated formats like "10 km from CMB" without the origin. Always specify both the origin and destination locations clearly.

Return the COMPLETE updated itinerary as a valid JSON object with the same structure:
{
  "title": "...",
  "summary": "...",
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
          "duration": "X hours",
          "driving_time": "X hours from previous" (optional),
          "driving_distance_km": "X km from [Origin Location] to [Destination Location]" (optional, e.g., "10 km from Katunayake to CMB", "150 km from Negombo to Sigiriya")
        }
      ],
      "meals": {...},
      "notes": "..." (optional)
    }
  ],
  "practical_notes": [...],
  "total_driving_hours": "...",
  "total_distance_km": "Approximate total km"
}

Return ONLY the JSON object, no additional text or explanations.`;

export async function POST(request: Request) {
  try {
    const { itinerary_id, modification_request, current_content } = await request.json();

    if (!itinerary_id || !modification_request || !current_content) {
      return NextResponse.json(
        { error: "itinerary_id, modification_request, and current_content are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Build the user prompt
    const userPrompt = `Here is the current itinerary:

\`\`\`json
${JSON.stringify(current_content, null, 2)}
\`\`\`

**User's Modification Request:**
${modification_request}

Please apply these changes and return the complete updated itinerary as JSON.`;

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
          { role: "system", content: EDIT_SYSTEM_PROMPT },
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
        { error: "Failed to edit itinerary", details: errorData },
        { status: 500 }
      );
    }

    const openaiData = await openaiResponse.json();
    const generationTime = Date.now() - startTime;
    const rawContent = openaiData.choices[0]?.message?.content || "";

    // Parse the JSON from the response
    let updatedContent;
    try {
      const cleanContent = rawContent
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      updatedContent = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse edited itinerary JSON:", parseError);
      return NextResponse.json(
        { error: "Failed to parse edited itinerary", raw: rawContent },
        { status: 500 }
      );
    }

    // Update the itinerary in database
    const { data: itinerary, error: updateError } = await supabase
      .from("itineraries")
      .update({
        content: updatedContent,
        raw_response: rawContent,
        tokens_used: openaiData.usage?.total_tokens,
        generation_time_ms: generationTime,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itinerary_id)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update itinerary:", updateError);
      return NextResponse.json(
        { error: "Failed to save updated itinerary", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      itinerary: {
        id: itinerary.id,
        content: updatedContent,
        created_at: itinerary.created_at,
        updated_at: itinerary.updated_at,
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
