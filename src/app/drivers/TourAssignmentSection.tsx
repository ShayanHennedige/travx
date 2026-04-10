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
  driver_id: string | null;
  driver_status: "new" | "in_progress" | "completed" | null;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  vouchers_completed?: boolean; // Indicates if vouchers are completed for this tour
  drivers?: {
    id: string;
    name: string;
    vehicle_type: string | null;
    vehicle_number: string | null;
  } | null;
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
}

export function TourAssignmentSection({ tours: initialTours, drivers }: TourAssignmentSectionProps) {
  const router = useRouter();
  const [tours, setTours] = useState(initialTours);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedTour, setSelectedTour] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"pending" | "upcoming" | "ongoing" | "completed">("pending");
  const [downloadingLogSheet, setDownloadingLogSheet] = useState<string | null>(null);

  // Sync with initialTours when parent refreshes
  useEffect(() => {
    setTours(initialTours);
  }, [initialTours]);

  // Current date for date-based comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper to check if a tour has ended (end_date < today)
  const hasTourEnded = (tour: Tour) => {
    const endDate = parseISO(tour.end_date);
    return endDate < today;
  };

  // Helper to check if a tour is starting in the future
  const isFutureTour = (tour: Tour) => {
    const startDate = parseISO(tour.start_date);
    return startDate > today;
  };

  // Filter tours that need drivers (PENDING):
  // - No driver assigned yet (driver_id is null)
  // - Tour hasn't ended yet
  const pendingTours = tours.filter((tour) => {
    const noDriver = !tour.driver_id;
    const notEnded = !hasTourEnded(tour);
    const notCancelled = tour.status !== "cancelled";
    return noDriver && notEnded && notCancelled;
  });

  // Filter UPCOMING tours:
  // - Has driver assigned
  // - Tour start_date is in the future
  const upcomingTours = tours.filter((tour) => {
    const hasDriver = !!tour.driver_id;
    const isFuture = isFutureTour(tour);
    const notCancelled = tour.status !== "cancelled";
    return hasDriver && isFuture && notCancelled;
  });

  // Filter ONGOING tours:
  // - Has driver assigned  
  // - Tour has started but not ended (start_date <= today < end_date)
  const ongoingTours = tours.filter((tour) => {
    const hasDriver = !!tour.driver_id;
    const startDate = parseISO(tour.start_date);
    const endDate = parseISO(tour.end_date);
    const hasStarted = startDate <= today;
    const notEnded = endDate >= today;
    const notCancelled = tour.status !== "cancelled";
    return hasDriver && hasStarted && notEnded && notCancelled;
  });

  // Filter COMPLETED tours:
  // - Tour end_date has passed (this is the key change - date-based completion)
  const completedTours = tours.filter((tour) => {
    const hasEnded = hasTourEnded(tour);
    const notCancelled = tour.status !== "cancelled";
    return hasEnded && notCancelled;
  });

  // Legacy groupings for backwards compatibility
  const toursNeedingDrivers = pendingTours;
  const newTours = upcomingTours.filter(t => t.driver_status === "new");
  const inProgressTours = ongoingTours;
  const completedDriverTours = completedTours.filter(t => !!t.driver_id);

  // Debug: Log all tours and their voucher status
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("All tours with voucher status:", tours.map(t => ({
        client: t.client_name,
        vouchers_completed: t.vouchers_completed,
        driver_id: t.driver_id,
        status: t.status,
      })));
      console.log("Tours needing drivers:", toursNeedingDrivers.length);
    }
  }, [tours, toursNeedingDrivers]);

  const checkDriverAvailability = (driverId: string, tourId: string, startDate: string, endDate: string): { available: boolean; conflict?: Tour } => {
    // Check if driver is already assigned to another tour during this period
    const tourStart = parseISO(startDate);
    const tourEnd = parseISO(endDate);

    const conflictingTour = tours.find((t) => {
      if (t.id === tourId || !t.driver_id || t.driver_id !== driverId) return false;

      const tStart = parseISO(t.start_date);
      const tEnd = parseISO(t.end_date);

      // Check for date overlap
      return (
        isWithinInterval(tourStart, { start: tStart, end: tEnd }) ||
        isWithinInterval(tourEnd, { start: tStart, end: tEnd }) ||
        (tourStart <= tStart && tourEnd >= tEnd)
      );
    });

    return { available: !conflictingTour, conflict: conflictingTour };
  };

  const handleAssignDriver = async (tourId: string, driverId: string) => {
    if (!driverId) return;

    const tour = tours.find((t) => t.id === tourId);
    if (!tour) return;

    // Validate driver availability
    const availability = checkDriverAvailability(driverId, tourId, tour.start_date, tour.end_date);

    if (!availability.available) {
      alert(
        `Cannot assign driver. Driver is already assigned to tour "${availability.conflict?.client_name}" ` +
        `(${format(parseISO(availability.conflict!.start_date), "MMM d")} - ${format(parseISO(availability.conflict!.end_date), "MMM d")})`
      );
      return;
    }

    setAssigning(tourId);

    try {
      const response = await fetch(`/api/tours/${tourId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_id: driverId,
          driver_status: "new",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to assign driver");
      }

      const { tour: updatedTour } = await response.json();

      // Find the driver details
      const assignedDriver = drivers.find((d) => d.id === driverId);

      // Update local state immediately
      setTours((prevTours) =>
        prevTours.map((t) =>
          t.id === tourId
            ? {
              ...t,
              driver_id: driverId,
              driver_status: "new",
              drivers: assignedDriver
                ? {
                  id: assignedDriver.id,
                  name: assignedDriver.name,
                  vehicle_type: assignedDriver.vehicle_type,
                  vehicle_number: assignedDriver.vehicle_number,
                }
                : null,
            }
            : t
        )
      );

      setSelectedTour(null);
      setSelectedDriver("");

      // Refresh server data in background
      router.refresh();
    } catch (error: any) {
      console.error("Error assigning driver:", error);
      alert(error.message || "Failed to assign driver");
    } finally {
      setAssigning(null);
    }
  };

  const handleUnassignDriver = async (tourId: string) => {
    if (!confirm("Are you sure you want to unassign the driver from this tour?")) {
      return;
    }

    setAssigning(tourId);

    try {
      const response = await fetch(`/api/tours/${tourId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_id: null,
          driver_status: null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to unassign driver");
      }

      // Update local state immediately
      setTours((prevTours) =>
        prevTours.map((t) =>
          t.id === tourId
            ? {
              ...t,
              driver_id: null,
              driver_status: null,
              drivers: null,
            }
            : t
        )
      );

      // Refresh server data in background
      router.refresh();
    } catch (error: any) {
      console.error("Error unassigning driver:", error);
      alert(error.message || "Failed to unassign driver");
    } finally {
      setAssigning(null);
    }
  };

  const handleDownloadLogSheet = async (tourId: string) => {
    setDownloadingLogSheet(tourId);
    try {
      const response = await fetch(`/api/driver-log-sheet/${tourId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate log sheet");
      }

      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "LogSheet.xlsx";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Error downloading log sheet:", error);
      alert(error.message || "Failed to download log sheet");
    } finally {
      setDownloadingLogSheet(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="card p-1.5 flex items-center gap-1 bg-surface-100 overflow-x-auto">
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === "pending"
            ? "bg-white shadow-sm text-primary-600"
            : "text-surface-600 hover:text-surface-900 hover:bg-surface-50"
            }`}
        >
          Pending
          {pendingTours.length > 0 && (
            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${activeTab === "pending" ? "bg-primary-100 text-primary-700" : "bg-surface-200 text-surface-600"
              }`}>
              {pendingTours.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === "upcoming"
            ? "bg-white shadow-sm text-purple-600"
            : "text-surface-600 hover:text-surface-900 hover:bg-surface-50"
            }`}
        >
          Upcoming
          {upcomingTours.length > 0 && (
            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${activeTab === "upcoming" ? "bg-purple-100 text-purple-700" : "bg-surface-200 text-surface-600"
              }`}>
              {upcomingTours.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("ongoing")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === "ongoing"
            ? "bg-white shadow-sm text-blue-600"
            : "text-surface-600 hover:text-surface-900 hover:bg-surface-50"
            }`}
        >
          Ongoing
          {ongoingTours.length > 0 && (
            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs animate-pulse ${activeTab === "ongoing" ? "bg-blue-100 text-blue-700" : "bg-surface-200 text-surface-600"
              }`}>
              {ongoingTours.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === "completed"
            ? "bg-white shadow-sm text-green-600"
            : "text-surface-600 hover:text-surface-900 hover:bg-surface-50"
            }`}
        >
          Completed
          {completedTours.length > 0 && (
            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${activeTab === "completed" ? "bg-green-100 text-green-700" : "bg-surface-200 text-surface-600"
              }`}>
              {completedTours.length}
            </span>
          )}
        </button>
      </div>

      {/* Pending Tab - Tours Needing Drivers */}
      {activeTab === "pending" && (
        <>
          {toursNeedingDrivers.length > 0 ? (
            <div className="card shadow-sm border-primary-100">
              <div className="px-6 py-5 border-b border-surface-100 flex items-center justify-between bg-primary-50/30">
                <div>
                  <h3 className="text-lg font-bold text-surface-900 tracking-tight">
                    Pending Driver Assignments
                  </h3>
                  <p className="text-sm text-surface-500 mt-0.5">
                    {toursNeedingDrivers.length} tours are ready for transport planning
                  </p>
                </div>
                <div className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-bold rounded-lg uppercase tracking-wider">
                  Priority
                </div>
              </div>
              <div className="divide-y divide-surface-100">
                {toursNeedingDrivers.map((tour) => {
                  const isAssigning = assigning === tour.id && selectedTour === tour.id;
                  return (
                    <div key={tour.id} className="p-5 hover:bg-surface-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-bold text-surface-900 truncate">{tour.client_name}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${tour.status === "ongoing" ? "bg-[#059669]/10 text-[#059669]" : "bg-blue-50 text-blue-600"}`}>
                              {tour.status === "ongoing" ? "Ongoing" : "Upcoming"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-medium text-surface-500">
                            <span>{format(parseISO(tour.start_date), "MMM d")} - {format(parseISO(tour.end_date), "MMM d, yyyy")}</span>
                            <span>{tour.pax_adults + tour.pax_children} Pax</span>
                          </div>
                        </div>
                        {selectedTour === tour.id ? (
                          <div className="flex flex-wrap items-center gap-2 animate-fade-in">
                            <select
                              value={selectedDriver}
                              onChange={(e) => setSelectedDriver(e.target.value)}
                              className="px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 outline-none bg-white min-w-45"
                            >
                              <option value="">Choose a Driver</option>
                              {drivers.map((driver) => {
                                const availability = checkDriverAvailability(driver.id, tour.id, tour.start_date, tour.end_date);
                                return (
                                  <option key={driver.id} value={driver.id} disabled={!availability.available}>
                                    {driver.name} {driver.vehicle_type ? `(${driver.vehicle_type})` : ""}
                                    {!availability.available ? " (Conflict)" : ""}
                                  </option>
                                );
                              })}
                            </select>
                            <Button size="sm" onClick={() => handleAssignDriver(tour.id, selectedDriver)} disabled={!selectedDriver || isAssigning} loading={isAssigning} className="rounded-xl">
                              Assign
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => { setSelectedTour(null); setSelectedDriver(""); }} className="rounded-xl">
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => setSelectedTour(tour.id)} disabled={!!assigning} className="rounded-xl px-6">
                            Assign Driver
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center bg-surface-50/50 border-dashed">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white shadow-sm flex items-center justify-center text-surface-300">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-surface-900 tracking-tight">All tours assigned</h3>
              <p className="text-sm text-surface-500 mt-1 max-w-xs mx-auto">
                Great work! All currently ready tours have been matched with a driver.
              </p>
            </div>
          )}
        </>
      )}

      {/* Upcoming Tab */}
      {activeTab === "upcoming" && (
        <>
          {upcomingTours.length > 0 ? (
            <div className="card shadow-sm border-purple-200 bg-purple-50/20">
              <div className="px-6 py-5 border-b border-purple-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-surface-900 tracking-tight">Upcoming Tours</h3>
                  <p className="text-sm text-surface-500 mt-0.5">{upcomingTours.length} assigned tours starting soon</p>
                </div>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg uppercase tracking-wider">Upcoming</span>
              </div>
              <div className="divide-y divide-surface-100">
                {upcomingTours.map((tour) => (
                  <div key={tour.id} className="p-5 hover:bg-surface-50 transition-colors">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-surface-900 truncate mb-1">{tour.client_name}</h4>
                        <div className="flex items-center gap-4 text-xs font-medium text-surface-500">
                          <span>{format(parseISO(tour.start_date), "MMM d")} - {format(parseISO(tour.end_date), "MMM d, yyyy")}</span>
                          <span>{tour.pax_adults + tour.pax_children} Pax</span>
                        </div>
                        {tour.drivers && (
                          <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-purple-50 w-fit">
                            <span className="text-xs font-bold text-purple-700">{tour.drivers.name}</span>
                            {tour.drivers.vehicle_type && <span className="text-xs text-purple-500">{tour.drivers.vehicle_type}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadLogSheet(tour.id)} disabled={downloadingLogSheet === tour.id} loading={downloadingLogSheet === tour.id} className="rounded-xl text-[#E04344]">
                          Log Sheet
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => handleUnassignDriver(tour.id)} disabled={assigning === tour.id} className="rounded-xl">
                          Unassign
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center bg-surface-50/50 border-dashed">
              <h3 className="text-lg font-bold text-surface-900">No Upcoming Tours</h3>
              <p className="text-sm text-surface-500 mt-1">Tours with assigned drivers starting in the future will appear here.</p>
            </div>
          )}
        </>
      )}

      {/* Ongoing Tab */}
      {activeTab === "ongoing" && (
        <>
          {ongoingTours.length > 0 ? (
            <div className="card shadow-sm border-blue-200 bg-blue-50/20">
              <div className="px-6 py-5 border-b border-blue-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-surface-900 tracking-tight">Ongoing Tours</h3>
                  <p className="text-sm text-surface-500 mt-0.5">{ongoingTours.length} tours currently in operation</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg uppercase tracking-wider animate-pulse">Live</span>
              </div>
              <div className="divide-y divide-surface-100">
                {ongoingTours.map((tour) => (
                  <div key={tour.id} className="p-5 hover:bg-surface-50 transition-colors">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-surface-900 truncate mb-1">{tour.client_name}</h4>
                        <div className="flex items-center gap-4 text-xs font-medium text-surface-500">
                          <span>{format(parseISO(tour.start_date), "MMM d")} - {format(parseISO(tour.end_date), "MMM d, yyyy")}</span>
                          <span>{tour.pax_adults + tour.pax_children} Pax</span>
                        </div>
                        {tour.drivers && (
                          <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-blue-50 w-fit">
                            <span className="text-xs font-bold text-blue-700">{tour.drivers.name}</span>
                            {tour.drivers.vehicle_type && <span className="text-xs text-blue-500">{tour.drivers.vehicle_type}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadLogSheet(tour.id)} disabled={downloadingLogSheet === tour.id} loading={downloadingLogSheet === tour.id} className="rounded-xl text-[#E04344]">
                          Log Sheet
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center bg-surface-50/50 border-dashed">
              <h3 className="text-lg font-bold text-surface-900">No Ongoing Tours</h3>
              <p className="text-sm text-surface-500 mt-1">Tours that have started but not ended will appear here.</p>
            </div>
          )}
        </>
      )}

      {/* Completed Tab */}
      {activeTab === "completed" && (
        <>
          {completedTours.length > 0 ? (
            <div className="card shadow-sm border-surface-200">
              <div className="px-6 py-5 border-b border-surface-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-surface-900 tracking-tight">Completed Tours</h3>
                  <p className="text-sm text-surface-500 mt-0.5">{completedTours.length} tours finished (end date passed)</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg uppercase tracking-wider">Done</span>
              </div>
              <div className="divide-y divide-surface-100">
                {completedTours.map((tour) => (
                  <div key={tour.id} className="p-5 hover:bg-surface-50 transition-colors opacity-80">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-surface-900 truncate mb-1">{tour.client_name}</h4>
                        <div className="flex items-center gap-4 text-xs font-medium text-surface-500">
                          <span>{format(parseISO(tour.start_date), "MMM d")} - {format(parseISO(tour.end_date), "MMM d, yyyy")}</span>
                          <span>{tour.pax_adults + tour.pax_children} Pax</span>
                        </div>
                        {tour.drivers && (
                          <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-green-50 w-fit">
                            <span className="text-xs font-bold text-green-700">{tour.drivers.name}</span>
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDownloadLogSheet(tour.id)} disabled={downloadingLogSheet === tour.id} loading={downloadingLogSheet === tour.id} className="rounded-xl text-[#E04344]">
                        Log Sheet
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center bg-surface-50/50 border-dashed">
              <h3 className="text-lg font-bold text-surface-900">No Completed Tours</h3>
              <p className="text-sm text-surface-500 mt-1">Tours whose end date has passed will appear here.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
