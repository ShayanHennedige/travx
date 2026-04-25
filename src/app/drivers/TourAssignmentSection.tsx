"use client";

import { useState, useEffect } from "react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { LogSheetView } from "./LogSheetView";

interface Tour {
  id: string;
  client_name: string;
  start_date: string;
  end_date: string;
  pax_adults: number;
  pax_children: number;
  driver_id: string | null;
  driver_status: "new" | "in_progress" | "completed" | null;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  vouchers_completed?: boolean;
  tour_guide_id?: string | null;
  tour_guide_status?: "new" | "in_progress" | "completed" | null;
  tour_guides?: TourGuide | null;
  drivers?: {
    id: string;
    name: string;
    contact_number?: string | null;
    vehicle_type: string | null;
    vehicle_number: string | null;
  } | null;
}

interface TourGuide {
  id: string;
  name: string;
  language: string;
  contact_number: string;
}

interface Driver {
  id: string;
  name: string;
  contact_number: string;
  vehicle_type: string | null;
  vehicle_number: string | null;
}

interface TourAssignmentSectionProps {
  tours: Tour[];
  drivers: Driver[];
  tourGuides: TourGuide[];
}

export function TourAssignmentSection({ tours: initialTours, drivers, tourGuides }: TourAssignmentSectionProps) {
  const router = useRouter();
  const [tours, setTours] = useState(initialTours);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedTour, setSelectedTour] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [selectedTourGuide, setSelectedTourGuide] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"driver" | "guide" | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "upcoming" | "ongoing" | "completed">("pending");
  const [downloadingLogSheet, setDownloadingLogSheet] = useState<string | null>(null);
  const [viewingLogSheet, setViewingLogSheet] = useState<{ tourId: string; tourName: string } | null>(null);

  useEffect(() => {
    setTours(initialTours);
  }, [initialTours]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hasTourEnded = (tour: Tour) => parseISO(tour.end_date) < today;
  const isFutureTour = (tour: Tour) => parseISO(tour.start_date) > today;

  const pendingTours = tours.filter((tour) => {
    const noStaff = !tour.driver_id && !tour.tour_guide_id;
    return noStaff && !hasTourEnded(tour) && tour.status !== "cancelled";
  });

  const upcomingTours = tours.filter((tour) => {
    const hasStaff = !!tour.driver_id || !!tour.tour_guide_id;
    return hasStaff && isFutureTour(tour) && tour.status !== "cancelled";
  });

  const ongoingTours = tours.filter((tour) => {
    const hasStaff = !!tour.driver_id || !!tour.tour_guide_id;
    const startDate = parseISO(tour.start_date);
    const endDate = parseISO(tour.end_date);
    return hasStaff && startDate <= today && endDate >= today && tour.status !== "cancelled";
  });

  const completedTours = tours.filter((tour) => hasTourEnded(tour) && tour.status !== "cancelled");

  const checkDriverAvailability = (driverId: string, tourId: string, startDate: string, endDate: string): { available: boolean; conflict?: Tour } => {
    const tourStart = parseISO(startDate);
    const tourEnd = parseISO(endDate);

    const conflictingTour = tours.find((t) => {
      if (t.id === tourId || t.driver_id !== driverId) return false;
      const tStart = parseISO(t.start_date);
      const tEnd = parseISO(t.end_date);
      return (
        isWithinInterval(tourStart, { start: tStart, end: tEnd }) ||
        isWithinInterval(tourEnd, { start: tStart, end: tEnd }) ||
        (tourStart <= tStart && tourEnd >= tEnd)
      );
    });

    return { available: !conflictingTour, conflict: conflictingTour };
  };

  const handleAssignRole = async (tourId: string, role: "driver" | "guide", assigneeId: string) => {
    if (!assigneeId) return;

    const tour = tours.find((t) => t.id === tourId);
    if (!tour) return;

    if (role === "driver") {
      const availability = checkDriverAvailability(assigneeId, tourId, tour.start_date, tour.end_date);
      if (!availability.available) {
        alert(`Cannot assign driver. Conflict with tour "${availability.conflict?.client_name}"`);
        return;
      }
    }

    setAssigning(`${role}-${tourId}`);

    try {
      const payload = role === "driver" 
        ? { driver_id: assigneeId, driver_status: "new" }
        : { tour_guide_id: assigneeId, tour_guide_status: "new" };

      const response = await fetch(`/api/tours/${tourId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Failed to assign ${role}`);

      const assignedDriver = role === "driver" ? drivers.find((d) => d.id === assigneeId) : undefined;
      const assignedGuide = role === "guide" ? tourGuides.find((g) => g.id === assigneeId) : undefined;

      setTours((prevTours) =>
        prevTours.map((t) =>
          t.id === tourId
            ? {
                ...t,
                ...payload,
                ...(assignedDriver ? { drivers: assignedDriver } : {}),
                ...(assignedGuide ? { tour_guides: assignedGuide } : {}),
              } as Tour
            : t
        )
      );

      setSelectedTour(null);
      setSelectedRole(null);
      setSelectedDriver("");
      setSelectedTourGuide("");
      router.refresh();
    } catch (error: any) {
      alert(error.message || `Failed to assign ${role}`);
    } finally {
      setAssigning(null);
    }
  };

  const handleUnassignRole = async (tourId: string, role: "driver" | "guide") => {
    if (!confirm(`Are you sure you want to unassign the ${role}?`)) return;

    setAssigning(`${role}-${tourId}`);

    try {
      const payload = role === "driver"
        ? { driver_id: null, driver_status: null }
        : { tour_guide_id: null, tour_guide_status: null };

      const response = await fetch(`/api/tours/${tourId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Failed to unassign ${role}`);

      setTours((prevTours) =>
        prevTours.map((t) =>
          t.id === tourId
            ? {
                ...t,
                ...payload,
                ...(role === "driver" ? { drivers: null } : { tour_guides: null }),
              } as Tour
            : t
        )
      );
      router.refresh();
    } catch (error: any) {
      alert(error.message || `Failed to unassign ${role}`);
    } finally {
      setAssigning(null);
    }
  };

  const handleDownloadLogSheet = async (tourId: string) => {
    setDownloadingLogSheet(tourId);
    try {
      const response = await fetch(`/api/driver-log-sheet/${tourId}`);
      if (!response.ok) throw new Error("Failed to generate log sheet");

      let filename = "LogSheet.xlsx";
      const contentDisposition = response.headers.get("Content-Disposition");
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error.message || "Failed to download log sheet");
    } finally {
      setDownloadingLogSheet(null);
    }
  };

  const renderTourCard = (tour: Tour, showActions: boolean = true) => {
    const isAssigningDriver = assigning === `driver-${tour.id}`;
    const isAssigningGuide = assigning === `guide-${tour.id}`;

    return (
      <div key={tour.id} className="p-5 hover:bg-surface-50 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex-1 min-w-0 md:pr-4">
            <h4 className="font-bold text-surface-900 truncate mb-1">{tour.client_name}</h4>
            <div className="flex items-center gap-4 text-xs font-medium text-surface-500 mb-3">
              <span>{format(parseISO(tour.start_date), "MMM d")} - {format(parseISO(tour.end_date), "MMM d, yyyy")}</span>
              <span>{tour.pax_adults + tour.pax_children} Pax</span>
            </div>

            {/* Assignments row */}
            <div className="flex flex-col gap-2 mt-2">
              {/* Driver */}
              {tour.driver_id ? (
                <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50 border border-blue-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                      <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-900">{tour.drivers?.name || 'Assigned Driver'}</div>
                      <div className="text-[10px] text-blue-600">
                        {tour.drivers?.vehicle_type} {tour.drivers?.vehicle_number ? `• ${tour.drivers.vehicle_number}` : ''}
                      </div>
                    </div>
                  </div>
                  {showActions && (
                    <Button variant="ghost" size="sm" onClick={() => handleUnassignRole(tour.id, "driver")} disabled={isAssigningDriver} className="text-red-500 h-6 px-2 text-[10px]">
                      Unassign
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-50 border border-surface-200 border-dashed">
                  <span className="text-xs text-surface-500">No driver assigned</span>
                  {showActions && (
                    <Button size="sm" variant="secondary" onClick={() => { setSelectedTour(tour.id); setSelectedRole("driver"); }} className="h-6 px-2 text-[10px]">
                      Assign Driver
                    </Button>
                  )}
                </div>
              )}

              {/* Guide */}
              {tour.tour_guide_id ? (
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center">
                      <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-900">{tour.tour_guides?.name || 'Assigned Guide'}</div>
                      <div className="text-[10px] text-emerald-600">{tour.tour_guides?.language}</div>
                    </div>
                  </div>
                  {showActions && (
                    <Button variant="ghost" size="sm" onClick={() => handleUnassignRole(tour.id, "guide")} disabled={isAssigningGuide} className="text-red-500 h-6 px-2 text-[10px]">
                      Unassign
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-50 border border-surface-200 border-dashed">
                  <span className="text-xs text-surface-500">No guide assigned</span>
                  {showActions && (
                    <Button size="sm" variant="secondary" onClick={() => { setSelectedTour(tour.id); setSelectedRole("guide"); }} className="h-6 px-2 text-[10px]">
                      Assign Guide
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action or Assignment Controls */}
          <div className="flex-shrink-0 min-w-[200px]">
            {selectedTour === tour.id && showActions ? (
              <div className="bg-surface-50 p-3 rounded-xl border border-surface-200 animate-fade-in shadow-sm">
                <p className="text-xs font-bold text-surface-700 mb-2">Assigning {selectedRole}</p>
                {selectedRole === "driver" ? (
                  <select
                    value={selectedDriver}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-surface-200 rounded-lg outline-none bg-white mb-2"
                  >
                    <option value="">Choose a Driver...</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id} disabled={!checkDriverAvailability(d.id, tour.id, tour.start_date, tour.end_date).available}>
                        {d.name} {!checkDriverAvailability(d.id, tour.id, tour.start_date, tour.end_date).available && "(Conflict)"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedTourGuide}
                    onChange={(e) => setSelectedTourGuide(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-surface-200 rounded-lg outline-none bg-white mb-2"
                  >
                    <option value="">Choose a Guide...</option>
                    {tourGuides.map((g) => (
                      <option key={g.id} value={g.id}>{g.name} ({g.language})</option>
                    ))}
                  </select>
                )}
                
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAssignRole(tour.id, selectedRole!, selectedRole === "driver" ? selectedDriver : selectedTourGuide)} disabled={(selectedRole === "driver" ? !selectedDriver : !selectedTourGuide) || isAssigningDriver || isAssigningGuide} className="flex-1 text-xs py-1">
                    Confirm
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => { setSelectedTour(null); setSelectedRole(null); }} className="flex-1 text-xs py-1">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              showActions && tour.driver_id && (
                <div className="flex flex-col gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setViewingLogSheet({ tourId: tour.id, tourName: tour.client_name })} className="w-full justify-start text-xs text-primary-600 bg-primary-50 hover:bg-primary-100">
                    <svg className="w-3 h-3 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    View Tour
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDownloadLogSheet(tour.id)} loading={downloadingLogSheet === tour.id} className="w-full justify-start text-xs text-accent-800 bg-accent-50 hover:bg-accent-100">
                    <svg className="w-3 h-3 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Log Sheet
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="card p-1.5 flex flex-wrap items-center gap-1 bg-surface-100">
        {(["pending", "upcoming", "ongoing", "completed"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === tab ? "bg-white shadow-sm text-primary-600" : "text-surface-600 hover:bg-surface-50"}`}
          >
            <span className="capitalize">{tab}</span>
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab ? "bg-primary-100 text-primary-700" : "bg-surface-200 text-surface-600"}`}>
              {tab === "pending" ? pendingTours.length : tab === "upcoming" ? upcomingTours.length : tab === "ongoing" ? ongoingTours.length : completedTours.length}
            </span>
          </button>
        ))}
      </div>

      {activeTab === "pending" && (
        <div className="card shadow-sm border-primary-100">
          <div className="px-6 py-5 border-b border-surface-100 bg-primary-50/30">
            <h3 className="text-lg font-bold text-surface-900">Pending Assignments</h3>
            <p className="text-sm text-surface-500">{pendingTours.length} tours need staff assigned</p>
          </div>
          <div className="divide-y divide-surface-100">
            {pendingTours.length > 0 ? pendingTours.map(t => renderTourCard(t)) : (
              <div className="p-12 text-center text-surface-500">All currently ready tours have staff assigned.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === "upcoming" && (
        <div className="card shadow-sm border-purple-200 bg-purple-50/10">
          <div className="px-6 py-5 border-b border-purple-100">
            <h3 className="text-lg font-bold text-surface-900">Upcoming Tours</h3>
            <p className="text-sm text-surface-500">{upcomingTours.length} assigned tours starting soon</p>
          </div>
          <div className="divide-y divide-surface-100">
            {upcomingTours.length > 0 ? upcomingTours.map(t => renderTourCard(t)) : (
              <div className="p-12 text-center text-surface-500">No upcoming tours with assignments.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === "ongoing" && (
        <div className="card shadow-sm border-blue-200 bg-blue-50/10">
          <div className="px-6 py-5 border-b border-blue-100">
            <h3 className="text-lg font-bold text-surface-900">Ongoing Tours</h3>
            <p className="text-sm text-surface-500">{ongoingTours.length} tours currently in operation</p>
          </div>
          <div className="divide-y divide-surface-100">
            {ongoingTours.length > 0 ? ongoingTours.map(t => renderTourCard(t)) : (
              <div className="p-12 text-center text-surface-500">No tours are currently active.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === "completed" && (
        <div className="card shadow-sm border-surface-200 bg-surface-50/30">
          <div className="px-6 py-5 border-b border-surface-100">
            <h3 className="text-lg font-bold text-surface-900">Completed Tours</h3>
            <p className="text-sm text-surface-500">{completedTours.length} tours finished</p>
          </div>
          <div className="divide-y divide-surface-100">
            {completedTours.length > 0 ? completedTours.map(t => renderTourCard(t, false)) : (
              <div className="p-12 text-center text-surface-500">No completed tours yet.</div>
            )}
          </div>
        </div>
      )}

      {viewingLogSheet && (
        <LogSheetView tourId={viewingLogSheet.tourId} tourName={viewingLogSheet.tourName} isOpen={true} onClose={() => setViewingLogSheet(null)} onFinalized={() => router.refresh()} />
      )}
    </div>
  );
}
