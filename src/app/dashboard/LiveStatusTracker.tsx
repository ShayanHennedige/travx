"use client";

import { useEffect, useState } from "react";
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
  invoice_status?: ComponentStatus | null;
  invoices_count?: number;
  voucher_status: ComponentStatus | null;
  vouchers_count: number;
  driver_status: ComponentStatus | null;
  driver_id: string | null;
  driver_name: string | null;
  tour_id: string | null;
  agent_name?: string | null;
  agent_email?: string | null;
  agent_company?: string | null;
}

interface LiveStatusTrackerProps {
  items: StatusTrackerItem[];
}

export function LiveStatusTracker({ items }: LiveStatusTrackerProps) {

  const [currentPage, setCurrentPage] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const itemsPerPage = 8;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="card">
        <div className="px-6 py-4 border-b border-surface-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-surface-900">
            Operations Tracker
          </h2>
          <span className="text-xs text-surface-500 font-medium bg-surface-100 px-2.5 py-1 rounded-full">
            Total: {items.length}
          </span>
        </div>
        <div className="p-12 text-center text-surface-500">
          Loading tracker...
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const offset = (currentPage - 1) * itemsPerPage;
  const currentItems = items.slice(offset, offset + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-surface-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-surface-900">
          Operations Tracker
        </h2>
        <span className="text-xs text-surface-500 font-medium bg-surface-100 px-2.5 py-1 rounded-full">
          Total: {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-surface-900 mb-1">
            No inquiries yet
          </h3>
          <p className="text-surface-500">
            Share the inquiry form link with your clients to start receiving inquiries
          </p>
        </div>
      ) : (
        <div>
          <div className="overflow-x-auto">
            <table className="w-full relative">
              <thead className="sticky top-0 z-20">
                <tr className="border-b border-surface-200 bg-surface-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                    Progress Tracker
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 bg-white">
                {currentItems.map((item) => {
                  const detailUrl = item.type === "group"
                    ? `/group-inquiries/${item.group_inquiry_id || item.inquiry_id}`
                    : `/inquiries/${item.inquiry_id}`;

                  const hasItinerary = !!item.itinerary_id;
                  const hasVouchers = item.vouchers_count > 0;
                  const hasDriver = !!item.driver_id;
                  // Driver stage should show if there's an itinerary (since tours are created from itineraries)
                  const hasTour = !!item.tour_id || hasItinerary;

                  return (
                    <tr key={item.id} className="hover:bg-surface-50 transition-colors">
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
                          className="text-sm font-medium text-[#E04344] hover:text-[#DC2626]"
                        >
                          {item.reference}
                        </Link>
                      </td>

                      {/* Client */}
                      <td className="px-6 py-4">
                        {item.agent_name ? (
                          <div>
                            <p className="text-sm font-bold text-surface-900 leading-tight">{item.agent_name}</p>
                            {item.agent_company && (
                              <p className="text-[10px] text-surface-500 font-medium uppercase tracking-widest mt-0.5">{item.agent_company}</p>
                            )}
                            <p className="text-xs text-primary-600 mt-1 font-medium">{item.agent_email}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-bold text-surface-900 leading-tight">{item.client_name || "Direct Booking"}</p>
                          </div>
                        )}
                      </td>

                      {/* Progress Tracker */}
                      <td className="px-6 py-4">
                        <ProgressBarTracker
                          item={item}
                          hasItinerary={hasItinerary}
                          hasInvoices={(item.invoices_count || 0) > 0}
                          hasVouchers={hasVouchers}
                          hasDriver={hasDriver}
                          hasTour={hasTour}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-surface-200 flex items-center justify-between bg-surface-50">
              <div className="text-sm text-surface-500">
                Showing <span className="font-medium">{offset + 1}</span> to <span className="font-medium">{Math.min(offset + itemsPerPage, items.length)}</span> of <span className="font-medium">{items.length}</span> results
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${currentPage === page
                        ? "bg-primary-600 text-white"
                        : "text-surface-600 hover:bg-surface-200"
                        }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
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
    new: { label: "New", color: "bg-yellow-100 text-yellow-700" },
    in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
    quoted: { label: "Quoted", color: "bg-purple-100 text-purple-700" },
    confirmed: { label: "Confirmed", color: "bg-green-100 text-green-700" },
    cancelled: { label: "Cancelled", color: "bg-accent-200 text-accent-900" },
    completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  };

  const config = statusConfig[status] || statusConfig.new;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}


interface ProgressBarTrackerProps {
  item: StatusTrackerItem;
  hasItinerary: boolean;
  hasInvoices: boolean;
  hasVouchers: boolean;
  hasDriver: boolean;
  hasTour: boolean;
}

function ProgressBarTracker({
  item,
  hasItinerary,
  hasInvoices,
  hasVouchers,
  hasDriver,
  hasTour,
}: ProgressBarTrackerProps) {
  // Define stages in order
  const stages = [
    {
      key: "inquiry",
      label: "Inquiry",
      exists: true, // Inquiry always exists
      status: (item.inquiry_status === "confirmed" || item.inquiry_status === "completed" || hasItinerary) ? "completed" :
        (item.inquiry_status === "in_progress" || item.inquiry_status === "quoted") ? "in_progress" : "pending",
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
      key: "invoices",
      label: "Invoices",
      exists: hasInvoices,
      status: hasInvoices ? (item.invoice_status || "new") : "pending",
      // If invoices exist (hasInvoices), show status. If none, pending.
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

  // Always show all four stages
  const visibleStages = stages;

  return (
    <div className="min-w-[500px]">
      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        {visibleStages.map((stage, index) => {
          const isCompleted = stage.status === "completed";
          const isInProgress = stage.status === "in_progress";
          const isLast = index === visibleStages.length - 1;

          return (
            <div key={stage.key} className="flex items-center flex-1">
              {/* Stage Circle & Label Group */}
              <div className="flex flex-col items-center relative z-10 min-w-[60px]">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${isCompleted
                    ? "bg-[#059669] text-white shadow-sm"
                    : isInProgress
                      ? "bg-primary-600 text-white ring-4 ring-primary-100"
                      : "bg-surface-100 text-surface-400 border border-surface-200"
                    }`}
                >
                  <div className={isCompleted || isInProgress ? "text-white" : "text-surface-400"}>
                    {stage.icon}
                  </div>
                </div>
                {/* Stage Label - Always Black */}
                <span className={`text-[10px] font-bold mt-1.5 uppercase tracking-wider ${isCompleted || isInProgress ? "text-surface-900" : "text-surface-400"
                  }`}>
                  {stage.label}
                </span>
                {stage.key === "driver" && stage.driverName && (
                  <span className="text-[9px] text-surface-500 mt-0.5 max-w-[80px] truncate text-center font-medium">
                    {stage.driverName}
                  </span>
                )}
              </div>

              {/* Connector Line - Muted Green */}
              {!isLast && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-all duration-500 ${isCompleted
                    ? "bg-[#059669]"
                    : "bg-surface-200"
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
