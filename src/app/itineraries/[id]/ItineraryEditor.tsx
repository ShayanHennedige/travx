"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { recalculateTourTotals, ItineraryDay, ItineraryContent } from "@/lib/itinerary-utils";
import { VersionHistoryPanel } from "@/components/VersionHistoryPanel";

interface ItineraryEditorProps {
  itineraryId: string;
  initialContent: ItineraryContent;
  itineraryStatus?: string;
  flightDetails?: {
    arrival_flight_no?: string | null;
    arrival_time?: string | null;
    departure_flight_no?: string | null;
    departure_time?: string | null;
  };
  onPushToCosting?: () => void;
}

const HOTEL_TIER_OPTIONS = ["3 Star", "4 Star", "5 Star", "Boutique", "Villa", "Budget"];
const ROOM_CATEGORY_OPTIONS = ["Standard", "Deluxe", "Superior", "Suite"];
const MEAL_PLAN_OPTIONS = ["BB", "HB", "FB", "AI"];

export function ItineraryEditor({ itineraryId, initialContent, itineraryStatus, flightDetails, onPushToCosting }: ItineraryEditorProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [isPushingToCosting, setIsPushingToCosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [content, setContent] = useState<ItineraryContent>(initialContent);
  const [editRequest, setEditRequest] = useState("");
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [modifiedDays, setModifiedDays] = useState<Set<number>>(new Set());
  const [isSyncingDay, setIsSyncingDay] = useState<number | null>(null);

  const isFinalized = itineraryStatus === "finalized";

  const handleRegenerateDay = async (dayIndex: number) => {
    setIsSyncingDay(dayIndex);
    try {
      const res = await fetch(`/api/itinerary/${itineraryId}/regenerate-day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, dayIndex }),
      });
      
      if (!res.ok) throw new Error("Failed to regenerate day");
      
      const data = await res.json();
      const updatedWithTotals = recalculateTourTotals(data.updatedContent);
      setContent(updatedWithTotals);
      router.refresh();
      
      // Clear the modified badge for this day and next day since cascade sync updates both
      setModifiedDays(prev => {
        const next = new Set(prev);
        next.delete(dayIndex);
        next.delete(dayIndex + 1); // also clear next day if it was cascaded
        return next;
      });
    } catch (err) {
      console.error(err);
      alert("Failed to sync logistics with AI.");
    } finally {
      setIsSyncingDay(null);
    }
  };

  const updateDayField = async (dayIndex: number, field: keyof ItineraryDay, value: string) => {
    // 1. Optimistic UI update
    const oldHotel = content.days[dayIndex].hotel_suggestion?.trim();
    const newlyModifiedDays = new Set([dayIndex]);

    const newDays = content.days.map((day, idx) => {
      let updatedDay = { ...day };
      
      // Update the specific field for the target day
      if (idx === dayIndex) {
        updatedDay = { ...updatedDay, [field]: value };
      }

      // Smart sync: If changing the Hotel Name, auto-replace occurrences of the old hotel name in the meals
      if (field === "hotel_suggestion" && oldHotel && oldHotel.length > 2) {
        // Day N: Update Lunch and Dinner
        if (idx === dayIndex) {
          let newLunch = updatedDay.meals.lunch;
          let newDinner = updatedDay.meals.dinner;
          let changed = false;

          if (newLunch.includes(oldHotel)) {
            newLunch = newLunch.replace(oldHotel, value);
            changed = true;
          }
          if (newDinner.includes(oldHotel)) {
            newDinner = newDinner.replace(oldHotel, value);
            changed = true;
          }

          if (changed) {
            updatedDay.meals = { ...updatedDay.meals, lunch: newLunch, dinner: newDinner };
          }
        }
        
        // Day N+1: Update Breakfast
        if (idx === dayIndex + 1) {
          let newBreakfast = updatedDay.meals.breakfast;
          if (newBreakfast.includes(oldHotel)) {
            newBreakfast = newBreakfast.replace(oldHotel, value);
            updatedDay.meals = { ...updatedDay.meals, breakfast: newBreakfast };
            newlyModifiedDays.add(idx); // Mark next day as modified too
          }
        }
      }

      return updatedDay;
    });

    const newContentRaw = { ...content, days: newDays };
    const newContent = recalculateTourTotals(newContentRaw);
    setContent(newContent);
    // Add all modified days to the set
    setModifiedDays(prev => {
      const next = new Set(prev);
      newlyModifiedDays.forEach(d => next.add(d));
      return next;
    });

    // 2. Auto-save in the background
    try {
      const res = await fetch(`/api/itinerary/${itineraryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newContent,
          status: "draft", // preserve standard status during partial edits
        }),
      });
      
      if (!res.ok) throw new Error("Auto-save failed");
      
      // 3. Silently refresh server components so sidebar widgets & PDF get the new data live
      router.refresh();
    } catch (err) {
      console.error("Failed to auto-save itinerary modifications:", err);
      setSaveError(true);
    }
  };

  const updateMealField = async (dayIndex: number, meal: 'breakfast' | 'lunch' | 'dinner', value: string) => {
    // 1. Optimistic UI update
    const newDays = content.days.map((day, idx) =>
      idx === dayIndex ? { ...day, meals: { ...day.meals, [meal]: value } } : day
    );
    const newContent = { ...content, days: newDays };
    setContent(newContent);
    setModifiedDays(prev => new Set(prev).add(dayIndex));

    // 2. Auto-save in the background
    try {
      const res = await fetch(`/api/itinerary/${itineraryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newContent,
          status: "draft",
        }),
      });
      
      if (!res.ok) throw new Error("Auto-save failed");
      router.refresh();
    } catch (err) {
      console.error("Failed to auto-save meal modifications:", err);
      setSaveError(true);
    }
  };

  const handlePushToCosting = async () => {
    setIsSavingReview(true);
    setError(null);
    try {
      // Save the reviewed content back to the itinerary
      const response = await fetch(`/api/itinerary/${itineraryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          status: "reviewed",
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save reviewed itinerary");
      }
      setModifiedDays(new Set());
      setIsSavingReview(false);
      setIsPushingToCosting(true);
      router.refresh();
      // Redirect to Operations Hub and expand this specific itinerary
      router.push(`/operations?expand=${itineraryId}`);
      onPushToCosting?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSavingReview(false);
    }
  };

  const editItinerary = async () => {
    if (!editRequest.trim()) return;

    setIsEditing(true);
    setError(null);

    // Snapshot current version before applying AI edit
    fetch("/api/document-versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_type: "itinerary",
        document_id: itineraryId,
        content,
        edited_by: "Admin",
        edit_reason: editRequest.slice(0, 120),
      }),
    }).catch(() => {}); // non-blocking, best-effort

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
      {/* Auto-save failure banner */}
      {saveError && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Auto-save failed. Your last change may not have been saved.
          </div>
          <button onClick={() => setSaveError(false)} className="text-amber-600 hover:text-amber-800 font-medium">
            Dismiss
          </button>
        </div>
      )}

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
          <div className="flex-shrink-0 flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowVersionHistory(true)}
              disabled={isEditing}
              className="shadow-sm"
              title="View version history"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </Button>
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
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
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
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-800 border border-surface-700 text-primary-400 flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-primary-400 group-hover:text-surface-900 transition-colors duration-300">
                    {day.day}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white mb-1">{day.title}</h3>
                      {modifiedDays.has(content.days.indexOf(day)) && (
                        <span className="px-2 py-0.5 bg-amber-400 text-amber-900 rounded text-[9px] font-black uppercase tracking-wider">Modified</span>
                      )}
                    </div>
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

              {/* Per-Day Accommodation Inline Editing */}
              {!isFinalized && (
                <>
                  <div className="mt-4 pt-3 border-t border-surface-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[9px] uppercase tracking-widest text-surface-500 font-bold block mb-1">Hotel Name</label>
                      <input
                        type="text"
                        value={day.hotel_suggestion || ""}
                        onChange={(e) => updateDayField(content.days.indexOf(day), "hotel_suggestion", e.target.value)}
                        className="w-full px-2 py-1.5 bg-surface-800 border border-surface-700 rounded-lg text-xs text-white focus:border-primary-400 focus:ring-1 focus:ring-primary-400/30 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-widest text-surface-500 font-bold block mb-1">Hotel Tier</label>
                      <select
                        value={day.hotel_tier || ""}
                        onChange={(e) => updateDayField(content.days.indexOf(day), "hotel_tier", e.target.value)}
                        className="w-full px-2 py-1.5 bg-surface-800 border border-surface-700 rounded-lg text-xs text-white focus:border-primary-400 outline-none"
                      >
                        <option value="">Select...</option>
                        {HOTEL_TIER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-widest text-surface-500 font-bold block mb-1">Room Category</label>
                      <select
                        value={day.room_category || ""}
                        onChange={(e) => updateDayField(content.days.indexOf(day), "room_category", e.target.value)}
                        className="w-full px-2 py-1.5 bg-surface-800 border border-surface-700 rounded-lg text-xs text-white focus:border-primary-400 outline-none"
                      >
                        <option value="">Select...</option>
                        {ROOM_CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-widest text-surface-500 font-bold block mb-1">Meal Plan</label>
                      <select
                        value={day.meal_plan || ""}
                        onChange={(e) => updateDayField(content.days.indexOf(day), "meal_plan", e.target.value)}
                        className="w-full px-2 py-1.5 bg-surface-800 border border-surface-700 rounded-lg text-xs text-white focus:border-primary-400 outline-none"
                      >
                        <option value="">Select...</option>
                        {MEAL_PLAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>

                  {modifiedDays.has(content.days.indexOf(day)) && (
                    <div className="mt-3 p-3 bg-surface-800/50 border border-surface-700 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-xs font-bold tracking-wide">Day modified. Recalculate driving distances & locations?</span>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold py-1 px-3 h-auto"
                        onClick={() => handleRegenerateDay(content.days.indexOf(day))}
                        disabled={isSyncingDay === content.days.indexOf(day)}
                      >
                        {isSyncingDay === content.days.indexOf(day) ? "Syncing AI..." : "AI Auto-Sync Logistics"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Activities */}
            <div className="p-6 bg-white">
              
              {/* Arrival Flight Banner on Day 1 */}
              {day.day === 1 && (flightDetails?.arrival_time || flightDetails?.arrival_flight_no) && (
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-blue-500 mb-0.5">Arrival Logistics</p>
                      <p className="text-sm font-bold text-blue-900">
                        {flightDetails.arrival_flight_no ? `Flight ${flightDetails.arrival_flight_no}` : "Flight TBA"}
                        {flightDetails.arrival_time ? ` arriving at ${flightDetails.arrival_time}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Departure Flight Banner on Final Day */}
              {day.day === content.days.length && (flightDetails?.departure_time || flightDetails?.departure_flight_no) && (
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-rose-500 mb-0.5">Departure Logistics</p>
                      <p className="text-sm font-bold text-rose-900">
                        {flightDetails.departure_flight_no ? `Flight ${flightDetails.departure_flight_no}` : "Flight TBA"}
                        {flightDetails.departure_time ? ` departing at ${flightDetails.departure_time}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="relative border-l-2 border-surface-100 ml-4 space-y-8 my-2">
                {day.activities.map((activity, idx) => (
                  <div key={idx} className="relative pl-8">
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
                        
                        {activity.site_description && (
                          <p className="text-sm text-surface-500 italic mt-1.5 mb-2 leading-relaxed">
                            {activity.site_description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm mt-2">
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
                  <div className="bg-surface-50 p-3 rounded-lg border border-surface-100 flex flex-col focus-within:ring-1 focus-within:border-primary-400 focus-within:ring-primary-400/30">
                    <label className="text-[10px] uppercase tracking-wider text-surface-400 font-bold mb-1 block">Breakfast</label>
                    <input
                      type="text"
                      className="w-full bg-transparent text-sm font-medium text-surface-900 outline-none"
                      value={day.meals.breakfast}
                      onChange={(e) => updateMealField(content.days.indexOf(day), 'breakfast', e.target.value)}
                      disabled={isFinalized}
                    />
                  </div>
                  <div className="bg-surface-50 p-3 rounded-lg border border-surface-100 flex flex-col focus-within:ring-1 focus-within:border-primary-400 focus-within:ring-primary-400/30">
                    <label className="text-[10px] uppercase tracking-wider text-surface-400 font-bold mb-1 block">Lunch</label>
                    <input
                      type="text"
                      className="w-full bg-transparent text-sm font-medium text-surface-900 outline-none"
                      value={day.meals.lunch}
                      onChange={(e) => updateMealField(content.days.indexOf(day), 'lunch', e.target.value)}
                      disabled={isFinalized}
                    />
                  </div>
                  <div className="bg-surface-50 p-3 rounded-lg border border-surface-100 flex flex-col focus-within:ring-1 focus-within:border-primary-400 focus-within:ring-primary-400/30">
                    <label className="text-[10px] uppercase tracking-wider text-surface-400 font-bold mb-1 block">Dinner</label>
                    <input
                      type="text"
                      className="w-full bg-transparent text-sm font-medium text-surface-900 outline-none"
                      value={day.meals.dinner}
                      onChange={(e) => updateMealField(content.days.indexOf(day), 'dinner', e.target.value)}
                      disabled={isFinalized}
                    />
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

      {/* Push to Costing Button */}
      {!isFinalized && (
        <div className={`card overflow-hidden border-2 transition-all duration-500 ${isPushingToCosting ? "border-primary-400 shadow-2xl shadow-primary-200/50" : "border-primary-200"}`}>
          {isPushingToCosting ? (
            /* ── Rich Navigation Overlay ── */
            <div className="relative p-8 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white">
              {/* Animated background particles */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/10 rounded-full animate-ping" style={{ animationDuration: "2s" }} />
                <div className="absolute top-1/2 right-8 w-16 h-16 bg-white/5 rounded-full animate-ping" style={{ animationDuration: "3s", animationDelay: "0.5s" }} />
                <div className="absolute bottom-2 left-1/3 w-12 h-12 bg-white/5 rounded-full animate-ping" style={{ animationDuration: "2.5s", animationDelay: "1s" }} />
              </div>

              <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                {/* Pulsing icon */}
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-wide">Preparing Costing Sheet</h3>
                  <p className="text-sm text-primary-100 mt-1">Redirecting you to the Operations Hub…</p>
                </div>
                {/* Animated progress bar */}
                <div className="w-full max-w-xs h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full"
                    style={{
                      animation: "pushToCostingProgress 2s ease-in-out infinite",
                    }}
                  />
                </div>
              </div>
              <style>{`
                @keyframes pushToCostingProgress {
                  0% { width: 0%; opacity: 0.7; }
                  50% { width: 70%; opacity: 1; }
                  100% { width: 100%; opacity: 0.7; }
                }
              `}</style>
            </div>
          ) : (
            /* ── Normal / Saving State ── */
            <div className="p-5 bg-gradient-to-r from-primary-50 to-primary-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-primary-900">Ready to proceed?</h3>
                  <p className="text-xs text-primary-700 mt-0.5">
                    {modifiedDays.size > 0
                      ? `${modifiedDays.size} day(s) modified. Save and push to costing sheet.`
                      : "Review the accommodation details above, then push to costing."}
                  </p>
                </div>
                <Button
                  onClick={handlePushToCosting}
                  disabled={isSavingReview}
                  className="bg-primary-600 hover:bg-primary-700 text-white shadow-lg"
                >
                  {isSavingReview ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving…
                    </>
                  ) : (
                    <>
                      Push to Costing
                      <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </Button>
              </div>
              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <VersionHistoryPanel
        documentType="itinerary"
        documentId={itineraryId}
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
      />
    </div>
  );
}
