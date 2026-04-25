"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { StatusBadge, Badge, Button } from "@/components/ui";
import { InquiryStatus } from "@/types/database";
import { inquiryStatuses } from "@/lib/validations/inquiry";
import { getEffectiveStatus } from "@/lib/utils/status";
import { AdminPinModal } from "@/components/AdminPinModal";

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
  agent_name?: string | null;
  agent_email?: string | null;
  agent_company?: string | null;
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
  agent_name?: string | null;
  agent_email?: string | null;
  agent_company?: string | null;
}

interface InquiriesListWithToggleProps {
  individualInquiries: IndividualInquiry[];
  groupInquiries: GroupInquiry[];
}

type ViewMode = "individual" | "group";

export function InquiriesListWithToggle({
  individualInquiries: initialIndividualInquiries,
  groupInquiries: initialGroupInquiries,
}: InquiriesListWithToggleProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("individual");
  const [individualInquiries, setIndividualInquiries] = useState(initialIndividualInquiries);
  const [groupInquiries, setGroupInquiries] = useState(initialGroupInquiries);
  const router = useRouter();

  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{id: string, type: "individual" | "group"} | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredIndividual = individualInquiries.filter((inq) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      inq.inquiry_number?.toLowerCase().includes(q) ||
      `${inq.first_name} ${inq.last_name}`.toLowerCase().includes(q) ||
      inq.country?.toLowerCase().includes(q) ||
      inq.agent_name?.toLowerCase().includes(q) ||
      inq.agent_company?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || inq.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredGroup = groupInquiries.filter((inq) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      inq.inquiry_number?.toLowerCase().includes(q) ||
      `${inq.head_first_name} ${inq.head_last_name}`.toLowerCase().includes(q) ||
      inq.country?.toLowerCase().includes(q) ||
      inq.agent_name?.toLowerCase().includes(q) ||
      inq.agent_company?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || inq.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = (id: string, type: "individual" | "group") => {
    setPendingDelete({ id, type });
    setShowPinModal(true);
  };

  const handlePinAuthorized = () => {
    setShowPinModal(false);
    if (pendingDelete) {
        executeDelete(pendingDelete.id, pendingDelete.type);
    }
    setPendingDelete(null);
  };

  const executeDelete = async (id: string, type: "individual" | "group") => {

    try {
      const endpoint = type === "individual" ? `/api/inquiries/${id}` : `/api/group-inquiries/${id}`;
      const res = await fetch(endpoint, { method: "DELETE" });
      
      if (!res.ok) throw new Error("Failed to delete");
      
      if (type === "individual") {
        setIndividualInquiries((prev) => prev.filter((i) => i.id !== id));
      } else {
        setGroupInquiries((prev) => prev.filter((i) => i.id !== id));
      }
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to delete inquiry");
    }
  };

  const individualCount = individualInquiries.length;
  const groupCount = groupInquiries.length;

  return (
    <div className="space-y-6">
      {/* Toggle Button Container - Sophisticated Segmented Control */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-surface-200">
        <div className="flex flex-col xs:flex-row xs:inline-flex w-full xs:w-auto rounded-xl bg-surface-100 p-1 sm:p-1.5 shadow-inner">
          <button
            onClick={() => setViewMode("individual")}
            className={`flex items-center justify-center xs:justify-start gap-2 sm:gap-2.5 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 ${viewMode === "individual"
              ? "bg-white text-primary-600 shadow-sm scale-[1.02]"
              : "text-surface-500 hover:text-surface-900"
              }`}
          >
            <UserIcon className={`h-4 w-4 sm:h-4.5 sm:w-4.5 ${viewMode === "individual" ? "text-primary-600" : "text-surface-400"}`} />
            Individual
            <span className={`ml-1.5 px-2 py-0.5 text-[9px] sm:text-[10px] font-black rounded-md ${viewMode === "individual"
              ? "bg-primary-50 text-primary-700"
              : "bg-surface-200 text-surface-600"
              }`}>
              {individualCount}
            </span>
          </button>
          <button
            onClick={() => setViewMode("group")}
            className={`flex items-center justify-center xs:justify-start gap-2 sm:gap-2.5 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 ${viewMode === "group"
              ? "bg-white text-purple-600 shadow-sm scale-[1.02]"
              : "text-surface-500 hover:text-surface-900"
              }`}
          >
            <UsersIcon className={`h-4 w-4 sm:h-4.5 sm:w-4.5 ${viewMode === "group" ? "text-purple-600" : "text-surface-400"}`} />
            Group
            <span className={`ml-1.5 px-2 py-0.5 text-[9px] sm:text-[10px] font-black rounded-md ${viewMode === "group"
              ? "bg-purple-50 text-purple-700"
              : "bg-surface-200 text-surface-600"
              }`}>
              {groupCount}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 px-4 py-2 bg-surface-50 rounded-xl border border-surface-100 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
          <span className="text-xs font-bold text-surface-600 uppercase tracking-tighter">
            {viewMode === "individual"
              ? `${individualCount} Active Records`
              : `${groupCount} Active Records`
            }
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by ref, name, country, or agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-surface-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-400 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 text-sm border border-surface-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-700 font-medium cursor-pointer transition-all min-w-[160px]"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="quoted">Quoted</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Table */}
      <div className="card">
        {viewMode === "individual" ? (
          <IndividualInquiriesTable inquiries={filteredIndividual} onDelete={handleDelete} />
        ) : (
          <GroupInquiriesTable inquiries={filteredGroup} onDelete={handleDelete} />
        )}
      </div>

      {showPinModal && (
        <AdminPinModal
            isOpen={showPinModal}
            title="Authorize Deletion"
            onAuthorized={handlePinAuthorized}
            onClose={() => {
                setShowPinModal(false);
                setPendingDelete(null);
            }}
        />
      )}
    </div>
  );
}

function IndividualInquiriesTable({ inquiries, onDelete }: { inquiries: IndividualInquiry[], onDelete: (id: string, type: "individual" | "group") => void }) {
  if (inquiries.length === 0) {
    return (
      <div className="p-20 text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-surface-50 flex items-center justify-center border border-surface-100 shadow-sm group hover:scale-105 transition-transform duration-500">
          <UserIcon className="w-12 h-12 text-surface-300 group-hover:text-primary-500 transition-colors" />
        </div>
        <h3 className="text-2xl font-bold text-surface-900 mb-2">
          No individual records
        </h3>
        <p className="text-surface-500 max-w-xs mx-auto text-sm leading-relaxed">
          Your individual inquiry channel is waiting for data. Share your form link to start receiving submissions.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-surface-100 bg-surface-50/50">
            <th className="px-6 py-4 text-left text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] bg-white whitespace-nowrap">
              Inquiry Ref
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] bg-white whitespace-nowrap">
              Agent
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] bg-white whitespace-nowrap">
              Region
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] bg-white whitespace-nowrap">
              Travel Window
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] bg-white whitespace-nowrap">
              Group Size
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] bg-white whitespace-nowrap">
              Inventory
            </th>
            <th className="px-6 py-4 text-right text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] bg-white whitespace-nowrap">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100 bg-white">
          {inquiries.map((inquiry) => {
            const totalPax = (inquiry.no_of_pax || 0) + (inquiry.no_of_children || 0);
            return (
              <tr
                key={inquiry.id}
                className="hover:bg-surface-50 transition-colors"
              >
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <Link
                      href={`/inquiries/${inquiry.id}`}
                      className="text-sm font-bold text-slate-900 hover:text-primary-600 transition-colors"
                    >
                      {inquiry.inquiry_number}
                    </Link>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {format(new Date(inquiry.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  {inquiry.agent_name ? (
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">
                        {inquiry.agent_name}
                      </span>
                      {inquiry.agent_company && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {inquiry.agent_company}
                        </span>
                      )}
                      <span className="text-xs font-medium text-primary-600 mt-0.5">
                        {inquiry.agent_email}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">
                        {inquiry.first_name ? `${inquiry.first_name} ${inquiry.last_name}` : "Direct Booking"}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {inquiry.client_email}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-5">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-100">
                    {inquiry.country || "GLOBAL"}
                  </span>
                </td>
                <td className="px-6 py-5">
                  {inquiry.arriving_date ? (
                    <div className="flex flex-col">
                      <div className="text-sm font-bold text-slate-700">
                        {format(new Date(inquiry.arriving_date), "MMM d")} - {inquiry.departure_date && format(new Date(inquiry.departure_date), "MMM d")}
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase mt-0.5">
                        {inquiry.no_of_nights} NIGHTS
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-300">SCHEDULE PENDING</span>
                  )}
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-800">{totalPax}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Pax</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-1 max-w-[120px]">
                    {inquiry.rooms_dbl > 0 && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black">{inquiry.rooms_dbl}D</span>}
                    {inquiry.rooms_sgl > 0 && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black">{inquiry.rooms_sgl}S</span>}
                    {inquiry.rooms_tpl > 0 && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black">{inquiry.rooms_tpl}T</span>}
                    {inquiry.rooms_qtpl > 0 && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black">{inquiry.rooms_qtpl}Q</span>}
                    {!inquiry.rooms_dbl && !inquiry.rooms_sgl && !inquiry.rooms_tpl && !inquiry.rooms_qtpl && <span className="text-slate-300 font-black">-</span>}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center justify-end gap-3">
                    <StatusBadge status={getEffectiveStatus(inquiry.status, inquiry.arriving_date, inquiry.departure_date) as InquiryStatus} />
                    <Link href={`/inquiries/${inquiry.id}`}>
                      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors group">
                        <ArrowRightIcon className="w-4 h-4 text-slate-400 group-hover:text-primary-600" />
                      </button>
                    </Link>
                    <button
                      onClick={() => onDelete(inquiry.id, "individual")}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                      title="Delete Inquiry"
                    >
                      <TrashIcon className="w-4 h-4 text-slate-400 group-hover:text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GroupInquiriesTable({ inquiries, onDelete }: { inquiries: GroupInquiry[], onDelete: (id: string, type: "individual" | "group") => void }) {
  if (inquiries.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
          <UsersIcon className="w-8 h-8 text-purple-400" />
        </div>
        <h3 className="text-lg font-medium text-surface-900 mb-1">
          No group inquiries yet
        </h3>
        <p className="text-surface-500">
          Group inquiries will appear here when clients submit group booking requests
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-surface-100 bg-surface-50/50">
            <th className="px-6 py-4 text-left text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] bg-white whitespace-nowrap">
              Group Ref
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] bg-white whitespace-nowrap">
              Agent
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] bg-white whitespace-nowrap">
              Region
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] bg-white whitespace-nowrap">
              Travel Window
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] bg-white whitespace-nowrap">
              Pax Count
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] bg-white whitespace-nowrap">
              Inventory
            </th>
            <th className="px-6 py-4 text-right text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] bg-white whitespace-nowrap">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100 bg-white">
          {inquiries.map((inquiry) => {
            const totalPax = (inquiry.no_of_adults || 0) + (inquiry.no_of_children || 0);
            return (
              <tr
                key={inquiry.id}
                className="hover:bg-surface-50 transition-colors"
              >
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-black rounded border border-purple-100 uppercase tracking-tighter">Group</span>
                      <Link
                        href={`/group-inquiries/${inquiry.id}`}
                        className="text-sm font-bold text-slate-900 hover:text-primary-600 transition-colors"
                      >
                        {inquiry.inquiry_number}
                      </Link>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {format(new Date(inquiry.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  {inquiry.agent_name ? (
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">
                        {inquiry.agent_name}
                      </span>
                      {inquiry.agent_company && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {inquiry.agent_company}
                        </span>
                      )}
                      <span className="text-xs font-medium text-primary-600 mt-0.5">
                        {inquiry.agent_email}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">
                        {inquiry.head_first_name ? `${inquiry.head_first_name} ${inquiry.head_last_name}` : "Direct Booking"}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {inquiry.client_email}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-5">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-100">
                    {inquiry.country || "GLOBAL"}
                  </span>
                </td>
                <td className="px-6 py-5">
                  {inquiry.arriving_date ? (
                    <div className="flex flex-col">
                      <div className="text-sm font-bold text-slate-700">
                        {format(new Date(inquiry.arriving_date), "MMM d")} - {inquiry.departure_date && format(new Date(inquiry.departure_date), "MMM d")}
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase mt-0.5">
                        {inquiry.no_of_nights} NIGHTS
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-300">SCHEDULE PENDING</span>
                  )}
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-800">{totalPax}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Pax</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      {inquiry.no_of_adults} Adult · {inquiry.no_of_children || 0} Child
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-1 max-w-[120px]">
                    {inquiry.rooms_dbl > 0 && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black">{inquiry.rooms_dbl}D</span>}
                    {inquiry.rooms_sgl > 0 && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black">{inquiry.rooms_sgl}S</span>}
                    {inquiry.rooms_tpl > 0 && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black">{inquiry.rooms_tpl}T</span>}
                    {inquiry.rooms_qtpl > 0 && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black">{inquiry.rooms_qtpl}Q</span>}
                    {!inquiry.rooms_dbl && !inquiry.rooms_sgl && !inquiry.rooms_tpl && !inquiry.rooms_qtpl && <span className="text-slate-300 font-black">-</span>}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center justify-end gap-3">
                    <StatusBadge status={getEffectiveStatus(inquiry.status, inquiry.arriving_date, inquiry.departure_date) as InquiryStatus} />
                    <Link href={`/group-inquiries/${inquiry.id}`}>
                      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors group">
                        <ArrowRightIcon className="w-4 h-4 text-slate-400 group-hover:text-primary-600" />
                      </button>
                    </Link>
                    <button
                      onClick={() => onDelete(inquiry.id, "group")}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                      title="Delete Inquiry"
                    >
                      <TrashIcon className="w-4 h-4 text-slate-400 group-hover:text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
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



function TrashIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" 
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}
