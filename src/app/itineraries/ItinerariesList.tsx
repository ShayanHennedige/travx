"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Button, Badge } from "@/components/ui";

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

  // Filter and sort itineraries
  const filteredItineraries = useMemo(() => {
    let filtered = itineraries.filter((itinerary) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const clientName = itinerary.inquiry 
        ? `${itinerary.inquiry.first_name} ${itinerary.inquiry.last_name}`.toLowerCase()
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
          const nameA = a.inquiry ? `${a.inquiry.first_name} ${a.inquiry.last_name}` : "";
          const nameB = b.inquiry ? `${b.inquiry.first_name} ${b.inquiry.last_name}` : "";
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

  const getInquiryDetailUrl = (itinerary: Itinerary) => {
    if (itinerary.type === "group" && itinerary.group_inquiry_id) {
      return `/group-inquiries/${itinerary.group_inquiry_id}`;
    }
    return `/inquiries/${itinerary.inquiry_id}`;
  };

  if (itineraries.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-700 light:bg-surface-200 flex items-center justify-center">
          <svg className="w-8 h-8 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-surface-100 light:text-surface-900 mb-1">
          No itineraries yet
        </h3>
        <p className="text-surface-400 light:text-surface-500 mb-6">
          Generate itineraries from inquiry details to see them here
        </p>
        <Link href="/inquiries">
          <Button>View Inquiries</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
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
                placeholder="Search by client, inquiry #, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-surface-600 light:border-surface-300 bg-surface-800 light:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm text-surface-100 light:text-surface-900 placeholder:text-surface-500 light:placeholder:text-surface-400"
              />
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-surface-700 light:bg-surface-200 rounded-lg p-1 border border-surface-600 light:border-surface-300">
            <button
              onClick={() => setViewMode("grouped")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "grouped"
                  ? "bg-accent-500 text-white light:text-black shadow-sm"
                  : "text-surface-400 light:text-surface-600 hover:text-surface-100 light:hover:text-surface-900"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Grouped
              </span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-accent-500 text-white light:text-black shadow-sm"
                  : "text-surface-400 light:text-surface-600 hover:text-surface-100 light:hover:text-surface-900"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                List
              </span>
            </button>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 rounded-lg border border-surface-600 light:border-surface-300 bg-surface-800 light:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm text-surface-100 light:text-surface-900"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="client">By Client Name</option>
          </select>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-surface-400 light:text-surface-500">
          Showing {filteredItineraries.length} of {itineraries.length} itineraries
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      </div>

      {/* Grouped View */}
      {viewMode === "grouped" && (
        <div className="space-y-6">
          {groupedItineraries.map(([key, group], index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="card overflow-hidden"
            >
              {/* Group Header */}
              <div className="bg-surface-700 light:bg-surface-100 px-6 py-4 border-b border-surface-600 light:border-surface-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {group.inquiry ? (
                      <>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                          group.type === "group" 
                            ? "bg-primary-900/50 light:bg-primary-100 text-primary-300 light:text-primary-800" 
                            : "bg-primary-800/80 light:bg-primary-100 text-primary-300 light:text-primary-700"
                        }`}>
                          {group.inquiry.first_name.charAt(0)}{group.inquiry.last_name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-surface-100 light:text-surface-900">
                              {group.inquiry.first_name} {group.inquiry.last_name}
                            </h3>
                            {group.type === "group" && (
                              <Badge variant="purple">Group</Badge>
                            )}
                          </div>
                          <p className="text-sm text-surface-400 light:text-surface-500">
                            {group.inquiry.inquiry_number} • {format(new Date(group.inquiry.arriving_date), "MMM d")} - {format(new Date(group.inquiry.departure_date), "MMM d, yyyy")} • {group.inquiry.total_pax} pax
                          </p>
                        </div>
                      </>
                    ) : (
                      <div>
                        <h3 className="font-semibold text-surface-100">Unlinked Itineraries</h3>
                        <p className="text-sm text-surface-500 light:text-surface-600">No inquiry associated</p>
                      </div>
                    )}
                  </div>
                  {group.inquiry && (
                    <Link href={group.type === "group" ? `/group-inquiries/${group.inquiry.id}` : `/inquiries/${group.inquiry.id}`}>
                      <Button variant="secondary" size="sm">
                        View Inquiry
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Itineraries in Group - nested rows with distinct background */}
              <div className="divide-y divide-surface-600 light:divide-surface-200 bg-surface-800/50 light:bg-surface-50">
                {group.itineraries.map((itinerary) => (
                  <div key={itinerary.id} className="p-4 hover:bg-surface-700/70 light:hover:bg-surface-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <Link href={`/itineraries/${itinerary.id}`} className="block group">
                          <h4 className="font-medium text-surface-100 light:text-surface-900 group-hover:text-primary-400 light:group-hover:text-primary-600 transition-colors truncate">
                            {itinerary.content.title}
                          </h4>
                          <p className="text-sm text-surface-400 light:text-surface-500 line-clamp-1 mt-0.5">
                            {itinerary.content.summary}
                          </p>
                        </Link>
                        <div className="flex items-center gap-4 mt-2 text-xs text-surface-400 light:text-surface-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {itinerary.content.days?.length || 0} days
                          </span>
                          <span>
                            Generated {format(new Date(itinerary.created_at), "MMM d, yyyy")}
                          </span>
                          {itinerary.updated_at !== itinerary.created_at && (
                            <span className="text-primary-500">
                              Edited {format(new Date(itinerary.updated_at), "MMM d")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <ItineraryStatusSelector
                          itineraryId={itinerary.id}
                          currentStatus={itinerary.status}
                        />
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Link href={`/itineraries/${itinerary.id}`}>
                          <Button variant="secondary" size="sm">
                            View
                          </Button>
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm(itinerary.id)}
                          className="p-2 text-surface-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Delete itinerary"
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
            </motion.div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-600 light:border-surface-200 bg-surface-700 light:bg-surface-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
                  Itinerary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
                  Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 light:text-surface-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-surface-500 light:text-surface-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-600 light:divide-surface-200">
              {filteredItineraries.map((itinerary, index) => (
                <motion.tr
                  key={itinerary.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="hover:bg-surface-700/50 light:hover:bg-surface-100 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Badge variant={itinerary.type === "group" ? "purple" : "blue"}>
                      {itinerary.type === "group" ? "Group" : "Individual"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/itineraries/${itinerary.id}`} className="block group">
                      <p className="font-medium text-surface-100 light:text-surface-900 group-hover:text-primary-400 light:group-hover:text-primary-600 transition-colors truncate max-w-xs">
                        {itinerary.content.title}
                      </p>
                      <p className="text-sm text-surface-400 light:text-surface-500 truncate max-w-xs">
                        {itinerary.content.summary}
                      </p>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    {itinerary.inquiry ? (
                      <div>
                        <p className="text-sm font-medium text-surface-100 light:text-surface-900">
                          {itinerary.inquiry.first_name} {itinerary.inquiry.last_name}
                        </p>
                        <p className="text-xs text-surface-400 light:text-surface-500">
                          {itinerary.inquiry.inquiry_number}
                        </p>
                      </div>
                    ) : (
                      <span className="text-surface-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-900/50 light:bg-primary-100 text-primary-300 light:text-primary-800">
                      {itinerary.content.days?.length || 0} days
                    </span>
                  </td>
                    <td className="px-6 py-4 text-sm text-surface-400 light:text-surface-500">
                    {format(new Date(itinerary.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-6 py-4">
                    <ItineraryStatusSelector
                      itineraryId={itinerary.id}
                      currentStatus={itinerary.status}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/itineraries/${itinerary.id}`}>
                        <Button variant="secondary" size="sm">
                          View
                        </Button>
                      </Link>
                      <button
                        onClick={() => setDeleteConfirm(itinerary.id)}
                        className="p-2 text-surface-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete itinerary"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No results */}
      {filteredItineraries.length === 0 && searchQuery && (
        <div className="card p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-surface-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-lg font-medium text-surface-100 light:text-surface-900 mb-1">No results found</h3>
          <p className="text-surface-400 light:text-surface-500">
            Try adjusting your search query
          </p>
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
                <h3 className="text-lg font-semibold text-surface-100 light:text-surface-900">Delete Itinerary</h3>
                <p className="text-sm text-surface-400 light:text-surface-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-surface-400 light:text-surface-500 mb-6">
              Are you sure you want to delete this itinerary? This will permanently remove the travel plan and cannot be recovered.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
              >
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

interface ItineraryStatusSelectorProps {
  itineraryId: string;
  currentStatus: ComponentStatus | null;
}

function ItineraryStatusSelector({ itineraryId, currentStatus }: ItineraryStatusSelectorProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ComponentStatus>(currentStatus || "new");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: ComponentStatus) => {
    if (newStatus === currentStatus) return;
    
    setStatus(newStatus);
    setIsUpdating(true);
    
    try {
      const response = await fetch(`/api/itinerary/${itineraryId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");
      
      router.refresh();
    } catch (error) {
      console.error("Error updating status:", error);
      setStatus(currentStatus || "new"); // Revert on error
      alert("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (s: ComponentStatus | null) => {
    if (!s) return "bg-surface-700 light:bg-surface-200 text-surface-400 light:text-surface-600";
    if (s === "completed") return "bg-green-900/50 light:bg-green-100 text-green-300 light:text-green-800 border border-green-700/50 light:border-green-200";
    if (s === "in_progress") return "bg-primary-900/50 light:bg-primary-100 text-primary-300 light:text-primary-800 border border-primary-700/50 light:border-primary-200";
    return "bg-amber-900/50 light:bg-amber-100 text-amber-300 light:text-amber-800 border border-amber-700/50 light:border-amber-200";
  };

  const statusOptions: { value: ComponentStatus; label: string }[] = [
    { value: "new", label: "New" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
        {status === "completed" ? "✓" : status === "in_progress" ? "⟳" : "○"} {statusOptions.find(o => o.value === status)?.label || "New"}
      </span>
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value as ComponentStatus)}
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
