"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { format } from "date-fns";
import { Button, Badge } from "@/components/ui";
import { useRouter } from "next/navigation";

interface Voucher {
  id: string;
  voucher_number: string;
  hotel_name: string;
  guest_name: string;
  check_in_date: string;
  check_out_date: string;
  no_of_nights: number;
  no_of_rooms: number;
  room_type: string;
  meal_plan: string;
  status: string;
  is_amendment: boolean;
  amendment_number: number;
  created_at: string;
  inquiry_number: string;
  client_name: string;
  type: "individual" | "group";
  inquiry_id?: string;
  group_inquiry_id?: string;
}

interface VouchersListProps {
  vouchers: Voucher[];
}

type StatusFilter = "all" | "draft" | "confirmed" | "amended" | "cancelled";

const statusColors: Record<string, string> = {
  draft: "bg-amber-900/50 text-amber-300",
  confirmed: "bg-green-900/50 text-green-300",
  amended: "bg-primary-900/50 text-primary-300",
  cancelled: "bg-red-900/50 text-red-300",
};

export function VouchersList({ vouchers: initialVouchers }: VouchersListProps) {
  const router = useRouter();
  const [vouchers, setVouchers] = useState(initialVouchers);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);
  const [downloadingRoomingList, setDownloadingRoomingList] = useState<string | null>(null);

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((voucher) => {
      // Status filter
      if (statusFilter !== "all" && voucher.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          voucher.voucher_number.toLowerCase().includes(query) ||
          voucher.hotel_name.toLowerCase().includes(query) ||
          voucher.guest_name.toLowerCase().includes(query) ||
          voucher.inquiry_number.toLowerCase().includes(query) ||
          voucher.client_name.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [vouchers, searchQuery, statusFilter]);

  // Group vouchers by client/inquiry
  const groupedVouchers = useMemo(() => {
    const groups: Record<string, { 
      clientName: string; 
      inquiryNumber: string; 
      type: "individual" | "group";
      inquiryId?: string;
      groupInquiryId?: string;
      vouchers: Voucher[];
      overallStatus: string; // Overall status for the voucher group
    }> = {};

    filteredVouchers.forEach((voucher) => {
      const key = voucher.inquiry_number || "unlinked";
      if (!groups[key]) {
        groups[key] = {
          clientName: voucher.client_name,
          inquiryNumber: voucher.inquiry_number,
          type: voucher.type,
          inquiryId: voucher.inquiry_id,
          groupInquiryId: voucher.group_inquiry_id,
          vouchers: [],
          overallStatus: "new", // Default status
        };
      }
      groups[key].vouchers.push(voucher);
    });

    // Calculate overall status for each group
    Object.keys(groups).forEach((key) => {
      const group = groups[key];
      const statuses = group.vouchers.map(v => v.status).filter(Boolean);
      
      // If all vouchers are completed, group is completed
      if (statuses.length > 0 && statuses.every(s => s === "completed")) {
        group.overallStatus = "completed";
      } 
      // If any voucher is in progress, group is in progress
      else if (statuses.some(s => s === "in_progress")) {
        group.overallStatus = "in_progress";
      }
      // Otherwise, new
      else {
        group.overallStatus = "new";
      }
    });

    // Sort groups by most recent voucher
    return Object.entries(groups).sort(([, a], [, b]) => {
      const latestA = Math.max(...a.vouchers.map((v) => new Date(v.created_at).getTime()));
      const latestB = Math.max(...b.vouchers.map((v) => new Date(v.created_at).getTime()));
      return latestB - latestA;
    });
  }, [filteredVouchers]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(groupedVouchers.map(([key]) => key)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/vouchers/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      setVouchers((prev) => prev.filter((v) => v.id !== id));
      setDeleteConfirm(null);
      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete voucher");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadPDF = async (id: string, voucherNumber: string) => {
    setDownloadingPDF(id);
    try {
      const response = await fetch(`/api/vouchers/${id}/pdf`);
      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${voucherNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download error:", error);
      alert("Failed to download PDF");
    } finally {
      setDownloadingPDF(null);
    }
  };

  const handleDownloadRoomingList = async (groupInquiryId: string, inquiryNumber: string) => {
    setDownloadingRoomingList(groupInquiryId);
    try {
      const response = await fetch(`/api/rooming-list/${groupInquiryId}/pdf`);
      if (!response.ok) throw new Error("Failed to generate rooming list PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RoomingList-${inquiryNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Rooming list download error:", error);
      alert("Failed to download rooming list");
    } finally {
      setDownloadingRoomingList(null);
    }
  };

  if (vouchers.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-700 light:bg-surface-200 flex items-center justify-center">
          <svg className="w-8 h-8 text-surface-500 light:text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-surface-100 light:text-surface-900 mb-1">
          No vouchers yet
        </h3>
        <p className="text-surface-400 light:text-surface-500 mb-6">
          Generate vouchers from confirmed itineraries to see them here
        </p>
        <Link href="/itineraries">
          <Button>View Itineraries</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by voucher #, hotel, guest, or inquiry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-surface-600 light:border-surface-300 bg-surface-800 light:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm text-surface-100 light:text-surface-900 placeholder:text-surface-500 light:placeholder:text-surface-400"
              />
            </div>
          </div>

          {/* Expand/Collapse All */}
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 text-sm text-surface-400 light:text-surface-600 hover:text-surface-100 light:hover:text-surface-900 hover:bg-surface-700 light:hover:bg-surface-200 rounded-md transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-sm text-surface-400 light:text-surface-600 hover:text-surface-100 light:hover:text-surface-900 hover:bg-surface-700 light:hover:bg-surface-200 rounded-md transition-colors"
            >
              Collapse All
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 rounded-lg border border-surface-600 light:border-surface-300 bg-surface-800 light:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm text-surface-100 light:text-surface-900"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="amended">Amended</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="mt-3 text-sm text-surface-400 light:text-surface-500">
          Showing {filteredVouchers.length} of {vouchers.length} vouchers in {groupedVouchers.length} group{groupedVouchers.length !== 1 ? "s" : ""}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      </div>

      {/* Grouped Vouchers with Collapsible Sections */}
      <div className="space-y-4">
        {groupedVouchers.map(([key, group], index) => {
          const isExpanded = expandedGroups.has(key);
          
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="card overflow-hidden"
            >
              {/* Collapsible Group Header */}
              <div className="bg-surface-700 light:bg-surface-100 px-6 py-4 border-b border-surface-600 light:border-surface-200">
                <div className="flex items-center justify-between">
                  {/* Clickable area for expand/collapse */}
                  <div 
                    onClick={() => toggleGroup(key)}
                    className="flex items-center gap-4 cursor-pointer flex-1 hover:opacity-80 transition-opacity"
                  >
                    {/* Expand/Collapse Arrow */}
                    <div className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                      <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
                      group.type === "group" ? "bg-primary-900/50 light:bg-primary-100 text-primary-300 light:text-primary-800" : "bg-primary-800/80 light:bg-primary-100 text-primary-300 light:text-primary-700"
                    }`}>
                      {group.clientName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    
                    {/* Client Info */}
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-surface-100 light:text-surface-900">{group.clientName}</h3>
                        <Badge variant={group.type === "group" ? "purple" : "blue"}>
                          {group.type === "group" ? "Group" : "Individual"}
                        </Badge>
                      </div>
                      <p className="text-sm text-surface-400 light:text-surface-500">
                        Ref: <span className="font-medium text-primary-400">{group.inquiryNumber}</span>
                        <span className="mx-2">•</span>
                        <span className="font-medium">{group.vouchers.length}</span> voucher{group.vouchers.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status and Action Buttons */}
                  <div className="flex items-center gap-3">
                    {/* Status Selector for Complete Voucher Group */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-surface-300 light:text-surface-600">Status:</span>
                      <VoucherGroupStatusSelector
                        inquiryId={group.inquiryId}
                        groupInquiryId={group.groupInquiryId}
                        currentStatus={group.overallStatus}
                      />
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Rooming List Button - Only for Group */}
                      {group.type === "group" && group.groupInquiryId && (
                        <button
                          onClick={() => handleDownloadRoomingList(group.groupInquiryId!, group.inquiryNumber)}
                          disabled={downloadingRoomingList === group.groupInquiryId}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-300 light:text-green-800 bg-green-900/40 light:bg-green-100 hover:bg-green-800/50 light:hover:bg-green-200 rounded-lg border border-green-700/50 light:border-green-200 transition-colors disabled:opacity-50"
                          title="Download Rooming List"
                        >
                          {downloadingRoomingList === group.groupInquiryId ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          )}
                          Rooming List
                        </button>
                      )}
                      
                      {/* View Inquiry Button */}
                      <Link href={group.type === "group" ? `/group-inquiries/${group.groupInquiryId}` : `/inquiries/${group.inquiryId}`}>
                        <Button variant="secondary" size="sm">
                          View Inquiry
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collapsible Vouchers Content - nested rows with distinct background */}
              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="divide-y divide-surface-600 light:divide-surface-200 bg-surface-800/50 light:bg-surface-50">
                  {group.vouchers.map((voucher) => (
                    <div key={voucher.id} className="p-4 hover:bg-surface-700/70 light:hover:bg-surface-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            {voucher.is_amendment && (
                              <Badge variant="orange">Amendment #{voucher.amendment_number}</Badge>
                            )}
                            <Link href={`/vouchers/${voucher.id}`} className="group">
                              <h4 className="font-medium text-surface-100 light:text-surface-900 group-hover:text-primary-400 light:group-hover:text-primary-600 transition-colors">
                                {voucher.hotel_name}
                              </h4>
                            </Link>
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 text-sm text-surface-400 light:text-surface-500">
                            <span className="font-medium text-surface-300 light:text-surface-700">{voucher.voucher_number}</span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {format(new Date(voucher.check_in_date), "MMM d")} - {format(new Date(voucher.check_out_date), "MMM d")}
                            </span>
                            <span>{voucher.no_of_nights} night{voucher.no_of_nights !== 1 ? "s" : ""}</span>
                            <span>{voucher.no_of_rooms} {voucher.room_type}</span>
                            <span>{voucher.meal_plan}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleDownloadPDF(voucher.id, voucher.voucher_number)}
                            disabled={downloadingPDF === voucher.id}
                            className="p-2 text-surface-400 hover:text-primary-400 hover:bg-primary-900/30 rounded-lg transition-colors disabled:opacity-50"
                            title="Download PDF"
                          >
                            {downloadingPDF === voucher.id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            )}
                          </button>
                          <Link href={`/vouchers/${voucher.id}`}>
                            <Button variant="secondary" size="sm">
                              View
                            </Button>
                          </Link>
                          <button
                            onClick={() => setDeleteConfirm(voucher.id)}
                            className="p-2 text-surface-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* No results */}
      {filteredVouchers.length === 0 && searchQuery && (
        <div className="card p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-surface-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-lg font-medium text-surface-100 light:text-surface-900 mb-1">No results found</h3>
          <p className="text-surface-400 light:text-surface-500">Try adjusting your search query</p>
          <button
            onClick={() => setSearchQuery("")}
            className="mt-4 text-primary-400 hover:text-primary-300 font-medium text-sm"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="rounded-xl shadow-xl max-w-md w-full p-6" style={{ backgroundColor: "var(--bg-surface)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-surface-100 light:text-surface-900">Delete Voucher</h3>
                <p className="text-sm text-surface-400 light:text-surface-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-surface-400 light:text-surface-500 mb-6">
              Are you sure you want to delete this voucher?
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface VoucherGroupStatusSelectorProps {
  inquiryId?: string;
  groupInquiryId?: string;
  currentStatus: string;
}

function VoucherGroupStatusSelector({ inquiryId, groupInquiryId, currentStatus }: VoucherGroupStatusSelectorProps) {
  const router = useRouter();
  
  // Map existing statuses to component statuses
  const getComponentStatus = (status: string): string => {
    if (["new", "in_progress", "completed"].includes(status)) {
      return status;
    }
    if (status === "draft") return "new";
    if (status === "confirmed") return "in_progress";
    if (status === "amended") return "in_progress";
    if (status === "cancelled") return "completed";
    return "new";
  };

  const [status, setStatus] = useState<string>(getComponentStatus(currentStatus));
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    const currentComponentStatus = getComponentStatus(currentStatus);
    if (newStatus === currentComponentStatus) return;
    
    setStatus(newStatus);
    setIsUpdating(true);
    
    try {
      // Update all vouchers for this inquiry/group
      const response = await fetch(`/api/vouchers/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: newStatus,
          inquiry_id: inquiryId,
          group_inquiry_id: groupInquiryId,
        }),
      });

      if (!response.ok) throw new Error("Failed to update status");
      
      router.refresh();
    } catch (error) {
      console.error("Error updating status:", error);
      setStatus(getComponentStatus(currentStatus)); // Revert on error
      alert("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const statusOptions = [
    { value: "new", label: "New" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
  ];

  const getStatusColor = (s: string) => {
    if (s === "completed") return "bg-green-900/50 light:bg-green-100 text-green-300 light:text-green-800 border border-green-700/50 light:border-green-200";
    if (s === "in_progress") return "bg-primary-900/50 light:bg-primary-100 text-primary-300 light:text-primary-800 border border-primary-700/50 light:border-primary-200";
    return "bg-amber-900/50 light:bg-amber-100 text-amber-300 light:text-amber-800 border border-amber-700/50 light:border-amber-200";
  };

  const statusColor = getStatusColor(status);

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
        {status === "completed" ? "✓ Completed" : status === "in_progress" ? "⟳ In Progress" : "○ New"}
      </span>
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
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
