import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Calculate happiness percentage from scores
function calculateHappiness(scores: (number | null | undefined)[]): number {
  const validScores = scores.filter((s) => s !== null && s !== undefined) as number[];
  if (validScores.length === 0) return 0;
  return Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length);
}

// Extract keywords from remarks
function extractKeywords(remarks: (string | null)[]): Record<string, number> {
  const keywords: Record<string, number> = {};
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "as", "is", "was", "are", "were", "be", "been", "have", "has", "had",
    "do", "does", "did", "will", "would", "should", "could", "may", "might", "must",
    "can", "this", "that", "these", "those", "i", "you", "he", "she", "it", "we", "they",
    "very", "really", "quite", "too", "so", "much", "many", "more", "most", "some", "any"
  ]);

  remarks.forEach((remark) => {
    if (!remark) return;
    
    const words = remark
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));

    words.forEach((word) => {
      keywords[word] = (keywords[word] || 0) + 1;
    });
  });

  // Sort by frequency and return top 20
  return Object.entries(keywords)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .reduce((acc, [word, count]) => {
      acc[word] = count;
      return acc;
    }, {} as Record<string, number>);
}

// GET - Get feedback analytics
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  // Build base query
  let query = supabase.from("feedback").select("*");

  // Apply filters
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const country = searchParams.get("country");
  const ageGroup = searchParams.get("age_group");
  const tourId = searchParams.get("tour_id");

  if (dateFrom) {
    // Include the entire start day
    query = query.gte("submitted_at", `${dateFrom}T00:00:00.000Z`);
  }
  if (dateTo) {
    // Include the entire end day (up to end of day)
    query = query.lte("submitted_at", `${dateTo}T23:59:59.999Z`);
  }
  if (country) {
    query = query.eq("country", country);
  }
  if (ageGroup) {
    query = query.eq("age_group", ageGroup);
  }
  if (tourId) {
    query = query.eq("tour_id", tourId);
  }

  const { data: feedback, error } = await query;

  if (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!feedback || feedback.length === 0) {
    return NextResponse.json({
      countryDistribution: {},
      ageGroupDistribution: {},
      categoryHappiness: {},
      overallHappiness: 0,
      lowScores: [],
      keywords: {},
      totalFeedback: 0,
    });
  }

  // Country-wise distribution
  const countryDistribution: Record<string, number> = {};
  feedback.forEach((f) => {
    const country = f.country || "Unknown";
    countryDistribution[country] = (countryDistribution[country] || 0) + 1;
  });

  // Age group distribution
  const ageGroupDistribution: Record<string, number> = {};
  feedback.forEach((f) => {
    const ageGroup = f.age_group || "Unknown";
    ageGroupDistribution[ageGroup] = (ageGroupDistribution[ageGroup] || 0) + 1;
  });

  // Category happiness percentages
  const airportScores = feedback.map((f) => f.airport_welcome_score);
  const airportHappiness = calculateHappiness(airportScores);

  // Hotel quality average
  const hotelScores: number[] = [];
  feedback.forEach((f) => {
    if (f.hotel_quality_scores) {
      const scores = Object.values(f.hotel_quality_scores) as number[];
      hotelScores.push(...scores);
    }
  });
  const hotelHappiness = hotelScores.length > 0 
    ? Math.round(hotelScores.reduce((sum, score) => sum + score, 0) / hotelScores.length)
    : 0;

  // Driver average (all driver scores)
  const driverScores: number[] = [];
  feedback.forEach((f) => {
    if (f.driver_language_score !== null) driverScores.push(f.driver_language_score);
    if (f.driver_appearance_score !== null) driverScores.push(f.driver_appearance_score);
    if (f.driver_hospitality_score !== null) driverScores.push(f.driver_hospitality_score);
    if (f.driver_helpfulness_score !== null) driverScores.push(f.driver_helpfulness_score);
  });
  const driverHappiness = driverScores.length > 0
    ? Math.round(driverScores.reduce((sum, score) => sum + score, 0) / driverScores.length)
    : 0;

  // Vehicle average
  const vehicleScores: number[] = [];
  feedback.forEach((f) => {
    if (f.vehicle_quality_score !== null) vehicleScores.push(f.vehicle_quality_score);
    if (f.vehicle_cleanliness_score !== null) vehicleScores.push(f.vehicle_cleanliness_score);
    if (f.vehicle_comfort_score !== null) vehicleScores.push(f.vehicle_comfort_score);
  });
  const vehicleHappiness = vehicleScores.length > 0
    ? Math.round(vehicleScores.reduce((sum, score) => sum + score, 0) / vehicleScores.length)
    : 0;

  // Overall experience
  const overallScores = feedback.map((f) => f.overall_experience_score);
  const overallHappiness = calculateHappiness(overallScores);

  // Overall happiness (average of all category averages)
  const categoryAverages = [airportHappiness, hotelHappiness, driverHappiness, vehicleHappiness, overallHappiness]
    .filter((score) => score > 0);
  const totalOverallHappiness = categoryAverages.length > 0
    ? Math.round(categoryAverages.reduce((sum, score) => sum + score, 0) / categoryAverages.length)
    : 0;

  // Low scores (< 60%)
  const lowScores: Array<{ category: string; score: number; feedbackId: string }> = [];
  feedback.forEach((f) => {
    if (f.airport_welcome_score !== null && f.airport_welcome_score < 60) {
      lowScores.push({ category: "Airport Welcome", score: f.airport_welcome_score, feedbackId: f.id });
    }
    if (f.overall_experience_score !== null && f.overall_experience_score < 60) {
      lowScores.push({ category: "Overall Experience", score: f.overall_experience_score, feedbackId: f.id });
    }
    
    // Check driver scores
    const driverAvg = calculateHappiness([
      f.driver_language_score,
      f.driver_appearance_score,
      f.driver_hospitality_score,
      f.driver_helpfulness_score,
    ]);
    if (driverAvg > 0 && driverAvg < 60) {
      lowScores.push({ category: "Driver", score: driverAvg, feedbackId: f.id });
    }
    
    // Check vehicle scores
    const vehicleAvg = calculateHappiness([
      f.vehicle_quality_score,
      f.vehicle_cleanliness_score,
      f.vehicle_comfort_score,
    ]);
    if (vehicleAvg > 0 && vehicleAvg < 60) {
      lowScores.push({ category: "Vehicle", score: vehicleAvg, feedbackId: f.id });
    }
  });

  // Extract keywords from remarks
  const remarks = feedback.map((f) => f.remarks);
  const keywords = extractKeywords(remarks);

  return NextResponse.json({
    countryDistribution,
    ageGroupDistribution,
    categoryHappiness: {
      airportWelcome: airportHappiness,
      hotelQuality: hotelHappiness,
      driver: driverHappiness,
      vehicle: vehicleHappiness,
      overallExperience: overallHappiness,
    },
    overallHappiness: totalOverallHappiness,
    lowScores: lowScores.slice(0, 10), // Top 10 low scores
    keywords,
    totalFeedback: feedback.length,
  });
}
