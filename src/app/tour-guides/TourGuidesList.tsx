"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

interface TourGuide {
  id: string;
  name: string;
  phone_number: string;
  language: string;
  is_active: boolean;
  created_at: string;
}

interface TourGuidesListProps {
  guides: TourGuide[];
}

const languages = ["English", "German", "French", "Spanish", "Italian", "Russian", "Japanese", "Chinese", "Arabic"] as const;

export function TourGuidesList({ guides: initialGuides }: TourGuidesListProps) {
  const router = useRouter();
  const [guides, setGuides] = useState(initialGuides);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGuide, setEditingGuide] = useState<TourGuide | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    language: "English" as const,
  });

  const filteredGuides = guides.filter((guide) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      guide.name.toLowerCase().includes(query) ||
      guide.phone_number.includes(query) ||
      guide.language.toLowerCase().includes(query)
    );
  });

  const resetForm = () => {
    setFormData({
      name: "",
      phone_number: "",
      language: "English",
    });
    setEditingGuide(null);
    setShowAddModal(false);
  };

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.phone_number.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/tour-guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        setGuides([...guides, data.guide]);
        resetForm();
        router.refresh();
      } else {
        alert(data.error || "Failed to create guide");
      }
    } catch (error) {
      alert("Error creating guide");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingGuide || !formData.name.trim() || !formData.phone_number.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tour-guides/${editingGuide.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        setGuides(guides.map((g) => (g.id === editingGuide.id ? data.guide : g)));
        resetForm();
        router.refresh();
      } else {
        alert(data.error || "Failed to update guide");
      }
    } catch (error) {
      alert("Error updating guide");
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

      if (response.ok) {
        setGuides(guides.filter((g) => g.id !== id));
        setDeleteConfirm(null);
        router.refresh();
      } else {
        alert("Failed to delete guide");
      }
    } catch (error) {
      alert("Error deleting guide");
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (guide: TourGuide) => {
    setEditingGuide(guide);
    setFormData({
      name: guide.name,
      phone_number: guide.phone_number,
      language: guide.language as typeof languages[number],
    });
    setShowAddModal(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const avatarColors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-red-500",
  ];

  const getAvatarColor = (name: string) => {
    const index = name.charCodeAt(0) % avatarColors.length;
    return avatarColors[index];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-surface-900">Tour Guides Directory</h2>
        <Button onClick={() => { resetForm(); setShowAddModal(true); }} className="bg-primary-600 hover:bg-primary-700">
          + Add Guide
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search by name, phone, or language..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Guides Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-surface-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-surface-700">Phone</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-surface-700">Language</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-surface-700">Status</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-surface-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuides.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-surface-500">
                    No tour guides found
                  </td>
                </tr>
              ) : (
                filteredGuides.map((guide) => (
                  <tr key={guide.id} className="border-b border-surface-200 hover:bg-surface-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full ${getAvatarColor(
                            guide.name
                          )} flex items-center justify-center text-white font-semibold text-sm`}
                        >
                          {getInitials(guide.name)}
                        </div>
                        <span className="font-medium text-surface-900">{guide.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-surface-600">{guide.phone_number}</td>
                    <td className="px-4 py-4">
                      <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                        {guide.language}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          guide.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-surface-200 text-surface-600"
                        }`}
                      >
                        {guide.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(guide)}
                        className="px-3 py-1 text-primary-600 hover:bg-primary-100 rounded transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(guide.id)}
                        className="px-3 py-1 text-red-600 hover:bg-red-100 rounded transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">
              {editingGuide ? "Edit Tour Guide" : "Add New Tour Guide"}
            </h3>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Name*</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Guide name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Phone Number*</label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-4 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Language*</label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value as typeof languages[number] })}
                className="w-full px-4 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={resetForm}
                className="flex-1 px-4 py-2 border border-surface-300 rounded-lg hover:bg-surface-50"
              >
                Cancel
              </button>
              <button
                onClick={editingGuide ? handleEdit : handleAdd}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isLoading ? "Saving..." : editingGuide ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Delete Tour Guide?</h3>
            <p className="text-surface-600">
              Are you sure you want to delete this tour guide? This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-surface-300 rounded-lg hover:bg-surface-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
