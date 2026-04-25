"use client";

import { format } from "date-fns";

interface ItineraryDay {
  day: number;
  date: string;
  title: string;
  overnight_location: string;
  hotel_suggestion: string;
  day_total_km?: string;
  activities: {
    time: string;
    activity: string;
    location: string;
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

interface ItineraryContent {
  title: string;
  summary: string;
  days: ItineraryDay[];
  practical_notes: string[];
  total_driving_hours: string;
  total_distance_km?: string;
}

interface ItineraryDisplayProps {
  itinerary: ItineraryContent;
  createdAt: string;
}

export function ItineraryDisplay({ itinerary, createdAt }: ItineraryDisplayProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-8 bg-surface-900 border border-surface-800 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight leading-tight">
            {itinerary.title}
          </h2>
          <p className="text-surface-400 text-sm md:text-base mb-6 leading-relaxed max-w-3xl">{itinerary.summary}</p>
          <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-surface-800">
            <span className="flex items-center gap-2 text-sm font-medium text-surface-200 bg-surface-800 px-3 py-1.5 rounded-full border border-surface-700">
              <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {itinerary.days.length} Days
            </span>
            <span className="flex items-center gap-2 text-sm font-medium text-surface-200 bg-surface-800 px-3 py-1.5 rounded-full border border-surface-700">
              <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ~{itinerary.total_driving_hours} driving
            </span>
            {itinerary.total_distance_km && (
              <span className="flex items-center gap-2 text-sm font-medium text-surface-200 bg-surface-800 px-3 py-1.5 rounded-full border border-surface-700">
                <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                {itinerary.total_distance_km}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Day by Day Itinerary */}
      <div className="space-y-6">
        {itinerary.days.map((day) => (
          <div key={day.day} className="card overflow-hidden group">
            {/* Day Header */}
            <div className="bg-surface-900 px-4 md:px-6 py-5 border-b border-surface-800 text-white transition-colors duration-300">
              <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex-shrink-0 w-10 md:w-12 h-10 md:h-12 rounded-xl bg-surface-800 border border-surface-700 text-primary-400 flex items-center justify-center font-bold text-base md:text-lg shadow-sm group-hover:bg-primary-400 group-hover:text-surface-900 transition-colors duration-300">
                    {day.day}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-bold text-white mb-1 leading-tight">{day.title}</h3>
                    <p className="text-xs md:text-sm text-surface-400 font-medium">
                      {day.date && format(new Date(day.date), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="md:text-right flex-shrink-0 md:pl-4 md:border-l border-surface-800 w-full md:w-auto">
                  <p className="text-[10px] uppercase tracking-wider text-surface-500 font-bold mb-1">Overnight</p>
                  <p className="text-sm font-bold text-white leading-tight">{day.overnight_location}</p>
                  <p className="text-xs text-surface-400 mt-0.5">{day.hotel_suggestion}</p>
                  {day.day_total_km && (
                    <p className="text-[10px] font-bold text-surface-300 mt-2 md:mt-1 bg-surface-800 px-2 py-0.5 rounded-full inline-block">
                      {day.day_total_km}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Activities */}
            <div className="p-4 md:p-6 bg-[var(--bg-surface)]">
              <div className="relative border-l-2 border-surface-100 ml-2 md:ml-4 space-y-8 my-2">
                {day.activities.map((activity, idx) => (
                  <div key={idx} className="relative pl-6 md:pl-8">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white bg-primary-400 shadow-sm ring-4 ring-primary-50"></div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      {/* Time Badge - Simplified */}
                      <div className="md:col-span-2 flex-shrink-0">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-surface-100 text-surface-600 border border-surface-200 min-w-[80px] justify-center uppercase tracking-wide">
                          {activity.time}
                        </span>
                      </div>

                      {/* Activity Content */}
                      <div className="md:col-span-10 space-y-2">
                        <h4 className="text-base font-bold text-surface-900 leading-tight">
                          {activity.activity}
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                          <div className="flex items-center gap-1.5 text-surface-500">
                            <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {activity.location}
                          </div>

                          <div className="flex items-center gap-1.5 text-surface-500">
                            <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {activity.duration}
                          </div>

                          {activity.driving_time && (
                            <div className="flex items-center gap-1.5 text-primary-600 font-medium">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                              </svg>
                              {activity.driving_time}
                            </div>
                          )}

                          {activity.driving_distance_km && (
                            <div className="flex items-center gap-1.5 text-primary-600 font-medium">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                              </svg>
                              {activity.driving_distance_km}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Meals */}
              <div className="mt-8 pt-6 border-t border-surface-100">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-surface-50 p-3 rounded-lg border border-surface-100 flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-surface-400 font-bold mb-1">Breakfast</span>
                    <span className="text-sm font-medium text-surface-900">{day.meals.breakfast}</span>
                  </div>
                  <div className="bg-surface-50 p-3 rounded-lg border border-surface-100 flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-surface-400 font-bold mb-1">Lunch</span>
                    <span className="text-sm font-medium text-surface-900">{day.meals.lunch}</span>
                  </div>
                  <div className="bg-surface-50 p-3 rounded-lg border border-surface-100 flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-surface-400 font-bold mb-1">Dinner</span>
                    <span className="text-sm font-medium text-surface-900">{day.meals.dinner}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {day.notes && (
                <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-100 flex gap-3 text-sm text-primary-800">
                  <svg className="w-5 h-5 text-primary-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className="font-bold block mb-0.5 text-primary-900">Note</span>
                    {day.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Practical Notes */}
      {itinerary.practical_notes && itinerary.practical_notes.length > 0 && (
        <div className="card p-6 border border-surface-200 shadow-sm bg-surface-50/50">
          <h3 className="text-lg font-bold text-surface-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Practical Tips
          </h3>
          <ul className="space-y-3">
            {itinerary.practical_notes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-surface-700 bg-white p-3 rounded-lg border border-surface-200">
                <svg className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
