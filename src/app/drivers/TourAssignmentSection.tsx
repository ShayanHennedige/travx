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
  const [downloadingLogSheet, setDownloadingLogSheet] = useState<string | null>(null);

  // Sync with initialTours when parent refreshes
  useEffect(() => {
    setTours(initialTours);
  }, [initialTours]);

  // Filter tours that need drivers:
  // - Vouchers must be completed (vouchers_completed === true)
  // - No driver assigned yet (driver_id is null)
  // - Tour is upcoming or ongoing
  const toursNeedingDrivers = tours.filter((tour) => {
    const vouchersReady = tour.vouchers_completed === true;
    const noDriver = !tour.driver_id;
    const isActive = tour.status === "upcoming" || tour.status === "ongoing";

    // Debug logging
    if (process.env.NODE_ENV === "development") {
      console.log(`Tour ${tour.client_name} filter check:`, {
        vouchersReady,
        vouchers_completed: tour.vouchers_completed,
        noDriver,
        driver_id: tour.driver_id,
        isActive,
        status: tour.status,
        passesFilter: vouchersReady && noDriver && isActive,
      });
    }

    return vouchersReady && noDriver && isActive;
  });

  // Filter tours that already have drivers assigned
  const toursWithDrivers = tours.filter((tour) => {
    const hasDriver = !!tour.driver_id;
    const isActive = tour.status === "upcoming" || tour.status === "ongoing";
    return hasDriver && isActive;
  });

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
      {/* Tours Needing Drivers */}
      {toursNeedingDrivers.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-surface-600 light:border-surface-200">
            <h3 className="text-lg font-semibold text-surface-100 light:text-surface-900">
              Unassigned Tours ({toursNeedingDrivers.length})
            </h3>
            <p className="text-sm text-surface-400 light:text-surface-500 mt-1">
              Tours with completed vouchers ready for driver assignment
            </p>
          </div>
          <div className="divide-y divide-surface-600 light:divide-surface-200">
            {toursNeedingDrivers.map((tour) => {
              const isAssigning = assigning === tour.id && selectedTour === tour.id;

              return (
                <div key={tour.id} className="p-4 hover:bg-surface-700/50 light:hover:bg-surface-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-surface-100 light:text-surface-900">{tour.client_name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tour.status === "ongoing" ? "bg-green-900/50 light:bg-green-100 text-green-300 light:text-green-700" : "bg-primary-900/50 light:bg-primary-100 text-primary-300 light:text-primary-700"
                          }`}>
                          {tour.status === "ongoing" ? "Ongoing" : "Upcoming"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-surface-400 light:text-surface-500">
                        <span>
                          {format(parseISO(tour.start_date), "MMM d")} - {format(parseISO(tour.end_date), "MMM d, yyyy")}
                        </span>
                        <span>{tour.pax_adults + tour.pax_children} pax</span>
                      </div>
                    </div>
                    {selectedTour === tour.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedDriver}
                          onChange={(e) => setSelectedDriver(e.target.value)}
                          className="px-3 py-1.5 text-sm border border-surface-600 light:border-surface-300 rounded-lg focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-surface-800 light:bg-white text-surface-100 light:text-surface-900"
                        >
                          <option value="">Select Driver</option>
                          {drivers.map((driver) => {
                            const availability = checkDriverAvailability(
                              driver.id,
                              tour.id,
                              tour.start_date,
                              tour.end_date
                            );
                            return (
                              <option
                                key={driver.id}
                                value={driver.id}
                                disabled={!availability.available}
                              >
                                {driver.name} {driver.vehicle_type ? `(${driver.vehicle_type})` : ""}
                                {!availability.available ? " - Not Available" : ""}
                              </option>
                            );
                          })}
                        </select>
                        <Button
                          size="sm"
                          onClick={() => handleAssignDriver(tour.id, selectedDriver)}
                          disabled={!selectedDriver || isAssigning}
                          loading={isAssigning}
                        >
                          Assign
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedTour(null);
                            setSelectedDriver("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setSelectedTour(tour.id)}
                        disabled={!!assigning}
                      >
                        Assign Driver
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {toursNeedingDrivers.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-700 light:bg-surface-200 flex items-center justify-center">
            <svg className="w-8 h-8 text-surface-500 light:text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-surface-100 light:text-surface-900 mb-1">
            No tours ready for driver assignment
          </h3>
          <p className="text-surface-400 light:text-surface-500">
            Tours will appear here once vouchers are marked as completed
          </p>
        </div>
      )}

      {/* Assigned Tours */}
      {toursWithDrivers.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-surface-600 light:border-surface-200">
            <h3 className="text-lg font-semibold text-surface-100 light:text-surface-900">
              Active Assignments ({toursWithDrivers.length})
            </h3>
            <p className="text-sm text-surface-400 light:text-surface-500 mt-1">
              Tours with drivers currently assigned
            </p>
          </div>
          <div className="divide-y divide-surface-600 light:divide-surface-200">
            {toursWithDrivers.map((tour) => {
              const isUnassigning = assigning === tour.id;
              const driver = tour.drivers;

              return (
                <div key={tour.id} className="p-4 hover:bg-surface-700/50 light:hover:bg-surface-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-surface-100 light:text-surface-900">{tour.client_name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tour.status === "ongoing" ? "bg-green-900/50 light:bg-green-100 text-green-300 light:text-green-700" : "bg-primary-900/50 light:bg-primary-100 text-primary-300 light:text-primary-700"
                          }`}>
                          {tour.status === "ongoing" ? "Ongoing" : "Upcoming"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-surface-400 light:text-surface-500">
                        <span>
                          {format(parseISO(tour.start_date), "MMM d")} - {format(parseISO(tour.end_date), "MMM d, yyyy")}
                        </span>
                        <span>{tour.pax_adults + tour.pax_children} pax</span>
                      </div>
                      {driver && (
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <span className="text-surface-400 light:text-surface-500">Driver:</span>
                          <span className="font-medium text-surface-100 light:text-surface-900">{driver.name}</span>
                          {driver.vehicle_type && (
                            <span className="text-surface-400 light:text-surface-500">({driver.vehicle_type}{driver.vehicle_number ? ` • ${driver.vehicle_number}` : ""})</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadLogSheet(tour.id)}
                        disabled={downloadingLogSheet === tour.id}
                        loading={downloadingLogSheet === tour.id}
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Log Sheet
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleUnassignDriver(tour.id)}
                        disabled={isUnassigning}
                        loading={isUnassigning}
                      >
                        Unassign Driver
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
