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
  const { searchParams } = new URL(request.url);
  const supabase = await createClient();

  // Build base query - include driver info
  let query = supabase.from("feedback").select(`
    *,
    drivers(id, name, vehicle_type, vehicle_number)
  `);

  // Apply filters
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const country = searchParams.get("country");
  const tourId = searchParams.get("tour_id");

  if (dateFrom) {
    query = query.gte("submitted_at", `${dateFrom}T00:00:00.000Z`);
  }
  if (dateTo) {
    query = query.lte("submitted_at", `${dateTo}T23:59:59.999Z`);
  }
  if (country) {
    query = query.eq("country", country);
  }
  if (tourId) {
    query = query.eq("tour_id", tourId);
  }

  const { data: feedbackData, error } = await query;

  if (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const feedback = (feedbackData || []) as any[];

  if (feedback.length === 0) {
    return NextResponse.json({
      countryDistribution: {},
      categoryHappiness: {},
      overallHappiness: 0,
      lowScores: [],
      keywords: {},
      totalFeedback: 0,
      driverPerformance: [],
      hotelPerformance: [],
      vehiclePerformance: [],
    });
  }

  // Country-wise distribution
  const countryDistribution: Record<string, number> = {};
  feedback.forEach((f) => {
    const country = f.country || "Unknown";
    countryDistribution[country] = (countryDistribution[country] || 0) + 1;
  });

  // Category happiness percentages
  const airportScores = feedback.map((f) => f.airport_welcome_score);
  const airportHappiness = calculateHappiness(airportScores);

  // Hotel quality average
  const hotelScoresList: number[] = [];
  feedback.forEach((f) => {
    if (f.hotel_quality_scores) {
      const scores = Object.values(f.hotel_quality_scores) as number[];
      hotelScoresList.push(...scores);
    }
  });
  const hotelHappiness = hotelScoresList.length > 0
    ? Math.round(hotelScoresList.reduce((sum, score) => sum + score, 0) / hotelScoresList.length)
    : 0;

  // Driver average
  const driverScoresList: number[] = [];
  feedback.forEach((f) => {
    const s = [
      f.driver_language_score,
      f.driver_appearance_score,
      f.driver_hospitality_score,
      f.driver_helpfulness_score
    ].filter(v => v !== null && v !== undefined) as number[];
    driverScoresList.push(...s);
  });
  const driverHappiness = driverScoresList.length > 0
    ? Math.round(driverScoresList.reduce((sum, score) => sum + score, 0) / driverScoresList.length)
    : 0;

  // Vehicle average
  const vehicleScoresList: number[] = [];
  feedback.forEach((f) => {
    const s = [
      f.vehicle_quality_score,
      f.vehicle_cleanliness_score,
      f.vehicle_comfort_score
    ].filter(v => v !== null && v !== undefined) as number[];
    vehicleScoresList.push(...s);
  });
  const vehicleHappiness = vehicleScoresList.length > 0
    ? Math.round(vehicleScoresList.reduce((sum, score) => sum + score, 0) / vehicleScoresList.length)
    : 0;

  // Overall experience
  const overallScores = feedback.map((f) => f.overall_experience_score);
  const overallHappiness = calculateHappiness(overallScores);

  // Total happiness calculation (weighted equally)
  const categoryAverages = [airportHappiness, hotelHappiness, driverHappiness, vehicleHappiness, overallHappiness]
    .filter((score) => score > 0);
  const totalOverallHappiness = categoryAverages.length > 0
    ? Math.round(categoryAverages.reduce((sum, score) => sum + score, 0) / categoryAverages.length)
    : 0;

  // --- Detailed Performance Aggregation ---

  // 1. Driver Performance
  const driverStats = new Map<string, { name: string; totalScore: number; count: number; vehicleType: string }>();
  feedback.forEach((f) => {
    const key = f.driver_id || (f.drivers?.name ? `name-${f.drivers.name}` : null);
    if (!key) return;

    const scores = [
      f.driver_language_score,
      f.driver_appearance_score,
      f.driver_hospitality_score,
      f.driver_helpfulness_score
    ].filter(s => s !== null && s !== undefined) as number[];

    if (scores.length === 0) return;
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    if (!driverStats.has(key)) {
      driverStats.set(key, {
        name: f.drivers?.name || "Unknown Driver",
        totalScore: 0,
        count: 0,
        vehicleType: f.drivers?.vehicle_type || "N/A"
      });
    }

    const stat = driverStats.get(key)!;
    stat.totalScore += avgScore;
    stat.count += 1;
  });

  const driverPerformance = Array.from(driverStats.values()).map(stat => ({
    name: stat.name,
    vehicleType: stat.vehicleType,
    averageScore: Math.round(stat.totalScore / stat.count),
    reviewCount: stat.count
  })).sort((a, b) => b.averageScore - a.averageScore);

  // 2. Hotel Performance
  const hotelStats = new Map<string, { totalScore: number; count: number }>();
  feedback.forEach((f) => {
    if (f.hotel_quality_scores) {
      Object.entries(f.hotel_quality_scores).forEach(([hotelName, score]) => {
        const val = score as number;
        if (val > 0) {
          if (!hotelStats.has(hotelName)) {
            hotelStats.set(hotelName, { totalScore: 0, count: 0 });
          }
          const stat = hotelStats.get(hotelName)!;
          stat.totalScore += val;
          stat.count += 1;
        }
      });
    }
  });

  const hotelPerformance = Array.from(hotelStats.entries()).map(([name, stat]) => ({
    name,
    averageScore: Math.round(stat.totalScore / stat.count),
    reviewCount: stat.count
  })).sort((a, b) => b.averageScore - a.averageScore);

  // 3. Vehicle Performance
  const vehicleStats = new Map<string, { type: string; number: string; totalScore: number; count: number }>();
  feedback.forEach((f) => {
    const vehicleName = f.drivers?.vehicle_type || "Standard Vehicle";
    const vehicleNo = f.drivers?.vehicle_number || "N/A";
    const key = `${vehicleName}-${vehicleNo}`;

    const scores = [
      f.vehicle_quality_score,
      f.vehicle_cleanliness_score,
      f.vehicle_comfort_score
    ].filter(s => s !== null && s !== undefined) as number[];

    if (scores.length === 0) return;
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    if (!vehicleStats.has(key)) {
      vehicleStats.set(key, { type: vehicleName, number: vehicleNo, totalScore: 0, count: 0 });
    }

    const stat = vehicleStats.get(key)!;
    stat.totalScore += avgScore;
    stat.count += 1;
  });

  const vehiclePerformance = Array.from(vehicleStats.values()).map(stat => ({
    type: stat.type,
    number: stat.number,
    averageScore: Math.round(stat.totalScore / stat.count),
    reviewCount: stat.count
  })).sort((a, b) => b.averageScore - a.averageScore);

  // Low scores (< 60%)
  const lowScores: Array<{ category: string; score: number; feedbackId: string; guest: string }> = [];
  feedback.forEach((f) => {
    const guest = f.guest_name || "Guest";
    if (f.airport_welcome_score !== null && f.airport_welcome_score < 60) {
      lowScores.push({ category: "Airport Welcome", score: f.airport_welcome_score, feedbackId: f.id, guest });
    }
    if (f.overall_experience_score !== null && f.overall_experience_score < 60) {
      lowScores.push({ category: "Overall", score: f.overall_experience_score, feedbackId: f.id, guest });
    }
  });

  // Extract keywords from remarks
  const remarks = feedback.map((f) => f.remarks);
  const keywords = extractKeywords(remarks);

  const result = {
    countryDistribution,
    categoryHappiness: {
      airportWelcome: airportHappiness,
      hotelQuality: hotelHappiness,
      driver: driverHappiness,
      vehicle: vehicleHappiness,
      overallExperience: overallHappiness,
    },
    overallHappiness: totalOverallHappiness,
    lowScores: lowScores.slice(0, 10),
    keywords,
    totalFeedback: feedback.length,
    driverPerformance,
    hotelPerformance,
    vehiclePerformance
  };

  return NextResponse.json(result);
}
