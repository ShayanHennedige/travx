"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { format } from "date-fns";
import { Badge, Button, Select } from "@/components/ui";
import { InquiryStatus } from "@/types/database";

export type ComponentStatus = "new" | "in_progress" | "completed";

export interface StatusTrackerItem {
  id: string;
  type: "individual" | "group";
  inquiry_id: string;
  group_inquiry_id?: string;
  reference: string;
  client_name: string;
  client_email: string;
  inquiry_status: InquiryStatus;
  itinerary_status: ComponentStatus | null;
  itinerary_id: string | null;
  voucher_status: ComponentStatus | null;
  vouchers_count: number;
  driver_status: ComponentStatus | null;
  driver_id: string | null;
  driver_name: string | null;
  tour_id: string | null;
}

interface LiveStatusTrackerProps {
  items: StatusTrackerItem[];
}

export function LiveStatusTracker({ items }: LiveStatusTrackerProps) {
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const updateComponentStatus = async (
    itemId: string,
    component: "itinerary" | "voucher" | "driver",
    status: ComponentStatus,
    item: StatusTrackerItem
  ) => {
    setUpdatingStatus(`${itemId}-${component}`);
    try {
      const endpoint = component === "itinerary"
        ? `/api/itinerary/${item.itinerary_id}/status`
        : component === "voucher"
        ? `/api/vouchers/status`
        : `/api/tours/${item.tour_id}/driver-status`;

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(component === "voucher" && { inquiry_id: item.inquiry_id, group_inquiry_id: item.group_inquiry_id }),
        }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      // Refresh the page to show updated status
      window.location.reload();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
      setUpdatingStatus(null);
    }
  };

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-surface-700 light:border-surface-200">
            <h2 className="text-lg font-semibold text-surface-100 light:text-surface-900">
              Progress Tracker
            </h2>
      </div>

      {items.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-800 light:bg-surface-200 flex items-center justify-center">
            <svg className="w-8 h-8 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-surface-100 light:text-surface-900 mb-1">
            No inquiries yet
          </h3>
          <p className="text-surface-400 light:text-surface-500">
            Share the inquiry form link with your clients to start receiving inquiries
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700 light:border-surface-200 bg-surface-800/50 light:bg-surface-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
                  Progress Tracker
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700 light:divide-surface-200">
              {items.map((item, index) => {
                const detailUrl = item.type === "group" 
                  ? `/group-inquiries/${item.group_inquiry_id || item.inquiry_id}` 
                  : `/inquiries/${item.inquiry_id}`;
                
                const hasItinerary = !!item.itinerary_id;
                const hasVouchers = item.vouchers_count > 0;
                const hasDriver = !!item.driver_id;
                // Driver stage should show if there's an itinerary (since tours are created from itineraries)
                const hasTour = !!item.tour_id || hasItinerary;

                return (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="hover:bg-surface-800/50 light:hover:bg-surface-100 transition-colors"
                  >
                    {/* Type */}
                    <td className="px-6 py-4">
                      <Badge variant={item.type === "group" ? "purple" : "blue"}>
                        {item.type === "group" ? "Group" : "Individual"}
                      </Badge>
                    </td>

                    {/* Reference */}
                    <td className="px-6 py-4">
                      <Link
                        href={detailUrl}
                        className="text-sm font-medium text-primary-400 light:text-primary-600 hover:text-primary-300 light:hover:text-primary-700"
                      >
                        {item.reference}
                      </Link>
                    </td>

                    {/* Client */}
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-surface-100 light:text-surface-900">
                        {item.client_name}
                      </p>
                      <p className="text-xs text-surface-400 light:text-surface-500">
                        {item.client_email}
                      </p>
                    </td>

                    {/* Progress Tracker */}
                    <td className="px-6 py-4">
                      <ProgressBarTracker
                        item={item}
                        hasItinerary={hasItinerary}
                        hasVouchers={hasVouchers}
                        hasDriver={hasDriver}
                        hasTour={hasTour}
                        onStatusChange={updateComponentStatus}
                        updatingStatus={updatingStatus}
                      />
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface StatusBadgeProps {
  status: InquiryStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    new: { label: "New", color: "bg-accent-900/50 text-accent-300 border border-accent-700/50" },
    in_progress: { label: "In Progress", color: "bg-primary-900/50 text-primary-300 border border-primary-700/50" },
    quoted: { label: "Quoted", color: "bg-purple-900/50 text-purple-300 border border-purple-700/50" },
    confirmed: { label: "Confirmed", color: "bg-green-900/50 text-green-300 border border-green-700/50" },
    cancelled: { label: "Cancelled", color: "bg-red-900/50 text-red-300 border border-red-700/50" },
    completed: { label: "Completed", color: "bg-green-900/50 text-green-300 border border-green-700/50" },
  };

  const config = statusConfig[status] || statusConfig.new;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

interface StatusSelectorProps {
  value: ComponentStatus;
  onChange: (status: ComponentStatus) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

function StatusSelector({ value, onChange, disabled, size = "md" }: StatusSelectorProps) {
  const options: { value: ComponentStatus; label: string }[] = [
    { value: "new", label: "New" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ComponentStatus)}
      disabled={disabled}
                  className={`px-2 py-1 border border-surface-600 light:border-surface-300 rounded text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-surface-900 light:bg-white text-surface-100 light:text-surface-900 ${
        size === "sm" ? "text-xs" : "text-sm"
      }`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

interface ProgressBarTrackerProps {
  item: StatusTrackerItem;
  hasItinerary: boolean;
  hasVouchers: boolean;
  hasDriver: boolean;
  hasTour: boolean;
  onStatusChange: (
    itemId: string,
    component: "itinerary" | "voucher" | "driver",
    status: ComponentStatus,
    item: StatusTrackerItem
  ) => void;
  updatingStatus: string | null;
}

function ProgressBarTracker({
  item,
  hasItinerary,
  hasVouchers,
  hasDriver,
  hasTour,
  onStatusChange,
  updatingStatus,
}: ProgressBarTrackerProps) {
  // Define stages in order
  const stages = [
    {
      key: "inquiry",
      label: "Inquiry",
      exists: true, // Inquiry always exists
      status: item.inquiry_status === "confirmed" || item.inquiry_status === "completed" ? "completed" : 
              item.inquiry_status === "in_progress" ? "in_progress" : "pending",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      key: "itinerary",
      label: "Itinerary",
      exists: hasItinerary,
      status: hasItinerary ? (item.itinerary_status || "new") : "pending",
      componentKey: "itinerary" as const,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
        </svg>
      ),
    },
    {
      key: "vouchers",
      label: "Vouchers",
      exists: hasVouchers,
      status: hasVouchers ? (item.voucher_status || "new") : "pending",
      componentKey: "voucher" as const,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
        </svg>
      ),
    },
    {
      key: "driver",
      label: "Driver",
      exists: hasTour, // Show driver stage if there's a tour (itinerary exists)
      // If driver is assigned (hasDriver), show as completed; otherwise pending (grey)
      status: hasDriver ? "completed" : "pending",
      componentKey: "driver" as const,
      driverName: item.driver_name,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
      ),
    },
  ];

  // Only show stages that exist (or inquiry which always exists)
  const visibleStages = stages.filter((stage) => stage.exists || stage.key === "inquiry");

  return (
    <div className="min-w-[500px]">
      {/* Progress Bar */}
      <div className="flex items-center gap-2 mb-3">
        {visibleStages.map((stage, index) => {
          const isCompleted = stage.status === "completed";
          const isInProgress = stage.status === "in_progress";
          const isPending = stage.status === "pending" || stage.status === "new";
          const isLast = index === visibleStages.length - 1;

          return (
            <div key={stage.key} className="flex items-center flex-1">
              {/* Stage Circle */}
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isInProgress
                      ? "bg-primary-500 text-white ring-4 ring-primary-500/30"
                      : "bg-surface-700 light:bg-surface-300 text-surface-500 light:text-surface-600"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className={isInProgress ? "text-white" : "text-surface-500 light:text-surface-600"}>
                      {stage.icon}
                    </div>
                  )}
                </div>
                {/* Stage Label */}
                <span className={`text-xs font-medium mt-1 ${isCompleted || isInProgress ? "text-surface-100 light:text-surface-900" : "text-surface-500 light:text-surface-600"}`}>
                  {stage.label}
                </span>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-all ${
                    isCompleted || (isInProgress && visibleStages[index + 1]?.exists)
                      ? "bg-green-500"
                      : "bg-surface-700 light:bg-surface-300"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
