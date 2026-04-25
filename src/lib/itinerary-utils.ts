export interface ItineraryDay {
  day: number;
  date: string;
  title: string;
  overnight_location: string;
  hotel_suggestion: string;
  hotel_tier?: string;
  room_category?: string;
  meal_plan?: string;
  day_total_km?: string;
  activities: {
    time: string;
    activity: string;
    location: string;
    site_description?: string;
    duration: string;
    driving_time?: string;
    driving_distance_km?: string;
  }[];
  meals: {
    breakfast: string;
    lunch: string;
    dinner: string;
  };
  notes?: string;
}

export interface ItineraryContent {
  title: string;
  summary: string;
  days: ItineraryDay[];
  practical_notes: string[];
  total_driving_hours: string;
  total_distance_km?: string;
}

/**
 * Recalculates the total driving hours and distance for an itinerary based on individual days.
 * Extracts numbers from strings like "1,250 km" or "3.5 hours".
 */
export function recalculateTourTotals(content: ItineraryContent): ItineraryContent {
  let totalKm = 0;
  let totalHours = 0;

  content.days.forEach((day: ItineraryDay) => {
    let dayKmFromActivities = 0;
    
    // 1. Sum up durations and distances from activities
    day.activities?.forEach(activity => {
      // Sum hours (e.g., "2.5 hours")
      if (activity.driving_time) {
        const cleanTime = activity.driving_time.replace(/,/g, "");
        const hourMatch = cleanTime.match(/(\d+(\.\d+)?)/);
        if (hourMatch) {
          totalHours += parseFloat(hourMatch[1]);
        }
      }

      // Sum distances from activities (e.g., "110 km from Ella to Mirissa")
      if (activity.driving_distance_km) {
        const cleanDist = activity.driving_distance_km.replace(/,/g, "");
        const actKmMatch = cleanDist.match(/(\d+(\.\d+)?)/);
        if (actKmMatch) {
          dayKmFromActivities += parseFloat(actKmMatch[1]);
        }
      }
    });

    // 2. Parse day_total_km (the summary badge)
    let dayBadgeKm = 0;
    if (day.day_total_km) {
      const cleanBadge = day.day_total_km.replace(/,/g, "");
      const kmMatch = cleanBadge.match(/(\d+(\.\d+)?)/);
      if (kmMatch) {
        dayBadgeKm = parseFloat(kmMatch[1]);
      }
    }

    // 3. Logic: Use the LARGER of the two (badge vs activity sum)
    // Sometimes the badge includes general city driving not in transfer activities
    // Sometimes the activities are more up to date if the badge wasn't updated
    totalKm += Math.max(dayBadgeKm, dayKmFromActivities);
  });

  return {
    ...content,
    total_driving_hours: `Approximate total ${Math.ceil(totalHours)} hours`,
    total_distance_km: `Approximate total ${Math.ceil(totalKm)} km`
  };
}
