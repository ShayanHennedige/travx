"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { AdminPinModal } from "@/components/AdminPinModal";

const LANGUAGES = [
  "English",
  "French",
  "German",
  "Spanish",
  "Italian",
  "Russian",
  "Chinese (Mandarin)",
  "Japanese",
  "Korean",
  "Arabic",
  "Hindi",
  "Dutch",
  "Portuguese",
  "Polish",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Czech",
  "Hungarian",
] as const;

interface TourGuide {
  id: string;
  name: string;
  language: string;
  contact_number: string;
  created_at: string;
}

interface TourGuidesListProps {
  tourGuides: TourGuide[];
}

export function TourGuidesList({ tourGuides: initialGuides }: TourGuidesListProps) {
  const router = useRouter();
  const [tourGuides, setTourGuides] = useState(initialGuides);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGuide, setEditingGuide] = useState<TourGuide | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editPending, setEditPending] = useState<TourGuide | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    language: "",
    contact_number: "",
  });

  const filteredGuides = tourGuides.filter((guide) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      guide.name.toLowerCase().includes(query) ||
      guide.contact_number.includes(query) ||
      guide.language.toLowerCase().includes(query)
    );
  });

  const resetForm = () => {
    setFormData({ name: "", language: "", contact_number: "" });
  };

  const handleAdd = () => {
    resetForm();
    setEditingGuide(null);
    setShowAddModal(true);
  };

  const requestEdit = (guide: TourGuide) => {
    setEditPending(guide);
  };

  const executeEdit = () => {
    if (!editPending) return;
    const guide = editPending;
    setFormData({
      name: guide.name,
      language: guide.language,
      contact_number: guide.contact_number,
    });
    setEditingGuide(guide);
    setEditPending(null);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.language) {
      alert("Please select a language.");
      return;
    }
    setIsLoading(true);

    try {
      const url = editingGuide
        ? `/api/tour-guides/${editingGuide.id}`
        : "/api/tour-guides";
      const method = editingGuide ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save");

      const data = await response.json();

      if (editingGuide) {
        setTourGuides((prev) =>
          prev.map((g) => (g.id === editingGuide.id ? data.tourGuide : g))
        );
      } else {
        setTourGuides((prev) => [...prev, data.tourGuide]);
      }

      setShowAddModal(false);
      resetForm();
      router.refresh();
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save tour guide");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tour-guides/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");

      setTourGuides((prev) => prev.filter((g) => g.id !== id));
      setDeleteConfirm(null);
      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete tour guide");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 sm:max-w-md">
          <div className="relative group">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 group-focus-within:text-primary-500 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search guide by name, contact or language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all outline-none text-sm placeholder:text-surface-400 shadow-sm"
            />
          </div>
        </div>
        <Button onClick={handleAdd} className="shadow-lg shadow-primary-500/10">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Guide
        </Button>
      </div>

      {/* Tour Guides Table */}
      <div className="card overflow-hidden border-surface-200">
        <div className="px-6 py-5 border-b border-surface-100 bg-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-surface-900 tracking-tight">
              Tour Guide Directory
            </h3>
            <p className="text-sm text-surface-500 mt-0.5">
              Total of {tourGuides.length} registered tour guide{tourGuides.length !== 1 ? "s" : ""}
            </p>
          </div>
          {filteredGuides.length !== tourGuides.length && (
            <span className="text-xs font-medium text-surface-400 bg-surface-50 px-2 py-1 rounded-md">
              Showing {filteredGuides.length} results
            </span>
          )}
        </div>

        {filteredGuides.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-100 flex items-center justify-center">
              {/* Map/compass icon for tour guides */}
              <svg className="w-8 h-8 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-surface-900 mb-1">No tour guides found</h3>
            <p className="text-surface-500 mb-6">
              {searchQuery ? "Try a different search term" : "Add your first tour guide to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={handleAdd}>Add Tour Guide</Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left" suppressHydrationWarning>
              <thead className="text-xs text-surface-500 uppercase bg-surface-50 border-b border-surface-200">
                <tr>
                  <th className="px-6 py-3 font-medium">Guide Name</th>
                  <th className="px-6 py-3 font-medium">Language</th>
                  <th className="px-6 py-3 font-medium">Contact</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredGuides.map((guide) => (
                  <tr key={guide.id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-surface-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                          {guide.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        {guide.name}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-surface-600">
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        {guide.language || <span className="text-surface-400">—</span>}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-surface-600">{guide.contact_number}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => requestEdit(guide)}>
                          Edit
                        </Button>
                        <button
                          onClick={() => setDeleteConfirm(guide.id)}
                          className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
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
        )}
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-surface-200">
              <h2 className="text-xl font-semibold text-surface-900">
                {editingGuide ? "Edit Tour Guide" : "Add New Tour Guide"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  placeholder="e.g., Kasun Perera"
                  required
                />
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Language <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  required
                >
                  <option value="">Select a language</option>
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  placeholder="e.g., 077 123 4567"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : editingGuide ? "Update" : "Add Guide"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation via PIN */}
      {deleteConfirm && (
        <AdminPinModal
          isOpen={!!deleteConfirm}
          title="Authorize Deletion"
          description="Are you sure you want to delete this tour guide? This action cannot be undone."
          onAuthorized={() => handleDelete(deleteConfirm)}
          onClose={() => setDeleteConfirm(null)}
        />
      )}

      {/* Edit Authorization via PIN */}
      {editPending && (
        <AdminPinModal
          isOpen={!!editPending}
          title="Authorize Edit"
          description="Enter the admin PIN to edit this tour guide profile."
          onAuthorized={() => executeEdit()}
          onClose={() => setEditPending(null)}
        />
      )}
    </div>
  );
}
