"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

interface Driver {
  id: string;
  name: string;
  contact_number: string;
  vehicle_type: string | null;
  vehicle_number: string | null;
  languages: string[];
  created_at: string;
}

interface DriversListProps {
  drivers: Driver[];
}


export function DriversList({ drivers: initialDrivers }: DriversListProps) {
  const router = useRouter();
  const [drivers, setDrivers] = useState(initialDrivers);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    contact_number: "",
    vehicle_type: "",
    vehicle_number: "",
    languages: [] as string[],
  });

  const filteredDrivers = drivers.filter((driver) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      driver.name.toLowerCase().includes(query) ||
      driver.contact_number.includes(query) ||
      driver.vehicle_number?.toLowerCase().includes(query) ||
      driver.vehicle_type?.toLowerCase().includes(query)
    );
  });

  const resetForm = () => {
    setFormData({
      name: "",
      contact_number: "",
      vehicle_type: "",
      vehicle_number: "",
      languages: [],
    });
  };

  const handleAdd = () => {
    resetForm();
    setEditingDriver(null);
    setShowAddModal(true);
  };

  const handleEdit = (driver: Driver) => {
    setFormData({
      name: driver.name,
      contact_number: driver.contact_number,
      vehicle_type: driver.vehicle_type || "",
      vehicle_number: driver.vehicle_number || "",
      languages: driver.languages || [],
    });
    setEditingDriver(driver);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = editingDriver ? `/api/drivers/${editingDriver.id}` : "/api/drivers";
      const method = editingDriver ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save");

      const data = await response.json();

      if (editingDriver) {
        setDrivers((prev) =>
          prev.map((d) => (d.id === editingDriver.id ? data.driver : d))
        );
      } else {
        setDrivers((prev) => [...prev, data.driver]);
      }

      setShowAddModal(false);
      resetForm();
      router.refresh();
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save driver");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/drivers/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");

      setDrivers((prev) => prev.filter((d) => d.id !== id));
      setDeleteConfirm(null);
      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete driver");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
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
                placeholder="Search drivers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm"
              />
            </div>
          </div>
          <Button onClick={handleAdd}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Driver
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-surface-900">{drivers.length}</p>
            <p className="text-sm text-surface-500">Total Drivers</p>
          </div>
        </div>
      </div>

      {/* Drivers Grid */}
      {filteredDrivers.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-surface-900 mb-1">No drivers found</h3>
          <p className="text-surface-500 mb-6">
            {searchQuery ? "Try a different search term" : "Add your first driver to get started"}
          </p>
          {!searchQuery && (
            <Button onClick={handleAdd}>Add Driver</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrivers.map((driver) => (
            <div key={driver.id} className="card p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg">
                    {driver.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-900">{driver.name}</h3>
                    <p className="text-sm text-surface-500">{driver.contact_number}</p>
                  </div>
                </div>
              </div>

              {(driver.vehicle_type || driver.vehicle_number) && (
                <div className="flex items-center gap-2 text-sm text-surface-600 mb-3">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span>
                    {driver.vehicle_type}
                    {driver.vehicle_number && ` • ${driver.vehicle_number}`}
                  </span>
                </div>
              )}

              {driver.languages && driver.languages.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {driver.languages.map((lang) => (
                    <span key={lang} className="px-2 py-0.5 bg-surface-100 text-surface-600 rounded text-xs">
                      {lang}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-surface-100">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleEdit(driver)}>
                  Edit
                </Button>
                <button
                  onClick={() => setDeleteConfirm(driver.id)}
                  className="p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-surface-200">
              <h2 className="text-xl font-semibold text-surface-900">
                {editingDriver ? "Edit Driver" : "Add New Driver"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-surface-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-surface-700 mb-1">
                    Contact Number *
                  </label>
                  <input
                    type="text"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">
                    Vehicle Type
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    placeholder="e.g., Toyota HiAce"
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                    placeholder="e.g., CAI-7756"
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  />
                </div>
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
                  {isLoading ? "Saving..." : editingDriver ? "Update" : "Add Driver"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-surface-900">Delete Driver</h3>
                <p className="text-sm text-surface-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-surface-600 mb-6">
              Are you sure you want to delete this driver?
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)} disabled={isLoading}>
                Cancel
              </Button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
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
