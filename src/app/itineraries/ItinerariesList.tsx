"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Button, Badge } from "@/components/ui";
import { AdminPinModal } from "@/components/AdminPinModal";

type ComponentStatus = "new" | "in_progress" | "completed";

interface ItineraryContent {
  title: string;
  summary: string;
  days: { day: number }[];
  total_driving_hours: string;
}

interface InquiryInfo {
  id: string;
  inquiry_number: string;
  first_name: string;
  last_name: string;
  client_email: string;
  arriving_date: string;
  departure_date: string;
  no_of_nights: number;
  total_pax: number;
}

interface Itinerary {
  id: string;
  content: ItineraryContent;
  created_at: string;
  updated_at: string;
  inquiry_id: string | null;
  group_inquiry_id: string | null;
  status: "new" | "in_progress" | "completed" | null;
  type: "individual" | "group";
  inquiry: InquiryInfo | null;
}

interface ItinerariesListProps {
  itineraries: Itinerary[];
}

type ViewMode = "grouped" | "list";
type SortBy = "newest" | "oldest" | "client";

export function ItinerariesList({ itineraries: initialItineraries }: ItinerariesListProps) {
  const router = useRouter();
  const [itineraries, setItineraries] = useState(initialItineraries);
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Filter and sort itineraries
  const filteredItineraries = useMemo(() => {
    let filtered = itineraries.filter((itinerary) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const clientName = itinerary.inquiry
        ? `${itinerary.inquiry.first_name || ''} ${itinerary.inquiry.last_name || ''}`.toLowerCase()
        : "";
      const inquiryNumber = itinerary.inquiry?.inquiry_number?.toLowerCase() || "";
      const title = (itinerary.content?.title || "").toLowerCase();

      return (
        clientName.includes(query) ||
        inquiryNumber.includes(query) ||
        title.includes(query)
      );
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "client":
          const nameA = a.inquiry ? `${a.inquiry.first_name || ''} ${a.inquiry.last_name || ''}` : "";
          const nameB = b.inquiry ? `${b.inquiry.first_name || ''} ${b.inquiry.last_name || ''}` : "";
          return nameA.localeCompare(nameB);
        default:
          return 0;
      }
    });

    return filtered;
  }, [itineraries, searchQuery, sortBy]);

  // Group itineraries by inquiry
  const groupedItineraries = useMemo(() => {
    const groups: Record<string, { inquiry: InquiryInfo | null; type: "individual" | "group"; itineraries: Itinerary[] }> = {};

    filteredItineraries.forEach((itinerary) => {
      const key = itinerary.inquiry_id || itinerary.group_inquiry_id || "unlinked";
      if (!groups[key]) {
        groups[key] = {
          inquiry: itinerary.inquiry,
          type: itinerary.type,
          itineraries: [],
        };
      }
      groups[key].itineraries.push(itinerary);
    });

    return Object.entries(groups).sort(([, a], [, b]) => {
      // Sort groups by most recent itinerary
      const latestA = Math.max(...a.itineraries.map((i) => new Date(i.created_at).getTime()));
      const latestB = Math.max(...b.itineraries.map((i) => new Date(i.created_at).getTime()));
      return latestB - latestA;
    });
  }, [filteredItineraries]);

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
    setExpandedGroups(new Set(groupedItineraries.map(([key]) => key)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/itinerary/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      setItineraries((prev) => prev.filter((i) => i.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete itinerary");
    } finally {
      setIsDeleting(false);
    }
  };

  if (itineraries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-700">
        <div className="w-24 h-24 rounded-[2rem] bg-surface-50 flex items-center justify-center border border-surface-100 shadow-sm mb-6">
          <svg className="w-10 h-10 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-surface-900 mb-2">
          No itineraries yet
        </h3>
        <p className="text-surface-500 mb-8 max-w-sm text-center">
          Generate itineraries from inquiry details to see them here
        </p>
        <Link href="/inquiries">
          <Button size="lg" className="rounded-xl shadow-lg shadow-primary-500/20">View Inquiries</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Glass Filters */}
      <div className="sticky top-0 lg:top-4 z-40 bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl shadow-slate-200/40 rounded-2xl md:rounded-[2rem] p-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            {/* Search */}
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
                placeholder="Search by client, inquiry #, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50/50 hover:bg-white border-0 rounded-[1.5rem] focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-[1.5rem] flex-1 sm:flex-none">
                <button
                  onClick={() => setViewMode("grouped")}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 flex items-center justify-center gap-2 rounded-2xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${viewMode === "grouped"
                    ? "bg-white text-slate-900 shadow-md transform scale-105"
                    : "text-slate-500 hover:bg-white/50 hover:text-slate-700"
                    }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Grouped
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 flex items-center justify-center gap-2 rounded-2xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${viewMode === "list"
                    ? "bg-white text-slate-900 shadow-md transform scale-105"
                    : "text-slate-500 hover:bg-white/50 hover:text-slate-700"
                    }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  List
                </button>
              </div>

              {/* Sort */}
              <div className="relative flex-1 sm:flex-none">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="w-full sm:w-auto appearance-none pl-4 pr-10 py-2.5 bg-slate-50/50 hover:bg-white border-0 rounded-[1.5rem] focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all text-xs sm:text-sm font-bold text-slate-700 cursor-pointer outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="client">By Client</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-1 flex justify-between items-center pl-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Showing {filteredItineraries.length} itineraries across {groupedItineraries.length} active client{groupedItineraries.length !== 1 ? "s" : ""}
          </div>
          {viewMode === "grouped" && (
            <div className="flex gap-4">
              <button onClick={expandAll} className="text-xs font-bold text-primary-600 hover:text-primary-700 uppercase tracking-wider transition-colors">Expand All</button>
              <button onClick={collapseAll} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider transition-colors">Collapse All</button>
            </div>
          )}
        </div>
      </div>

      {/* Grouped View */}
      {viewMode === "grouped" && (
        <div className="space-y-6">
          {groupedItineraries.map(([key, group]) => {
            const isExpanded = expandedGroups.has(key);

            return (
              <div
                key={key}
                className={`bg-white rounded-2xl md:rounded-[2.5rem] overflow-hidden border transition-all duration-500 ${isExpanded
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

                  <div className="relative px-4 sm:px-8 py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                    {/* Left Side: Client Info */}
                    <div className="flex items-center gap-4 sm:gap-6 flex-1">
                      <div className="relative flex-shrink-0">
                        {group.inquiry ? (
                          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-base sm:text-lg font-black shadow-inner border border-white/20 ${group.type === "group"
                            ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-purple-200"
                            : "bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-blue-200"
                            }`}>
                            {(group.inquiry.first_name || 'G').charAt(0)}{(group.inquiry.last_name || '').charAt(0) || ''}
                          </div>
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-base sm:text-lg font-black shadow-inner border border-white/20 bg-slate-100 text-slate-400">
                            ?
                          </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] shadow-sm ${isExpanded ? "bg-slate-900 text-white rotate-180" : "bg-white text-slate-400"
                          } transition-all duration-300`}>
                          <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 sm:gap-3 mb-1">
                          {group.inquiry ? (
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                              {group.inquiry.first_name || 'Guest'} {group.inquiry.last_name || ''}
                            </h3>
                          ) : (
                            <h3 className="text-base sm:text-lg font-bold text-slate-900">Unlinked</h3>
                          )}
                          {group.type === "group" && (
                            <Badge variant="purple" className="shadow-sm text-[10px] px-1.5">Group</Badge>
                          )}
                        </div>
                        {group.inquiry ? (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-sm text-slate-500 font-medium leading-none">
                            <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{group.inquiry.inquiry_number}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{format(new Date(group.inquiry.arriving_date), "MMM d")} - {format(new Date(group.inquiry.departure_date), "MMM d")}</span>
                            <span>•</span>
                            <span className="text-slate-700 font-bold">{group.inquiry.total_pax} Pax</span>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 font-medium">No associated inquiry</p>
                        )}
                      </div>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-50 pt-3 sm:pt-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">{group.itineraries.length}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12 leading-tight">Plans</span>
                      </div>

                      {group.inquiry && (
                        <Link href={group.type === "group" ? `/group-inquiries/${group.inquiry.id}` : `/inquiries/${group.inquiry.id}`} onClick={(e) => e.stopPropagation()}>
                          <button className="p-3 text-slate-400 hover:text-primary-600 hover:bg-white rounded-xl transition-colors shadow-sm bg-slate-50 border border-slate-100" title="View Inquiry">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Itineraries in Group */}
                <div
                  className={`transition-all duration-500 ease-in-out ${isExpanded ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                >
                  <div className="px-8 pb-8 pt-2 grid grid-cols-1 gap-4">
                    {group.itineraries.map((itinerary) => (
                      <div key={itinerary.id} className="group/card relative bg-slate-50 hover:bg-white p-6 rounded-[1.5rem] border border-slate-100 hover:border-primary-100 hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <Link href={`/itineraries/${itinerary.id}`} className="group-hover/card:text-primary-600 transition-colors">
                                <h4 className="text-lg font-bold text-slate-900 truncate">{itinerary.content.title}</h4>
                              </Link>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${itinerary.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                itinerary.status === "in_progress" ? "bg-blue-50 text-blue-700 border-blue-100" :
                                  "bg-amber-50 text-amber-700 border-amber-100"
                                }`}>
                                {itinerary.status?.replace("_", " ") || "NEW"}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 font-medium line-clamp-1 mb-3">{itinerary.content.summary}</p>

                            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                              <span className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100 text-slate-600">
                                <svg className="w-3.5 h-3.5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {itinerary.content.days?.length || 0} DAYS
                              </span>
                              <span>Created {format(new Date(itinerary.created_at), "MMM d")}</span>
                              {itinerary.updated_at !== itinerary.created_at && (
                                <span className="text-primary-600">Updated {format(new Date(itinerary.updated_at), "MMM d")}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                            <Link href={`/itineraries/${itinerary.id}`}>
                              <Button size="sm" variant="secondary" className="rounded-xl shadow-sm">
                                View Plan
                              </Button>
                            </Link>
                            <button
                              onClick={() => setDeleteConfirm(itinerary.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                              title="Delete itinerary"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
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
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 md:px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Type</th>
                  <th className="px-6 md:px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Itinerary Details</th>
                  <th className="px-6 md:px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Client</th>
                  <th className="px-6 md:px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Duration</th>
                  <th className="px-6 md:px-8 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredItineraries.map((itinerary) => (
                  <tr key={itinerary.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <Badge variant={itinerary.type === "group" ? "purple" : "blue"} className="shadow-sm">
                        {itinerary.type === "group" ? "Group" : "Individual"}
                      </Badge>
                    </td>
                    <td className="px-8 py-5">
                      <Link href={`/itineraries/${itinerary.id}`} className="block group/link">
                        <p className="font-bold text-slate-900 group-hover/link:text-primary-600 transition-colors truncate max-w-xs text-base">
                          {itinerary.content.title}
                        </p>
                        <p className="text-xs text-slate-500 font-medium truncate max-w-xs mt-1">
                          {itinerary.content.summary}
                        </p>
                      </Link>
                    </td>
                    <td className="px-8 py-5">
                      {itinerary.inquiry ? (
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {itinerary.inquiry.first_name || 'Guest'} {itinerary.inquiry.last_name || ''}
                          </p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5 bg-slate-100 inline-block px-1.5 rounded">
                            {itinerary.inquiry.inquiry_number}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">—</span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 shadow-sm">
                        <svg className="w-3.5 h-3.5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {itinerary.content.days?.length || 0} days
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/itineraries/${itinerary.id}`}>
                          <Button variant="secondary" size="sm" className="rounded-lg shadow-sm">
                            View
                          </Button>
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm(itinerary.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No results */}
      {filteredItineraries.length === 0 && searchQuery && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No results found</h3>
          <p className="text-slate-500 mb-6">We couldn't find any itineraries matching "{searchQuery}"</p>
          <Button variant="secondary" onClick={() => setSearchQuery("")} className="rounded-xl">Clear search</Button>
        </div>
      )}

      {/* Delete Confirmation Modal via PIN */}
      {deleteConfirm && (
        <AdminPinModal
            isOpen={!!deleteConfirm}
            title="Authorize Deletion"
            description="Are you sure you want to delete this itinerary? This valid travel plan will be permanently removed."
            onAuthorized={() => handleDelete(deleteConfirm)}
            onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}


