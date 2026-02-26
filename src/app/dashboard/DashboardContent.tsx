"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout";
import { StatusBadge, Badge, Button } from "@/components/ui";
import { TourTracker } from "./TourTracker";
import { LiveStatusTracker, StatusTrackerItem } from "./LiveStatusTracker";
import { StaggerList, StaggerItem } from "@/components/ui/PageTransition";

interface Inquiry {
  id: string;
  inquiry_number: string;
  first_name: string;
  last_name: string;
  client_email: string;
  arriving_date: string | null;
  departure_date: string | null;
  no_of_pax?: number;
  no_of_adults?: number;
  no_of_children?: number;
  status: string;
  created_at: string;
  type: "individual" | "group";
}

interface Tour {
  id: string;
  client_name: string;
  start_date: string;
  end_date: string;
  pax_adults: number;
  pax_children: number;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  driver_id: string | null;
  drivers?: {
    id: string;
    name: string;
    contact_number: string;
    vehicle_type: string | null;
    vehicle_number: string | null;
  } | null;
  itineraries?: {
    id: string;
    content: {
      title: string;
      days: { day: number; title: string }[];
    };
  } | null;
}

interface Driver {
  id: string;
  name: string;
  contact_number: string;
  vehicle_type: string | null;
  vehicle_number: string | null;
  status: string;
}

interface DashboardContentProps {
  stats: {
    total: number;
    individual: number;
    group: number;
    new: number;
    in_progress: number;
    confirmed: number;
    activeTours: number;
  };
  recentInquiries: Inquiry[];
  tours: Tour[];
  drivers: Driver[];
  statusTrackerItems: StatusTrackerItem[];
}

type ViewMode = "dashboard" | "tracker";

const viewVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 24 : -24,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -24 : 24,
  }),
};

export function DashboardContent({ stats, recentInquiries, tours, drivers, statusTrackerItems }: DashboardContentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [direction, setDirection] = useState(0);

  const handleViewChange = (mode: ViewMode) => {
    setDirection(mode === "tracker" ? 1 : -1);
    setViewMode(mode);
  };

  // Transform tours data for TourTracker
  const transformedTours = tours.map((tour) => ({
    ...tour,
    driver: tour.drivers || null,
    itinerary: tour.itineraries || null,
  }));

  return (
    <>
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between mb-8">
        <Header
          title={viewMode === "dashboard" ? "Dashboard" : "Tour Tracker"}
          subtitle={viewMode === "dashboard" ? "Overview of travel inquiries" : "Calendar view of active tours"}
        />

        {/* Animated Toggle Switch */}
        <div className="relative bg-surface-800 light:bg-surface-200 rounded-full p-1 flex items-center border border-surface-700 light:border-surface-300">
          {/* Sliding Background */}
          <div
            className={`absolute top-1 bottom-1 w-1/2 bg-accent-500 rounded-full shadow-md transition-all duration-300 ease-out ${
              viewMode === "tracker" ? "left-1/2 -translate-x-1" : "left-1"
            }`}
          />
          
          <button
            onClick={() => handleViewChange("dashboard")}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
              viewMode === "dashboard" ? "text-white light:text-black" : "text-surface-400 light:text-surface-600 hover:text-surface-200 light:hover:text-surface-900"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Dashboard
          </button>
          
          <button
            onClick={() => handleViewChange("tracker")}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
              viewMode === "tracker" ? "text-white light:text-black" : "text-surface-400 light:text-surface-600 hover:text-surface-200 light:hover:text-surface-900"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Tour Tracker
          </button>
        </div>
      </div>

      {/* Content with Animation */}
      <div className="relative min-h-[400px]">
        <AnimatePresence mode="wait" custom={direction}>
          {viewMode === "dashboard" ? (
            <motion.div
              key="dashboard"
              custom={direction}
              variants={viewVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0"
            >
              {/* Stats Grid */}
              <StaggerList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                <StaggerItem><StatCard label="Total Inquiries" value={stats.total} color="surface" /></StaggerItem>
                <StaggerItem><StatCard label="Individual" value={stats.individual} color="blue" icon="individual" /></StaggerItem>
                <StaggerItem><StatCard label="Group" value={stats.group} color="purple" icon="group" /></StaggerItem>
                <StaggerItem><StatCard label="New" value={stats.new} color="yellow" /></StaggerItem>
                <StaggerItem><StatCard label="In Progress" value={stats.in_progress} color="orange" /></StaggerItem>
                <StaggerItem><StatCard label="Confirmed" value={stats.confirmed} color="green" /></StaggerItem>
                <StaggerItem><StatCard label="Active Tours" value={stats.activeTours} color="teal" icon="tour" /></StaggerItem>
              </StaggerList>

              {/* Progress Tracker */}
              <LiveStatusTracker items={statusTrackerItems} />
            </motion.div>
          ) : (
            <motion.div
              key="tracker"
              custom={direction}
              variants={viewVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0"
            >
              <TourTracker 
                tours={transformedTours}
                drivers={drivers}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color: "surface" | "blue" | "yellow" | "purple" | "green" | "orange" | "teal";
  icon?: "individual" | "group" | "tour";
}

function StatCard({ label, value, color, icon }: StatCardProps) {
  const colorClasses = {
    surface: "bg-surface-800 light:bg-surface-200 text-surface-300 light:text-surface-700",
    blue: "bg-primary-900/50 light:bg-primary-100 text-primary-300 light:text-primary-800 border border-primary-700/50 light:border-primary-200",
    yellow: "bg-accent-900/50 light:bg-accent-100 text-accent-300 light:text-accent-800 border border-accent-700/50 light:border-accent-200",
    purple: "bg-purple-900/50 light:bg-purple-100 text-purple-300 light:text-purple-800 border border-purple-700/50 light:border-purple-200",
    green: "bg-green-900/50 light:bg-green-100 text-green-300 light:text-green-800 border border-green-700/50 light:border-green-200",
    orange: "bg-orange-900/50 light:bg-orange-100 text-orange-300 light:text-orange-800 border border-orange-700/50 light:border-orange-200",
    teal: "bg-teal-900/50 light:bg-teal-100 text-teal-300 light:text-teal-800 border border-teal-700/50 light:border-teal-200",
  };

  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon === "individual" ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ) : icon === "group" ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ) : icon === "tour" ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
          </svg>
        ) : (
          <span className="text-lg font-bold">{value}</span>
        )}
      </div>
      <p className="text-2xl font-bold text-surface-100 light:text-surface-900">{value}</p>
      <p className="text-sm font-medium text-surface-400 light:text-surface-500">{label}</p>
    </div>
  );
}
