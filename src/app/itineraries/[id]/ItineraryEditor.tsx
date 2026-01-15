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
            <h2 className="text-lg font-semibold text-surface-900">
              Itinerary Details
            </h2>
            <p className="text-sm text-surface-500 mt-1">
              {content.summary}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowEditPanel(!showEditPanel)}
            disabled={isEditing}
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Itinerary
          </Button>
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
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
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
    </div>
  );
}
