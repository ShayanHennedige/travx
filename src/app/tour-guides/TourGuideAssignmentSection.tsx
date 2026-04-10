"use client";

import { useState, useEffect } from "react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

interface Tour {
  id: string;
  client_name: string;
  start_date: string;
  end_date: string;
  pax_adults: number;
  pax_children: number;
  guide_id: string | null;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  tour_guides?: {
    id: string;
    name: string;
    phone_number: string;
    language: string;
  } | null;
}

interface TourGuide {
  id: string;
  name: string;
  phone_number: string;
  language: string;
  is_active: boolean;
}

interface TourGuideAssignmentSectionProps {
  tours: Tour[];
  guides: TourGuide[];
}

export function TourGuideAssignmentSection({ tours: initialTours, guides }: TourGuideAssignmentSectionProps) {
  const router = useRouter();
  const [tours, setTours] = useState(initialTours);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedTour, setSelectedTour] = useState<string | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"pending" | "upcoming" | "ongoing" | "completed">("pending");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setTours(initialTours);
  }, [initialTours]);

  const pendingAssignmentTours = tours.filter(
    (tour) => !tour.guide_id && tour.status !== "cancelled"
  );

  const assignedTours = {
    upcoming: tours.filter(
      (tour) => tour.guide_id && tour.status === "upcoming"
    ),
    ongoing: tours.filter(
      (tour) => tour.guide_id && tour.status === "ongoing"
    ),
    completed: tours.filter(
      (tour) => tour.guide_id && tour.status === "completed"
    ),
  };

  const handleAssignGuide = async (tourId: string, guideId: string) => {
    if (!guideId) {
      alert("Please select a guide");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/tour-guide-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tour_id: tourId,
          tour_guide_id: guideId,
        }),
      });

      if (response.ok) {
        setTours(
          tours.map((tour) =>
            tour.id === tourId
              ? {
                  ...tour,
                  guide_id: guideId,
                  tour_guides: guides.find((g) => g.id === guideId) || null,
                }
              : tour
          )
        );
        setAssigning(null);
        setSelectedGuide("");
        router.refresh();
      } else {
        alert("Failed to assign guide");
      }
    } catch (error) {
      alert("Error assigning guide");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassignGuide = async (tourId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/tour-guide-assignments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tour_id: tourId }),
      });

      if (response.ok) {
        setTours(
          tours.map((tour) =>
            tour.id === tourId
              ? { ...tour, guide_id: null, tour_guides: null }
              : tour
          )
        );
        router.refresh();
      } else {
        alert("Failed to unassign guide");
      }
    } catch (error) {
      alert("Error unassigning guide");
    } finally {
      setIsLoading(false);
    }
  };

  const renderTourRow = (tour: Tour, showAction: "assign" | "unassign" | "change") => (
    <div
      key={tour.id}
      className="flex items-center justify-between p-4 border-b border-surface-200 hover:bg-surface-50"
    >
      <div className="flex-1">
        <h4 className="font-medium text-surface-900">{tour.client_name}</h4>
        <p className="text-sm text-surface-500">
          {format(parseISO(tour.start_date), "MMM d")} – {format(parseISO(tour.end_date), "MMM d")}
          {" • "}
          {tour.pax_adults + tour.pax_children} pax
        </p>
      </div>

      {showAction === "assign" && (
        <div className="flex items-center gap-2">
          {assigning === tour.id ? (
            <>
              <select
                value={selectedGuide}
                onChange={(e) => setSelectedGuide(e.target.value)}
                className="px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select guide...</option>
                {guides.filter((g) => g.is_active).map((guide) => (
                  <option key={guide.id} value={guide.id}>
                    {guide.name} ({guide.language})
                  </option>
                ))}
              </select>
              <Button
                onClick={() => handleAssignGuide(tour.id, selectedGuide)}
                disabled={!selectedGuide || isLoading}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? "..." : "Assign"}
              </Button>
              <button
                onClick={() => { setAssigning(null); setSelectedGuide(""); }}
                className="px-3 py-2 border border-surface-300 rounded-lg hover:bg-surface-100"
              >
                Cancel
              </button>
            </>
          ) : (
            <Button
              onClick={() => { setAssigning(tour.id); setSelectedGuide(""); }}
              className="bg-primary-600 hover:bg-primary-700"
            >
              Assign Guide
            </Button>
          )}
        </div>
      )}

      {showAction === "unassign" && (
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="font-medium text-surface-900">{tour.tour_guides?.name}</p>
            <p className="text-sm text-surface-500">{tour.tour_guides?.language}</p>
          </div>
          <button
            onClick={() => handleUnassignGuide(tour.id)}
            disabled={isLoading}
            className="px-3 py-2 text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-surface-900">Tour Guide Assignment</h2>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-200">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === "pending"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-surface-600 hover:text-surface-900"
          }`}
        >
          Pending ({pendingAssignmentTours.length})
        </button>
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === "upcoming"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-surface-600 hover:text-surface-900"
          }`}
        >
          Upcoming ({assignedTours.upcoming.length})
        </button>
        <button
          onClick={() => setActiveTab("ongoing")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === "ongoing"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-surface-600 hover:text-surface-900"
          }`}
        >
          Ongoing ({assignedTours.ongoing.length})
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === "completed"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-surface-600 hover:text-surface-900"
          }`}
        >
          Completed ({assignedTours.completed.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === "pending" && (
          <div>
            {pendingAssignmentTours.length === 0 ? (
              <p className="p-4 text-center text-surface-500">All tours have guides assigned!</p>
            ) : (
              pendingAssignmentTours.map((tour) => renderTourRow(tour, "assign"))
            )}
          </div>
        )}

        {activeTab === "upcoming" && (
          <div>
            {assignedTours.upcoming.length === 0 ? (
              <p className="p-4 text-center text-surface-500">No upcoming tours with guides</p>
            ) : (
              assignedTours.upcoming.map((tour) => renderTourRow(tour, "unassign"))
            )}
          </div>
        )}

        {activeTab === "ongoing" && (
          <div>
            {assignedTours.ongoing.length === 0 ? (
              <p className="p-4 text-center text-surface-500">No ongoing tours with guides</p>
            ) : (
              assignedTours.ongoing.map((tour) => renderTourRow(tour, "unassign"))
            )}
          </div>
        )}

        {activeTab === "completed" && (
          <div>
            {assignedTours.completed.length === 0 ? (
              <p className="p-4 text-center text-surface-500">No completed tours with guides</p>
            ) : (
              assignedTours.completed.map((tour) => renderTourRow(tour, "unassign"))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
