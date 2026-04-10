"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

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

interface ItineraryEditorProps {
  itineraryId: string;
  initialContent: ItineraryContent;
}

export function ItineraryEditor({ itineraryId, initialContent }: ItineraryEditorProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<ItineraryContent>(initialContent);
  const [editRequest, setEditRequest] = useState("");
  const [showEditPanel, setShowEditPanel] = useState(false);

  const editItinerary = async () => {
    if (!editRequest.trim()) return;

    setIsEditing(true);
    setError(null);

    try {
      const response = await fetch("/api/itinerary/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itinerary_id: itineraryId,
          modification_request: editRequest,
          current_content: content,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to edit itinerary");
      }

      setContent(data.itinerary.content);
      setEditRequest("");
      setShowEditPanel(false);

      // Refresh the page to update parent derived sections (Accommodation List, Logistics)
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Edit Controls */}
      <div className="card p-5 border-l-4 border-primary-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Itinerary Details
            </h2>
            <p className="text-sm text-surface-600 mt-1 italic leading-relaxed">
              &quot;{content.summary}&quot;
            </p>
          </div>
          <div className="flex-shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEditPanel(!showEditPanel)}
              disabled={isEditing}
              className="w-full sm:w-auto shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Itinerary
            </Button>
          </div>
        </div>

        {/* Edit Panel */}
        {showEditPanel && (
          <div className="border-t border-surface-200 pt-4 mt-4">
            <label className="block text-sm font-medium text-surface-700 mb-2">
              Describe your changes in plain English
            </label>
            <textarea
              value={editRequest}
              onChange={(e) => setEditRequest(e.target.value)}
              placeholder="e.g., Add a beach day in Mirissa on Day 3, remove the temple visit on Day 2, change the hotel in Kandy to a 5-star property..."
              className="w-full px-4 py-3 rounded-lg border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none text-surface-900 placeholder-surface-400"
              rows={4}
              disabled={isEditing}
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-surface-500">
                The AI will understand your request and update the itinerary accordingly.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowEditPanel(false);
                    setEditRequest("");
                  }}
                  disabled={isEditing}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={editItinerary}
                  disabled={isEditing || !editRequest.trim()}
                >
                  {isEditing ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Applying Changes...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Apply Changes
                    </>
                  )}
                </Button>
              </div>
            </div>

            {error && (
            <div className="mt-4 p-4 bg-accent-500/10 border border-accent-500/30 rounded-lg">
                <p className="text-sm text-accent-500">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Day by Day Itinerary */}
      <div className="space-y-6">
        {content.days.map((day) => (
          <div key={day.day} className="card overflow-hidden group">
            {/* Day Header - Dark Theme matches Active Tours Card */}
            <div className="bg-surface-900 px-6 py-5 border-b border-surface-800 transition-colors duration-300">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-800 border border-surface-700 text-teal-400 flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-teal-400 group-hover:text-surface-900 transition-colors duration-300">
                    {day.day}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{day.title}</h3>
                    <p className="text-sm text-surface-400 font-medium">
                      {(() => {
                        if (!day.date) return "";
                        try {
                          const d = new Date(day.date);
                          if (isNaN(d.getTime())) return "";
                          return format(d, "EEEE, MMMM d, yyyy");
                        } catch (e) {
                          return "";
                        }
                      })()}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 pl-4 border-l border-surface-800">
                  <p className="text-[10px] uppercase tracking-wider text-surface-500 font-bold mb-1">Overnight</p>
                  <p className="text-sm font-bold text-white">{day.overnight_location}</p>
                  <p className="text-xs text-surface-400 mt-0.5">{day.hotel_suggestion}</p>
                  {day.day_total_km && (
                    <p className="text-[10px] font-bold text-surface-300 mt-1 bg-surface-800 px-2 py-0.5 rounded-full inline-block">
                      {day.day_total_km}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Activities */}
            <div className="p-6 bg-white">
              <div className="relative border-l-2 border-surface-100 ml-4 space-y-8 my-2">
                {day.activities.map((activity, idx) => (
                  <div key={idx} className="relative pl-8">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white bg-teal-400 shadow-sm ring-4 ring-teal-50"></div>

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
                            <div className="flex items-center gap-1.5 text-teal-600 font-medium">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                              </svg>
                              {activity.driving_time}
                            </div>
                          )}

                          {activity.driving_distance_km && (
                            <div className="flex items-center gap-1.5 text-teal-600 font-medium">
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
                <div className="mt-4 p-4 bg-teal-50 rounded-lg border border-teal-100 flex gap-3 text-sm text-teal-800">
                  <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className="font-bold block mb-0.5 text-teal-900">Note</span>
                    {day.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
