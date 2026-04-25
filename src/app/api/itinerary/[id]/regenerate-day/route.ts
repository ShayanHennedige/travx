import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recalculateTourTotals } from "@/lib/itinerary-utils";

const SYSTEM_PROMPT = `You are a senior destination travel planner specializing in Sri Lanka.
Your task is to correct and sync the logistical details of a travel itinerary after a human agent manually updated a Hotel Name (and optionally location) for a specific day.
You must return a valid JSON array representing the corrected Days.

Core Rules:
1. ONLY modify the day(s) provided in the "DAYS TO FIX" section.
2. PRESERVE the 'day', 'date', and core 'activities' format for each day.
3. UPDATE 'overnight_location' if the new hotel is in a different city or area.
4. RECALCULATE 'day_total_km' and the 'driving_distance_km' & 'driving_time' within the 'activities' array.
   - For the modified day: recalculate driving from PREVIOUS location to NEW location.
   - For the next day (if included): recalculate driving from the NEW modified day location to the next day's destination.
5. DISTANCE FORMAT (MUST FOLLOW): "X km from [Origin] to [Destination]".
6. UPDATE the 'meals' object so that 'breakfast' and 'dinner' smoothly reference the appropriate hotel names.

Return ONLY a JSON array containing the corrected Day objects in chronological order:
[
  {
    "day": 1,
    "date": "YYYY-MM-DD",
    "title": "Day title",
    "overnight_location": "Corrected City/Area",
    "hotel_suggestion": "The hotel name",
    "hotel_tier": "...",
    "room_category": "...",
    "meal_plan": "...",
    "day_total_km": "X km",
    "activities": [
      {
        "time": "Morning/Afternoon/Evening",
        "activity": "Description",
        "location": "Place name",
        "site_description": "1-2 sentence description",
        "duration": "X hours",
        "driving_time": "X hours from previous",
        "driving_distance_km": "X km from [Origin Location] to [Destination Location]"
      }
    ],
    "meals": {
      "breakfast": "Location/Hotel",
      "lunch": "Location suggestion",
      "dinner": "Location/Hotel"
    },
    "notes": "Any special notes"
  }
]`;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: itineraryId } = await context.params;
    const body = await request.json();
    const { content, dayIndex } = body;

    if (!content || typeof dayIndex !== "number" || dayIndex < 0 || dayIndex >= content.days.length) {
      return NextResponse.json({ error: "Invalid content or dayIndex" }, { status: 400 });
    }

    const previousDay = dayIndex > 0 ? content.days[dayIndex - 1] : null;
    const currentDay = content.days[dayIndex];
    const nextDay = dayIndex < content.days.length - 1 ? content.days[dayIndex + 1] : null;

    // Build the array of days that need fixing
    const daysToFix = [currentDay];
    if (nextDay) {
      daysToFix.push(nextDay);
    }

    const userPrompt = `
The user has modified Day ${currentDay.day}. Specifically, they changed the 'hotel_suggestion' to: "${currentDay.hotel_suggestion}".

Here is the context:
${previousDay ? `PREVIOUS DAY (Day ${previousDay.day}): They stayed overnight in ${previousDay.overnight_location} at ${previousDay.hotel_suggestion}.` : "This is Day 1 (Arrival Day). Assume starting from CMB Airport."}

DAYS TO FIX:
${JSON.stringify(daysToFix, null, 2)}

Based on the new hotel for Day ${currentDay.day} ("${currentDay.hotel_suggestion}"), deeply analyze and adjust the 'overnight_location', travel distances, driving times, and meals for the affected day(s).
Crucially, if there is a Day ${currentDay.day + 1} provided, you MUST update its starting journey parameters to account for the new origin location of Day ${currentDay.day}.
Output only the JSON array containing the corrected day(s).`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error("OpenAI API error during day regeneration");
    }

    const openaiData = await response.json();
    const rawContent = openaiData.choices[0]?.message?.content || "";
    const cleanContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let correctedDays: any[];
    try {
      const parsed = JSON.parse(cleanContent);
      correctedDays = Array.isArray(parsed) ? parsed : [parsed];
    } catch (err) {
      throw new Error("Failed to parse regenerated Days JSON");
    }

    // Splice the corrected days into the full itinerary
    const updatedDays = [...content.days];
    for (const correctedDay of correctedDays) {
      const dayIdx = updatedDays.findIndex((d: any) => d.day === correctedDay.day);
      if (dayIdx !== -1) {
        updatedDays[dayIdx] = { ...updatedDays[dayIdx], ...correctedDay };
      }
    }

    const updatedContentRaw = { ...content, days: updatedDays };
    const updatedContent = recalculateTourTotals(updatedContentRaw as any);

    // Auto-save to database
    const supabase = await createClient();
    const { error: saveError } = await supabase
      .from("itineraries")
      .update({ content: updatedContent })
      .eq("id", itineraryId);

    if (saveError) {
      throw saveError;
    }

    return NextResponse.json({ success: true, updatedContent });

  } catch (err: any) {
    console.error("Day cascade regeneration failed:", err);
    return NextResponse.json({ error: "Internal server error", details: err.message }, { status: 500 });
  }
}
