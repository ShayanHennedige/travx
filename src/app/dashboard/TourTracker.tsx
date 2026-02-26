"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, isWithinInterval, parseISO } from "date-fns";
import { Button, Badge } from "@/components/ui";

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
  meals?: {
    breakfast: string;
    lunch: string;
    dinner: string;
  };
  notes?: string;
}

interface ItineraryContent {
  title: string;
  summary?: string;
  days: ItineraryDay[];
  practical_notes?: string[];
  total_driving_hours?: string;
}

interface Tour {
  id: string;
  client_name: string;
  start_date: string;
  end_date: string;
  pax_adults: number;
  pax_children: number;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  driver?: {
    id: string;
    name: string;
    contact_number: string;
    vehicle_type: string | null;
    vehicle_number: string | null;
  } | null;
  itinerary?: {
    id: string;
    content: ItineraryContent;
  } | null;
}

interface Driver {
  id: string;
  name: string;
  contact_number: string;
  vehicle_type: string | null;
  vehicle_number: string | null;
}

interface TourTrackerProps {
  tours: Tour[];
  drivers: Driver[];
}

const statusColors = {
  upcoming: "bg-primary-900/50 text-primary-300 border border-primary-700/50",
  ongoing: "bg-green-900/50 text-green-300 border border-green-700/50",
  completed: "bg-surface-800 text-surface-300 border border-surface-600",
  cancelled: "bg-red-900/50 text-red-300 border border-red-700/50",
};

const statusLabels = {
  upcoming: "Upcoming",
  ongoing: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function TourTracker({ tours, drivers }: TourTrackerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);

  // Generate days for current month view
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Get tours for a specific day
  const getToursForDay = (day: Date) => {
    return tours.filter((tour) => {
      const startDate = parseISO(tour.start_date);
      const endDate = parseISO(tour.end_date);
      return isWithinInterval(day, { start: startDate, end: endDate }) || 
             isSameDay(day, startDate) || 
             isSameDay(day, endDate);
    });
  };

  // Check if tour starts on this day
  const isTourStart = (tour: Tour, day: Date) => {
    return isSameDay(parseISO(tour.start_date), day);
  };

  // Check if tour ends on this day
  const isTourEnd = (tour: Tour, day: Date) => {
    return isSameDay(parseISO(tour.end_date), day);
  };

  // Get itinerary day for a specific date
  const getItineraryDayForDate = (tour: Tour, day: Date): ItineraryDay | null => {
    if (!tour.itinerary?.content?.days || tour.itinerary.content.days.length === 0) return null;
    
    const tourStartDate = parseISO(tour.start_date);
    const dayStr = format(day, "yyyy-MM-dd");
    
    // Calculate day number (1-based, starting from tour start date)
    const daysDiff = Math.floor((day.getTime() - tourStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const dayNumber = daysDiff + 1;
    
    // First try to match by exact date
    const byDate = tour.itinerary.content.days.find((d) => {
      if (d.date) {
        const itineraryDate = new Date(d.date);
        return format(itineraryDate, "yyyy-MM-dd") === dayStr;
      }
      return false;
    });
    
    if (byDate) return byDate;
    
    // Fallback to matching by day number (if dayNumber is within valid range)
    if (dayNumber > 0 && dayNumber <= tour.itinerary.content.days.length) {
      return tour.itinerary.content.days[dayNumber - 1];
    }
    
    return null;
  };

  // Get color for tour bar
  const getTourColor = (index: number) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-teal-500",
      "bg-indigo-500",
      "bg-amber-500",
    ];
    return colors[index % colors.length];
  };

  // Weekday headers
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Get the starting day offset
  const startOffset = startOfMonth(currentMonth).getDay();

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-surface-100 light:text-surface-900">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-surface-800 light:hover:bg-surface-200 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-surface-400 light:text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1.5 text-sm font-medium text-accent-400 light:text-accent-600 hover:bg-accent-500/20 light:hover:bg-accent-100 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-surface-800 light:hover:bg-surface-200 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-surface-400 light:text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary-500"></div>
            <span className="text-surface-400 light:text-surface-600">Tour Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-surface-900 light:bg-white border-2 border-green-500"></div>
            <span className="text-surface-400 light:text-surface-600">Arrival</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-surface-900 light:bg-white border-2 border-red-500"></div>
            <span className="text-surface-400 light:text-surface-600">Departure</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 bg-surface-800/50 light:bg-surface-100 border-b border-surface-700 light:border-surface-200">
          {weekdays.map((day) => (
            <div key={day} className="px-2 py-3 text-center text-sm font-medium text-surface-400 light:text-surface-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {/* Empty cells for offset */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`offset-${i}`} className="min-h-[120px] bg-surface-800/30 light:bg-surface-50 border-b border-r border-surface-700 light:border-surface-200" />
          ))}

          {/* Day cells */}
          {monthDays.map((day, index) => {
            const dayTours = getToursForDay(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[160px] border-b border-r border-surface-700 light:border-surface-200 p-1 ${
                  isCurrentDay ? "bg-primary-900/20 light:bg-primary-100" : ""
                }`}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1 px-1">
                  <span
                    className={`text-sm font-medium ${
                      isCurrentDay
                        ? "w-7 h-7 rounded-full bg-accent-500 text-white light:text-black flex items-center justify-center"
                        : "text-surface-400 light:text-surface-600"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Tour bars and day info */}
                <div className="space-y-1">
                  {dayTours.slice(0, 2).map((tour, tourIndex) => {
                    const isStart = isTourStart(tour, day);
                    const isEnd = isTourEnd(tour, day);
                    const itineraryDay = getItineraryDayForDate(tour, day);
                    const hasDayInfo = itineraryDay && (itineraryDay.overnight_location || itineraryDay.hotel_suggestion);

                    return (
                      <div key={tour.id} className="space-y-0.5">
                        <button
                          onClick={() => setSelectedTour(tour)}
                          className={`w-full text-left px-2 py-1 text-xs font-medium text-white truncate transition-all hover:opacity-90 ${getTourColor(
                            tours.indexOf(tour)
                          )} ${isStart ? hasDayInfo ? "rounded-tl-md" : "rounded-l-full" : ""} ${isEnd ? hasDayInfo ? "rounded-tr-md" : "rounded-r-full" : ""}`}
                          title={`${tour.client_name} - ${format(parseISO(tour.start_date), "MMM d")} to ${format(parseISO(tour.end_date), "MMM d")}`}
                        >
                          {isStart && (
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0"></span>
                              <span className="font-semibold">Arrival</span>
                              <span className="opacity-90 truncate">{tour.client_name}</span>
                            </span>
                          )}
                          {isEnd && !isStart && (
                            <span className="flex items-center gap-1.5">
                              <span className="font-semibold">Departure</span>
                              <span className="opacity-90 truncate">{tour.client_name}</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-white/70 ml-auto flex-shrink-0"></span>
                            </span>
                          )}
                          {!isStart && !isEnd && (
                            <span className="opacity-0">.</span>
                          )}
                        </button>
                        
                        {/* Day info - Location and Hotel */}
                        {hasDayInfo && (
                          <div className="px-2 py-1 text-[10px] text-surface-400 light:text-surface-600 bg-surface-800 light:bg-surface-50 rounded-b-md border-t border-surface-700 light:border-surface-200">
                            {itineraryDay.overnight_location && (
                              <div className="truncate mb-0.5" title={itineraryDay.overnight_location}>
                                <span className="mr-1">📍</span>
                                {itineraryDay.overnight_location}
                              </div>
                            )}
                            {itineraryDay.hotel_suggestion && (
                              <div className="truncate" title={itineraryDay.hotel_suggestion}>
                                <span className="mr-1">🏨</span>
                                {itineraryDay.hotel_suggestion}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {dayTours.length > 2 && (
                    <div className="px-2 text-xs text-surface-400 light:text-surface-500">
                      +{dayTours.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Tours List */}
      <div className="card">
        <div className="px-6 py-4 border-b border-surface-700 light:border-surface-200">
          <h3 className="text-lg font-semibold text-surface-100 light:text-surface-900">Active & Upcoming Tours</h3>
        </div>
        <div className="divide-y divide-surface-700 light:divide-surface-200">
          {tours
            .filter((t) => t.status === "upcoming" || t.status === "ongoing")
            .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
            .map((tour) => (
              <div
                key={tour.id}
                className="p-4 hover:bg-surface-800/50 light:hover:bg-surface-50 transition-colors cursor-pointer"
                onClick={() => setSelectedTour(tour)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-900/50 light:bg-primary-100 border border-primary-700/50 light:border-transparent flex items-center justify-center text-primary-300 light:text-primary-700 font-bold">
                      {format(parseISO(tour.start_date), "dd")}
                      <span className="text-xs ml-0.5">{format(parseISO(tour.start_date), "MMM")}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-surface-100 light:text-surface-900">{tour.client_name}</h4>
                      <p className="text-sm text-surface-400 light:text-surface-500">
                        {format(parseISO(tour.start_date), "MMM d")} - {format(parseISO(tour.end_date), "MMM d, yyyy")}
                        <span className="mx-2">•</span>
                        {tour.pax_adults + tour.pax_children} pax
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {tour.driver ? (
                      <div className="text-right">
                        <p className="text-sm font-medium text-surface-100 light:text-surface-900">{tour.driver.name}</p>
                        <p className="text-xs text-surface-400 light:text-surface-500">{tour.driver.vehicle_number}</p>
                      </div>
                    ) : (
                      <Badge variant="yellow">No Driver</Badge>
                    )}
                    <Badge variant={tour.status === "ongoing" ? "green" : "blue"}>
                      {statusLabels[tour.status]}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          {tours.filter((t) => t.status === "upcoming" || t.status === "ongoing").length === 0 && (
            <div className="p-8 text-center text-surface-400 light:text-surface-500">
              No active or upcoming tours
            </div>
          )}
        </div>
      </div>

      {/* Tour Detail Modal */}
      {selectedTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "var(--bg-surface)" }}>
            <div className="p-6 border-b border-surface-700 light:border-surface-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-surface-100 light:text-surface-900">
                    {selectedTour.client_name}
                  </h2>
                  <p className="text-sm text-surface-500 light:text-surface-600">
                    {format(parseISO(selectedTour.start_date), "MMMM d")} - {format(parseISO(selectedTour.end_date), "MMMM d, yyyy")}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTour(null)}
                  className="p-2 hover:bg-surface-800 light:hover:bg-surface-200 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-surface-400 light:text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Tour Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-surface-400 light:text-surface-500 uppercase tracking-wider mb-1">Status</p>
                  <Badge variant={selectedTour.status === "ongoing" ? "green" : selectedTour.status === "upcoming" ? "blue" : "secondary"}>
                    {statusLabels[selectedTour.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-surface-400 light:text-surface-500 uppercase tracking-wider mb-1">Passengers</p>
                  <p className="text-sm font-medium text-surface-100 light:text-surface-900">
                    {selectedTour.pax_adults} adults
                    {selectedTour.pax_children > 0 && `, ${selectedTour.pax_children} children`}
                  </p>
                </div>
              </div>

              {/* Driver Section */}
              <div>
                <p className="text-xs text-surface-400 light:text-surface-500 uppercase tracking-wider mb-2">Assigned Driver</p>
                {selectedTour.driver ? (
                  <div className="flex items-center gap-3 p-3 bg-green-900/30 light:bg-green-50 border border-green-700/50 light:border-green-200 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-green-900/50 light:bg-green-100 flex items-center justify-center text-green-300 light:text-green-700 font-bold">
                      {selectedTour.driver.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-surface-100 light:text-surface-900">{selectedTour.driver.name}</p>
                      <p className="text-sm text-surface-400 light:text-surface-500">
                        {selectedTour.driver.contact_number}
                        {selectedTour.driver.vehicle_number && ` • ${selectedTour.driver.vehicle_number}`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-accent-900/30 light:bg-accent-50 border border-accent-700/50 light:border-accent-200 rounded-lg">
                    <p className="text-sm text-accent-300 light:text-accent-800">
                      No driver assigned. Assign a driver from the Drivers section.
                    </p>
                  </div>
                )}
              </div>

              {/* Itinerary Preview */}
              {selectedTour.itinerary && (
                <div>
                  <p className="text-xs text-surface-400 light:text-surface-500 uppercase tracking-wider mb-2">Itinerary</p>
                  <div className="p-3 bg-surface-800 light:bg-surface-50 border border-surface-700 light:border-surface-200 rounded-lg">
                    <p className="font-medium text-surface-100 light:text-surface-900">{selectedTour.itinerary.content.title}</p>
                    <p className="text-sm text-surface-400 light:text-surface-500">
                      {selectedTour.itinerary.content.days?.length || 0} days
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-surface-700 light:border-surface-200">
              <Button variant="secondary" className="w-full" onClick={() => setSelectedTour(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
