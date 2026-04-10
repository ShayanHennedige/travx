"use client";

import { useState, useMemo } from "react";
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

export function VouchersList({ vouchers: initialVouchers }: VouchersListProps) {
  const router = useRouter();
  const [vouchers, setVouchers] = useState(initialVouchers);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [completingGroupId, setCompletingGroupId] = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);
  const [downloadingRoomingList, setDownloadingRoomingList] = useState<string | null>(null);

  const handleCompleteAll = async (groupKey: string, voucherIds: string[]) => {
    if (!confirm("Are you sure you want to mark all vouchers in this group as COMPLETED?")) {
      return;
    }

    setCompletingGroupId(groupKey);
    try {
      const response = await fetch("/api/vouchers/status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: voucherIds,
          status: "completed",
        }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      // Update local state
      setVouchers((prev) =>
        prev.map((v) =>
          voucherIds.includes(v.id) ? { ...v, status: "completed" } : v
        )
      );

      router.refresh();
    } catch (error) {
      console.error("Complete all error:", error);
      alert("Failed to update voucher statuses");
    } finally {
      setCompletingGroupId(null);
    }
  };

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((voucher) => {
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
  }, [vouchers, searchQuery]);

  // Group vouchers by client/inquiry
  const groupedVouchers = useMemo(() => {
    const groups: Record<string, {
      clientName: string;
      inquiryNumber: string;
      type: "individual" | "group";
      inquiryId?: string;
      groupInquiryId?: string;
      vouchers: Voucher[];
      overallStatus: string;
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
          overallStatus: "new",
        };
      }
      groups[key].vouchers.push(voucher);
    });

    Object.keys(groups).forEach((key) => {
      const group = groups[key];
      const statuses = group.vouchers.map(v => v.status).filter(Boolean);

      if (statuses.length > 0 && statuses.every(s => s === "completed")) {
        group.overallStatus = "completed";
      } else if (statuses.some(s => s === "in_progress")) {
        group.overallStatus = "in_progress";
      } else {
        group.overallStatus = "new";
      }
    });

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

      // Fallback for filename if voucherNumber is missing or "null"
      const safeVoucherNumber = (voucherNumber && voucherNumber !== "null")
        ? voucherNumber
        : `V-${id.slice(0, 8).toUpperCase()}`;

      a.download = `${safeVoucherNumber}.pdf`;
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
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-700">
        <div className="w-24 h-24 rounded-[2rem] bg-surface-50 flex items-center justify-center border border-surface-100 shadow-sm mb-6">
          <svg className="w-10 h-10 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-surface-900 mb-2">
          No vouchers yet
        </h3>
        <p className="text-surface-500 mb-8 max-w-sm text-center">
          Vouchers are automatically generated when you finalize confirmed itineraries.
        </p>
        <Link href="/itineraries">
          <Button size="lg" className="rounded-xl shadow-lg shadow-primary-500/20">View Itineraries</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Glass Filters */}
      <div className="sticky top-4 z-40 bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl shadow-slate-200/40 rounded-[2rem] p-2">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div className="flex-1 relative group">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors"
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
              className="w-full pl-12 pr-4 py-3 bg-slate-50/50 hover:bg-white border-0 rounded-[1.5rem] focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-[1.5rem]">
            <button
              onClick={expandAll}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 hover:bg-white rounded-2xl transition-all shadow-sm shadow-transparent hover:shadow-md"
            >
              Expand All
            </button>
            <div className="w-px h-6 bg-slate-200" />
            <button
              onClick={collapseAll}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 hover:bg-white rounded-2xl transition-all shadow-sm shadow-transparent hover:shadow-md"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      <div className="px-1 text-xs font-bold text-slate-400 uppercase tracking-widest pl-4">
        Showing {filteredVouchers.length} vouchers across {groupedVouchers.length} active group{groupedVouchers.length !== 1 ? "s" : ""}
      </div>

      {/* Grouped Vouchers */}
      <div className="space-y-6">
        {groupedVouchers.map(([key, group], index) => {
          const isExpanded = expandedGroups.has(key);
          const totalVouchers = group.vouchers.length;
          const isCompleting = completingGroupId === key;

          return (
            <div
              key={key}
              className={`bg-white rounded-[2.5rem] overflow-hidden border transition-all duration-500 ${isExpanded
                ? "shadow-2xl shadow-slate-200/50 border-primary-100 ring-4 ring-primary-50/50"
                : "shadow-sm border-slate-100 hover:shadow-lg hover:border-slate-200"
                }`}
            >
              {/* Group Header */}
              <div
                onClick={() => toggleGroup(key)}
                className="cursor-pointer group relative"
              >
                <div className={`absolute inset-0 transition-opacity duration-300 ${isExpanded ? "bg-slate-50/50 opacity-100" : "opacity-0 group-hover:opacity-100 bg-slate-50/30"}`} />

                <div className="relative px-4 sm:px-8 py-4 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                  {/* Left Side: Client Info */}
                  <div className="flex items-center gap-6 flex-1">
                    <div className="relative">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black shadow-inner border border-white/20 ${group.type === "group"
                        ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-purple-200"
                        : "bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-blue-200"
                        }`}>
                        {group.clientName.charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] items-center shadow-sm ${isExpanded ? "bg-slate-900 text-white rotate-180" : "bg-white text-slate-400"
                        } transition-all duration-300`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-slate-900">{group.clientName}</h3>
                        <Badge variant={group.type === "group" ? "purple" : "blue"} className="shadow-sm">
                          {group.type === "group" ? "Group" : "Individual"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{group.inquiryNumber}</span>
                        <span>•</span>
                        <span className="text-slate-700 font-bold">{totalVouchers}</span> Voucher{totalVouchers !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Status & Actions */}
                  <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-end">
                    {group.overallStatus !== "completed" ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteAll(key, group.vouchers.map(v => v.id));
                        }}
                        disabled={isCompleting}
                        className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-full shadow-lg shadow-green-200 hover:shadow-green-300 transition-all z-10"
                      >
                        {isCompleting ? (
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        )}
                        Complete All
                      </button>
                    ) : (
                      <div className={`hidden md:flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${group.overallStatus === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        group.overallStatus === "in_progress" ? "bg-blue-50 text-blue-700 border-blue-100" :
                          "bg-amber-50 text-amber-700 border-amber-100"
                        }`}>
                        {group.overallStatus.replace("_", " ")}
                      </div>
                    )}

                    <div className="flex items-center gap-2 p-1 bg-white rounded-xl border border-slate-100 shadow-sm">
                      {group.type === "group" && group.groupInquiryId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadRoomingList(group.groupInquiryId!, group.inquiryNumber)
                          }}
                          disabled={downloadingRoomingList === group.groupInquiryId}
                          className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Download Rooming List"
                        >
                          {downloadingRoomingList === group.groupInquiryId ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          )}
                        </button>
                      )}

                      <Link
                        href={group.type === "group" ? `/group-inquiries/${group.groupInquiryId}` : `/inquiries/${group.inquiryId}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="View Inquiry">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collapsible Content */}
              <div
                className={`transition-all duration-500 ease-in-out ${isExpanded ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0"
                  }`}
              >
                <div className="px-8 pb-8 pt-2 grid grid-cols-1 gap-4">
                  {group.vouchers.map((voucher) => (
                    <div key={voucher.id} className="group/card relative bg-slate-50 hover:bg-white p-6 rounded-[1.5rem] border border-slate-100 hover:border-primary-100 hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

                        {/* Voucher Info */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover/card:scale-110 transition-transform duration-300">
                            <svg className="w-6 h-6 text-slate-400 group-hover/card:text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="text-base font-bold text-slate-900 group-hover/card:text-primary-700 transition-colors">{voucher.hotel_name}</h4>
                              {voucher.is_amendment && (
                                <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider border border-orange-200">
                                  AMD {voucher.amendment_number}
                                </span>
                              )}
                              {voucher.status === "completed" && (
                                <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider border border-green-200">
                                  COMPLETED
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 font-medium">
                              <span className="bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                                {(!voucher.voucher_number || voucher.voucher_number === "null")
                                  ? `V-${voucher.id.slice(0, 8).toUpperCase()}`
                                  : voucher.voucher_number}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                {format(new Date(voucher.check_in_date), "MMM d")} - {format(new Date(voucher.check_out_date), "MMM d")}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              <span>{voucher.no_of_nights} Night{voucher.no_of_nights > 1 ? "s" : ""}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              <span>{voucher.no_of_rooms} {voucher.room_type}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              <span>{voucher.meal_plan}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => handleDownloadPDF(voucher.id, voucher.voucher_number)}
                            disabled={downloadingPDF === voucher.id}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-primary-200 hover:text-primary-700 hover:shadow-md rounded-xl transition-all"
                          >
                            {downloadingPDF === voucher.id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            )}
                            PDF
                          </button>
                          <Link href={`/vouchers/${voucher.id}`}>
                            <button className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-primary-200 hover:text-primary-700 hover:shadow-md rounded-xl transition-all">
                              View
                            </button>
                          </Link>
                          <button
                            onClick={() => setDeleteConfirm(voucher.id)}
                            className="p-2 text-slate-400 hover:text-accent-500 hover:bg-accent-500/10 rounded-xl transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* No results */}
      {filteredVouchers.length === 0 && searchQuery && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No results found</h3>
          <p className="text-slate-500 mb-6">We couldn't find any vouchers matching "{searchQuery}"</p>
          <Button variant="secondary" onClick={() => setSearchQuery("")} className="rounded-xl">Clear search</Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-accent-500/10 flex items-center justify-center border border-accent-500/20">
                <svg className="w-6 h-6 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Delete Voucher</h3>
                <p className="text-sm text-slate-500 font-medium">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Are you sure you want to delete this voucher? This will remove it from the system permanently.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)} disabled={isDeleting} className="rounded-xl hover:bg-slate-50 text-slate-600">
                Cancel
              </Button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isDeleting}
                className="px-6 py-2.5 bg-accent-600 hover:bg-accent-700 text-black rounded-xl font-bold text-sm transition-all shadow-lg shadow-accent-500/20 disabled:opacity-50 disabled:shadow-none"
              >
                {isDeleting ? "Deleting..." : "Delete Voucher"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


