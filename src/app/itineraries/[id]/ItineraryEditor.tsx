"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
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

interface ItineraryEditorProps {
  itineraryId: string;
  initialContent: ItineraryContent;
}

export function ItineraryEditor({ itineraryId, initialContent }: ItineraryEditorProps) {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Edit Controls */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-surface-100 light:text-surface-900">
              Itinerary Details
            </h2>
            <p className="text-sm text-surface-400 light:text-surface-500 mt-1">
              {content.summary}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowEditPanel(!showEditPanel)}
            disabled={isEditing}
            className="hover:bg-accent-500 hover:text-black hover:border-accent-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Itinerary
          </Button>
        </div>

        {/* Edit Panel */}
        {showEditPanel && (
          <div className="border-t border-surface-600 light:border-surface-200 pt-4 mt-4">
            <label className="block text-sm font-medium text-surface-300 light:text-surface-700 mb-2">
              Describe your changes in plain English
            </label>
            <textarea
              value={editRequest}
              onChange={(e) => setEditRequest(e.target.value)}
              placeholder="e.g., Add a beach day in Mirissa on Day 3, remove the temple visit on Day 2, change the hotel in Kandy to a 5-star property..."
              className="w-full px-4 py-3 rounded-lg border border-surface-600 light:border-surface-300 bg-surface-800 light:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none text-surface-100 light:text-surface-900 placeholder:text-surface-500 light:placeholder:text-surface-500"
              rows={4}
              disabled={isEditing}
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-surface-400 light:text-surface-500">
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
              <div className="mt-4 p-4 bg-red-900/30 light:bg-red-50 border border-red-700 light:border-red-200 rounded-lg">
                <p className="text-sm text-red-300 light:text-red-600">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Day by Day Itinerary */}
      <div className="space-y-4">
        {content.days.map((day) => (
          <div key={day.day} className="card overflow-hidden">
            {/* Day Header */}
            <div className="bg-surface-700 light:bg-surface-100 px-6 py-4 border-b border-surface-600 light:border-surface-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm">
                      {day.day}
                    </span>
                    <div>
                      <h3 className="font-semibold text-surface-100 light:text-surface-900">{day.title}</h3>
                      <p className="text-sm text-surface-400 light:text-surface-500">
                        {day.date && format(new Date(day.date), "EEEE, MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-surface-300 light:text-surface-700">
                    Overnight: {day.overnight_location}
                  </p>
                    <p className="text-xs text-surface-400 light:text-surface-500">{day.hotel_suggestion}</p>
                  {day.day_total_km && (
                    <p className="text-xs font-medium text-primary-400 light:text-primary-600 mt-1">
                      Total: {day.day_total_km}
                    </p>
                  )}
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
                          ? 'bg-amber-900/50 light:bg-amber-100 text-amber-300 light:text-amber-700'
                          : activity.time.toLowerCase().includes('afternoon')
                          ? 'bg-primary-900/50 light:bg-primary-100 text-primary-300 light:text-primary-700'
                          : 'bg-purple-900/50 light:bg-purple-100 text-purple-300 light:text-purple-700'
                      }`}>
                        {activity.time}
                      </span>
                    </div>
                    <div className="flex-grow">
                      <p className="text-surface-100 light:text-surface-900 font-medium">{activity.activity}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-surface-400 light:text-surface-500">
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
                          <span className="flex items-center gap-1 text-orange-400 light:text-orange-600">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                            </svg>
                            {activity.driving_time}
                          </span>
                        )}
                        {activity.driving_distance_km && (
                          <span className="flex items-center gap-1 text-green-400 light:text-green-600">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            {activity.driving_distance_km}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Meals */}
              <div className="mt-6 pt-4 border-t border-surface-600 light:border-surface-200">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-surface-400 light:text-surface-500 text-xs uppercase tracking-wider mb-1">Breakfast</p>
                    <p className="text-surface-300 light:text-surface-600">{day.meals.breakfast}</p>
                  </div>
                  <div>
                    <p className="text-surface-400 light:text-surface-500 text-xs uppercase tracking-wider mb-1">Lunch</p>
                    <p className="text-surface-300 light:text-surface-600">{day.meals.lunch}</p>
                  </div>
                  <div>
                    <p className="text-surface-400 light:text-surface-500 text-xs uppercase tracking-wider mb-1">Dinner</p>
                    <p className="text-surface-300 light:text-surface-600">{day.meals.dinner}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {day.notes && (
                <div className="mt-4 p-3 bg-amber-900/30 light:bg-amber-50 rounded-lg border border-amber-700/50 light:border-transparent">
                  <p className="text-sm text-amber-300 light:text-amber-800">
                    <span className="font-medium">Note:</span> {day.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
