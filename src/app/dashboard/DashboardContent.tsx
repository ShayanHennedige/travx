"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Header } from "@/components/layout";
import { StatusBadge, Badge, Button } from "@/components/ui";
import { InquiryStatus } from "@/types/database";
import { TourTracker } from "./TourTracker";
import { LiveStatusTracker, StatusTrackerItem } from "./LiveStatusTracker";
import { useRouter } from "next/navigation";

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
    content: any;
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

export function DashboardContent({ stats, recentInquiries, tours, drivers, statusTrackerItems }: DashboardContentProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");

  // Transform tours data for TourTracker
  const transformedTours = tours.map((tour) => ({
    ...tour,
    driver: tour.drivers || null,
    itinerary: tour.itineraries ? {
      id: tour.itineraries.id,
      content: tour.itineraries.content as any
    } : null,
  })) as any[];

  return (
    <>
      {/* Header with View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <Header
          title={viewMode === "dashboard" ? "Dashboard" : "Tour Tracker"}
          subtitle={viewMode === "dashboard" ? "Overview of travel inquiries" : "Calendar view of active tours"}
        />

        {/* Animated Toggle Switch */}
        <div className="relative bg-surface-100 rounded-full p-1 flex items-center">
          {/* Sliding Background */}
          <div
            className={`absolute top-1 bottom-1 w-1/2 bg-accent-500 rounded-full shadow-md transition-all duration-300 ease-out ${viewMode === "tracker" ? "left-1/2 -translate-x-1" : "left-1"
              }`}
          />

          <button
            onClick={() => setViewMode("dashboard")}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${viewMode === "dashboard" ? "text-black" : "text-surface-500 hover:text-surface-700"
              }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Dashboard
          </button>

          <button
            onClick={() => setViewMode("tracker")}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${viewMode === "tracker" ? "text-black" : "text-surface-500 hover:text-surface-700"
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
      <div className="relative">
        {/* Dashboard View */}
        <div
          className={`transition-all duration-500 ease-out ${viewMode === "dashboard"
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-8 absolute inset-0 pointer-events-none"
            }`}
        >
          {/* Stats Grid - Consolidated */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Inquiry Overview */}
            <div className="card p-6 flex flex-col justify-between">
              <div>
                <p className="text-sm font-medium text-surface-500 mb-1">Total Inquiries</p>
                <p className="text-3xl font-bold text-surface-900">{stats.total}</p>
              </div>
              <div className="mt-4 flex gap-4 border-t border-surface-100 pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-medium text-surface-600">{stats.individual} Individual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-xs font-medium text-surface-600">{stats.group} Group</span>
                </div>
              </div>
            </div>

            {/* Pipeline Status */}
            <div className="card p-6">
              <p className="text-sm font-medium text-surface-500 mb-4">Pipeline Status</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    <span className="text-xs font-medium text-surface-700">New</span>
                  </div>
                  <span className="text-xs font-bold text-surface-900">{stats.new}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                    <span className="text-xs font-medium text-surface-700">In Progress</span>
                  </div>
                  <span className="text-xs font-bold text-surface-900">{stats.in_progress}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-surface-700">Confirmed</span>
                  </div>
                  <span className="text-xs font-bold text-surface-900">{stats.confirmed}</span>
                </div>
              </div>
            </div>

            {/* Operational Focus */}
            <div className="card p-6 bg-surface-900 border-none group hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-surface-400">Active Tours</p>
                <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center text-primary-400 group-hover:bg-primary-400 group-hover:text-surface-900 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-white mb-2">{stats.activeTours}</p>
              <p className="text-xs text-surface-400">Ongoing and scheduled tours</p>
            </div>
          </div>

          {/* Progress Tracker */}
          <LiveStatusTracker items={statusTrackerItems} />
        </div>

        {/* Tour Tracker View */}
        <div
          className={`transition-all duration-500 ease-out ${viewMode === "tracker"
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-8 absolute inset-0 pointer-events-none"
            }`}
        >
          <TourTracker
            tours={transformedTours}
            drivers={drivers}
          />
        </div>
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
    surface: "bg-surface-100 text-surface-600",
    blue: "bg-blue-100 text-blue-700",
    yellow: "bg-yellow-100 text-yellow-700",
    purple: "bg-purple-100 text-purple-700",
    green: "bg-green-100 text-green-700",
    orange: "bg-orange-100 text-orange-700",
    teal: "bg-primary-100 text-primary-700",
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
      <p className="text-2xl font-bold text-surface-900">{value}</p>
      <p className="text-sm font-medium text-surface-600">{label}</p>
    </div>
  );
}
