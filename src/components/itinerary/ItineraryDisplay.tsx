"use client";

import { format } from "date-fns";

interface ItineraryDay {
  day: number;
  date: string;
  title: string;
  overnight_location: string;
  hotel_suggestion: string;
  activities: {
    time: string;
    activity: string;
    location: string;
    duration: string;
    driving_time?: string;
  }[];
  meals: {
    breakfast: string;
    lunch: string;
    dinner: string;
  };
  notes?: string;
}

interface ItineraryContent {
  title: string;
  summary: string;
  days: ItineraryDay[];
  practical_notes: string[];
  total_driving_hours: string;
}

interface ItineraryDisplayProps {
  itinerary: ItineraryContent;
  createdAt: string;
}

export function ItineraryDisplay({ itinerary, createdAt }: ItineraryDisplayProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
        <h2 className="text-2xl font-bold text-primary-900 mb-2">
          {itinerary.title}
        </h2>
        <p className="text-primary-700">{itinerary.summary}</p>
        <div className="flex items-center gap-4 mt-4 text-sm text-primary-600">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {itinerary.days.length} Days
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ~{itinerary.total_driving_hours} driving
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Generated
          </span>
        </div>
        <p className="text-xs text-primary-500 mt-2">
          Generated on {format(new Date(createdAt), "MMMM d, yyyy 'at' h:mm a")}
        </p>
      </div>

      {/* Day by Day Itinerary */}
      <div className="space-y-4">
        {itinerary.days.map((day) => (
          <div key={day.day} className="card overflow-hidden">
            {/* Day Header */}
            <div className="bg-surface-100 px-6 py-4 border-b border-surface-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm">
                      {day.day}
                    </span>
                    <div>
                      <h3 className="font-semibold text-surface-900">{day.title}</h3>
                      <p className="text-sm text-surface-500">
                        {day.date && format(new Date(day.date), "EEEE, MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-surface-700">
                    Overnight: {day.overnight_location}
                  </p>
                  <p className="text-xs text-surface-500">{day.hotel_suggestion}</p>
                </div>
              </div>
            </div>

            {/* Activities */}
            <div className="p-6">
              <div className="space-y-4">
                {day.activities.map((activity, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0 w-20">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        activity.time.toLowerCase().includes('morning') 
                          ? 'bg-amber-100 text-amber-700'
                          : activity.time.toLowerCase().includes('afternoon')
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {activity.time}
                      </span>
                    </div>
                    <div className="flex-grow">
                      <p className="text-surface-900 font-medium">{activity.activity}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-surface-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {activity.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {activity.duration}
                        </span>
                        {activity.driving_time && (
                          <span className="flex items-center gap-1 text-orange-600">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                            </svg>
                            {activity.driving_time}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Meals */}
              <div className="mt-6 pt-4 border-t border-surface-200">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-surface-500 text-xs uppercase tracking-wider mb-1">Breakfast</p>
                    <p className="text-surface-700">{day.meals.breakfast}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs uppercase tracking-wider mb-1">Lunch</p>
                    <p className="text-surface-700">{day.meals.lunch}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs uppercase tracking-wider mb-1">Dinner</p>
                    <p className="text-surface-700">{day.meals.dinner}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {day.notes && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">Note:</span> {day.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Practical Notes */}
      {itinerary.practical_notes && itinerary.practical_notes.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Practical Tips
          </h3>
          <ul className="space-y-2">
            {itinerary.practical_notes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-surface-700">
                <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
