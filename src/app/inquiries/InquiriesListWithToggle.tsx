"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { StatusBadge, PriorityBadge, Badge, Button } from "@/components/ui";
import { InquiryStatus } from "@/types/database";
import { inquiryStatuses } from "@/lib/validations/inquiry";

interface IndividualInquiry {
  id: string;
  inquiry_number: string;
  first_name: string;
  last_name: string;
  passport_no?: string;
  client_email: string;
  contact_number: string;
  country: string;
  arriving_date: string;
  departure_date: string;
  no_of_nights: number;
  no_of_pax: number;
  no_of_children: number;
  rooms_dbl: number;
  rooms_sgl: number;
  rooms_tpl: number;
  rooms_qtpl: number;
  status: string;
  priority: string;
  created_at: string;
}

interface GroupInquiry {
  id: string;
  inquiry_number: string;
  head_first_name: string;
  head_last_name: string;
  head_passport_no?: string;
  client_email: string;
  contact_number: string;
  country: string;
  arriving_date: string;
  departure_date: string;
  no_of_nights: number;
  no_of_adults: number;
  no_of_children: number;
  rooms_dbl: number;
  rooms_sgl: number;
  rooms_tpl: number;
  rooms_qtpl: number;
  status: string;
  priority: string;
  created_at: string;
}

interface InquiriesListWithToggleProps {
  individualInquiries: IndividualInquiry[];
  groupInquiries: GroupInquiry[];
}

type ViewMode = "individual" | "group";

export function InquiriesListWithToggle({
  individualInquiries,
  groupInquiries,
}: InquiriesListWithToggleProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("individual");

  const individualCount = individualInquiries.length;
  const groupCount = groupInquiries.length;

  return (
    <div className="space-y-6">
      {/* Toggle Button */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg bg-surface-800 light:bg-surface-200 p-1 border border-surface-700 light:border-surface-300">
          <button
            onClick={() => setViewMode("individual")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === "individual"
                ? "bg-accent-500 text-white light:text-black shadow-sm"
                : "text-surface-400 light:text-surface-600 hover:text-surface-100 light:hover:text-surface-900"
            }`}
          >
            <UserIcon className="h-4 w-4" />
            Individual
            <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
              viewMode === "individual" 
                ? "bg-black/20 text-white light:text-black" 
                : "bg-surface-700 light:bg-surface-300 text-surface-400 light:text-surface-600"
            }`}>
              {individualCount}
            </span>
          </button>
          <button
            onClick={() => setViewMode("group")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === "group"
                ? "bg-accent-500 text-white light:text-black shadow-sm"
                : "text-surface-400 light:text-surface-600 hover:text-surface-100 light:hover:text-surface-900"
            }`}
          >
            <UsersIcon className="h-4 w-4" />
            Group
            <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
              viewMode === "group" 
                ? "bg-black/20 text-white light:text-black" 
                : "bg-surface-700 light:bg-surface-300 text-surface-400 light:text-surface-600"
            }`}>
              {groupCount}
            </span>
          </button>
        </div>

        <div className="text-sm text-surface-400 light:text-surface-500">
          {viewMode === "individual" 
            ? `${individualCount} individual inquiries`
            : `${groupCount} group inquiries`
          }
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {viewMode === "individual" ? (
          <IndividualInquiriesTable inquiries={individualInquiries} />
        ) : (
          <GroupInquiriesTable inquiries={groupInquiries} />
        )}
      </div>
    </div>
  );
}

function IndividualInquiriesTable({ inquiries }: { inquiries: IndividualInquiry[] }) {
  if (inquiries.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-700 light:bg-surface-200 flex items-center justify-center">
          <UserIcon className="w-8 h-8 text-surface-400" />
        </div>
        <h3 className="text-lg font-medium text-surface-100 light:text-surface-900 mb-1">
          No individual inquiries yet
        </h3>
        <p className="text-surface-400 light:text-surface-500">
          Share the inquiry form link with your clients
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-600 light:border-surface-200 bg-surface-800/50 light:bg-surface-100">
            <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
              Inquiry
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
              Client
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
              Country
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
              Travel Dates
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
              Pax
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
              Rooms
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-600 light:divide-surface-200">
          {inquiries.map((inquiry, index) => {
            const totalPax = (inquiry.no_of_pax || 0) + (inquiry.no_of_children || 0);
            return (
              <motion.tr
                key={inquiry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="hover:bg-surface-700/50 light:hover:bg-surface-100 transition-colors"
              >
                <td className="px-6 py-4">
                  <Link
                    href={`/inquiries/${inquiry.id}`}
                    className="text-sm font-medium text-primary-400 light:text-primary-600 hover:text-primary-300 light:hover:text-primary-700"
                  >
                    {inquiry.inquiry_number}
                  </Link>
                    <p className="text-xs text-surface-400 light:text-surface-500 mt-0.5">
                    {format(new Date(inquiry.created_at), "MMM d, yyyy")}
                  </p>
                </td>
                <td className="px-6 py-4">
                    <p className="text-sm font-medium text-surface-100 light:text-surface-900">
                    {inquiry.first_name} {inquiry.last_name}
                  </p>
                    <p className="text-xs text-surface-400 light:text-surface-500">
                    {inquiry.client_email}
                  </p>
                </td>
                <td className="px-6 py-4 text-sm text-surface-300 light:text-surface-600">
                  {inquiry.country || "N/A"}
                </td>
                <td className="px-6 py-4 text-sm text-surface-300 light:text-surface-600">
                  {inquiry.arriving_date ? (
                    <>
                      {format(new Date(inquiry.arriving_date), "MMM d")}
                      {inquiry.departure_date &&
                        ` - ${format(new Date(inquiry.departure_date), "MMM d")}`}
                      <span className="text-surface-500 ml-1">
                        ({inquiry.no_of_nights}N)
                      </span>
                    </>
                  ) : (
                    <span className="text-surface-400">TBD</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-surface-300 light:text-surface-600">
                  <span className="font-medium">{totalPax}</span> pax
                </td>
                <td className="px-6 py-4 text-sm text-surface-300 light:text-surface-600">
                  <span className="text-xs">
                    {inquiry.rooms_dbl > 0 && `${inquiry.rooms_dbl}D `}
                    {inquiry.rooms_sgl > 0 && `${inquiry.rooms_sgl}S `}
                    {inquiry.rooms_tpl > 0 && `${inquiry.rooms_tpl}T `}
                    {inquiry.rooms_qtpl > 0 && `${inquiry.rooms_qtpl}Q`}
                    {!inquiry.rooms_dbl && !inquiry.rooms_sgl && !inquiry.rooms_tpl && !inquiry.rooms_qtpl && "-"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <StatusSelector
                    inquiryId={inquiry.id}
                    currentStatus={inquiry.status as InquiryStatus}
                    inquiryType="individual"
                  />
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/inquiries/${inquiry.id}`}>
                    <Button variant="secondary" size="sm">
                      View
                    </Button>
                  </Link>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GroupInquiriesTable({ inquiries }: { inquiries: GroupInquiry[] }) {
  if (inquiries.length === 0) {
    return (
      <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-900/50 light:bg-purple-100 flex items-center justify-center">
          <UsersIcon className="w-8 h-8 text-purple-300 light:text-purple-700" />
        </div>
        <h3 className="text-lg font-medium text-surface-100 light:text-surface-900 mb-1">
          No group inquiries yet
        </h3>
        <p className="text-surface-400 light:text-surface-500">
          Group inquiries will appear here when clients submit group booking requests
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-600 light:border-surface-200 bg-surface-800/50 light:bg-surface-100">
            <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
              Inquiry
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
              Group Leader
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
              Country
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
              Travel Dates
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
              Group Size
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
              Rooms
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-600 light:divide-surface-200">
          {inquiries.map((inquiry, index) => {
            const totalPax = (inquiry.no_of_adults || 0) + (inquiry.no_of_children || 0);
            return (
              <motion.tr
                key={inquiry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="hover:bg-surface-700/50 light:hover:bg-surface-100 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="purple">Group</Badge>
                    <Link
                      href={`/group-inquiries/${inquiry.id}`}
                      className="text-sm font-medium text-primary-400 light:text-primary-600 hover:text-primary-300 light:hover:text-primary-700"
                    >
                      {inquiry.inquiry_number}
                    </Link>
                  </div>
                    <p className="text-xs text-surface-400 light:text-surface-500 mt-0.5">
                    {format(new Date(inquiry.created_at), "MMM d, yyyy")}
                  </p>
                </td>
                <td className="px-6 py-4">
                    <p className="text-sm font-medium text-surface-100 light:text-surface-900">
                    {inquiry.head_first_name} {inquiry.head_last_name}
                  </p>
                    <p className="text-xs text-surface-400 light:text-surface-500">
                    {inquiry.client_email}
                  </p>
                </td>
                <td className="px-6 py-4 text-sm text-surface-300 light:text-surface-600">
                  {inquiry.country || "N/A"}
                </td>
                <td className="px-6 py-4 text-sm text-surface-300 light:text-surface-600">
                  {inquiry.arriving_date ? (
                    <>
                      {format(new Date(inquiry.arriving_date), "MMM d")}
                      {inquiry.departure_date &&
                        ` - ${format(new Date(inquiry.departure_date), "MMM d")}`}
                      <span className="text-surface-500 ml-1">
                        ({inquiry.no_of_nights}N)
                      </span>
                    </>
                  ) : (
                    <span className="text-surface-400">TBD</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-surface-100">{totalPax} pax</span>
                    <span className="text-xs text-surface-400">
                      ({inquiry.no_of_adults}A {inquiry.no_of_children > 0 && `+ ${inquiry.no_of_children}C`})
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-surface-300 light:text-surface-600">
                  <span className="text-xs">
                    {inquiry.rooms_dbl > 0 && `${inquiry.rooms_dbl}D `}
                    {inquiry.rooms_sgl > 0 && `${inquiry.rooms_sgl}S `}
                    {inquiry.rooms_tpl > 0 && `${inquiry.rooms_tpl}T `}
                    {inquiry.rooms_qtpl > 0 && `${inquiry.rooms_qtpl}Q`}
                    {!inquiry.rooms_dbl && !inquiry.rooms_sgl && !inquiry.rooms_tpl && !inquiry.rooms_qtpl && "-"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <StatusSelector
                    inquiryId={inquiry.id}
                    currentStatus={inquiry.status as InquiryStatus}
                    inquiryType="group"
                  />
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/group-inquiries/${inquiry.id}`}>
                    <Button variant="secondary" size="sm">
                      View
                    </Button>
                  </Link>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

interface StatusSelectorProps {
  inquiryId: string;
  currentStatus: InquiryStatus;
  inquiryType: "individual" | "group";
}

function StatusSelector({ inquiryId, currentStatus, inquiryType }: StatusSelectorProps) {
  const router = useRouter();
  const [status, setStatus] = useState<InquiryStatus>(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: InquiryStatus) => {
    if (newStatus === currentStatus) return;
    
    setStatus(newStatus);
    setIsUpdating(true);
    
    try {
      const table = inquiryType === "individual" ? "inquiries" : "group_inquiries";
      const response = await fetch(`/api/${inquiryType === "individual" ? "inquiries" : "group-inquiries"}/${inquiryId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");
      
      router.refresh();
    } catch (error) {
      console.error("Error updating status:", error);
      setStatus(currentStatus); // Revert on error
      alert("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const statusOptions = inquiryStatuses.map((s) => ({
    value: s,
    label: s.charAt(0).toUpperCase() + s.slice(1).replace("_", " "),
  }));

  return (
    <div className="flex items-center gap-2">
      <StatusBadge status={status} />
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value as InquiryStatus)}
        disabled={isUpdating}
        className="px-2 py-1 text-xs border border-surface-600 light:border-surface-300 rounded focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-surface-800 light:bg-white text-surface-100 light:text-surface-900 disabled:opacity-50"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
