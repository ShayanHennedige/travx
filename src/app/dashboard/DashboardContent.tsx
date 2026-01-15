"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Header } from "@/components/layout";
import { StatusBadge, Badge, Button } from "@/components/ui";
import { InquiryStatus } from "@/types/database";
import { TourTracker } from "./TourTracker";
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
}

type ViewMode = "dashboard" | "tracker";

export function DashboardContent({ stats, recentInquiries, tours, drivers }: DashboardContentProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");

  // Transform tours data for TourTracker
  const transformedTours = tours.map((tour) => ({
    ...tour,
    driver: tour.drivers || null,
    itinerary: tour.itineraries || null,
  }));

  const handleAssignDriver = async (tourId: string, driverId: string) => {
    try {
      const response = await fetch(`/api/tours/${tourId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driver_id: driverId }),
      });

      if (!response.ok) throw new Error("Failed to assign driver");

      router.refresh();
    } catch (error) {
      console.error("Error assigning driver:", error);
      alert("Failed to assign driver");
    }
  };

  return (
    <>
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between mb-8">
        <Header
          title={viewMode === "dashboard" ? "Dashboard" : "Tour Tracker"}
          subtitle={viewMode === "dashboard" ? "Overview of travel inquiries" : "Calendar view of active tours"}
        />

        {/* Animated Toggle Switch */}
        <div className="relative bg-surface-100 rounded-full p-1 flex items-center">
          {/* Sliding Background */}
          <div
            className={`absolute top-1 bottom-1 w-1/2 bg-white rounded-full shadow-md transition-all duration-300 ease-out ${
              viewMode === "tracker" ? "left-1/2 -translate-x-1" : "left-1"
            }`}
          />
          
          <button
            onClick={() => setViewMode("dashboard")}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
              viewMode === "dashboard" ? "text-surface-900" : "text-surface-500 hover:text-surface-700"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Dashboard
          </button>
          
          <button
            onClick={() => setViewMode("tracker")}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
              viewMode === "tracker" ? "text-surface-900" : "text-surface-500 hover:text-surface-700"
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
          className={`transition-all duration-500 ease-out ${
            viewMode === "dashboard"
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-8 absolute inset-0 pointer-events-none"
          }`}
        >
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <StatCard label="Total Inquiries" value={stats.total} color="surface" />
            <StatCard label="Individual" value={stats.individual} color="blue" icon="individual" />
            <StatCard label="Group" value={stats.group} color="purple" icon="group" />
            <StatCard label="New" value={stats.new} color="yellow" />
            <StatCard label="In Progress" value={stats.in_progress} color="orange" />
            <StatCard label="Confirmed" value={stats.confirmed} color="green" />
            <StatCard label="Active Tours" value={stats.activeTours} color="teal" icon="tour" />
          </div>

          {/* Recent Inquiries */}
          <div className="card">
            <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-900">
                Recent Inquiries
              </h2>
              <Link
                href="/inquiries"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View All
              </Link>
            </div>

            {recentInquiries.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-surface-900 mb-1">
                  No inquiries yet
                </h3>
                <p className="text-surface-500 mb-6">
                  Share the inquiry form link with your clients to start receiving inquiries
                </p>
                <div className="flex items-center justify-center gap-2">
                  <code className="px-3 py-2 bg-surface-100 rounded-lg text-sm text-surface-700">
                    /inquiry
                  </code>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-200 bg-surface-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Inquiry
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Pax
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Travel Dates
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 bg-white">
                    {recentInquiries.map((inquiry) => {
                      const isGroup = inquiry.type === "group";
                      const detailUrl = isGroup 
                        ? `/group-inquiries/${inquiry.id}` 
                        : `/inquiries/${inquiry.id}`;
                      const totalPax = isGroup
                        ? (inquiry.no_of_adults || 0) + (inquiry.no_of_children || 0)
                        : (inquiry.no_of_pax || 0) + (inquiry.no_of_children || 0);

                      return (
                        <tr
                          key={inquiry.id}
                          className="hover:bg-surface-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <Badge variant={isGroup ? "purple" : "blue"}>
                              {isGroup ? "Group" : "Individual"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Link
                              href={detailUrl}
                              className="text-sm font-medium text-primary-600 hover:text-primary-700"
                            >
                              {inquiry.inquiry_number}
                            </Link>
                            <p className="text-xs text-surface-500 mt-0.5">
                              {format(new Date(inquiry.created_at), "MMM d, yyyy")}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-surface-900">
                              {inquiry.first_name} {inquiry.last_name}
                            </p>
                            <p className="text-xs text-surface-500">
                              {inquiry.client_email}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-sm text-surface-700">
                            <span className="font-medium">{totalPax}</span>
                            <span className="text-surface-500"> pax</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-surface-700">
                            {inquiry.arriving_date
                              ? format(new Date(inquiry.arriving_date), "MMM d")
                              : "TBD"}
                            {inquiry.departure_date &&
                              ` - ${format(new Date(inquiry.departure_date), "MMM d")}`}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={inquiry.status as InquiryStatus} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Tour Tracker View */}
        <div
          className={`transition-all duration-500 ease-out ${
            viewMode === "tracker"
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-8 absolute inset-0 pointer-events-none"
          }`}
        >
          <TourTracker 
            tours={transformedTours}
            drivers={drivers}
            onAssignDriver={handleAssignDriver}
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
    teal: "bg-teal-100 text-teal-700",
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
