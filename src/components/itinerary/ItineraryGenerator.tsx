"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { ItineraryDisplay } from "./ItineraryDisplay";

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

interface ExistingItinerary {
  id: string;
  content: ItineraryContent;
  created_at: string;
}

interface ItineraryGeneratorProps {
  inquiryId: string;
  existingItinerary: ExistingItinerary | null;
}

export function ItineraryGenerator({ inquiryId, existingItinerary }: ItineraryGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<ExistingItinerary | null>(existingItinerary);
  const [editRequest, setEditRequest] = useState("");
  const [showEditPanel, setShowEditPanel] = useState(false);

  const generateItinerary = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/itinerary/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inquiry_id: inquiryId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate itinerary");
      }

      setItinerary({
        id: data.itinerary.id,
        content: data.itinerary.content,
        created_at: data.itinerary.created_at,
      });
      setShowEditPanel(false);
      setEditRequest("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const editItinerary = async () => {
    if (!itinerary || !editRequest.trim()) return;

    setIsEditing(true);
    setError(null);

    try {
      const response = await fetch("/api/itinerary/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itinerary_id: itinerary.id,
          modification_request: editRequest,
          current_content: itinerary.content,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to edit itinerary");
      }

      setItinerary({
        id: data.itinerary.id,
        content: data.itinerary.content,
        created_at: data.itinerary.created_at,
      });
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
      {/* Generate/Edit Controls Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-surface-900">
              Travel Itinerary
            </h2>
            <p className="text-sm text-surface-500 mt-1">
              {itinerary 
                ? "Itinerary generated. You can edit or regenerate."
                : "Generate a day-by-day travel plan"
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {itinerary && (
              <Button
                variant="secondary"
                onClick={() => setShowEditPanel(!showEditPanel)}
                disabled={isGenerating || isEditing}
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Itinerary
              </Button>
            )}
            <Button
              onClick={generateItinerary}
              disabled={isGenerating || isEditing}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {itinerary ? "Regenerate" : "Generate Itinerary"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Edit Panel */}
        {showEditPanel && itinerary && (
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
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Itinerary Display */}
      {itinerary && (
        <ItineraryDisplay itinerary={itinerary.content} createdAt={itinerary.created_at} />
      )}
    </div>
  );
}
