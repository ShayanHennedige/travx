"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { AdminPinModal } from "@/components/AdminPinModal";

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
  const [editPending, setEditPending] = useState<Driver | null>(null);
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

  const requestEdit = (driver: Driver) => {
    setEditPending(driver);
  };

  const executeEdit = () => {
      if (!editPending) return;
      const driver = editPending;
      setFormData({
      name: driver.name,
      contact_number: driver.contact_number,
      vehicle_type: driver.vehicle_type || "",
      vehicle_number: driver.vehicle_number || "",
      languages: driver.languages || [],
    });
    setEditingDriver(driver);
    setEditPending(null);
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
      {/* Actions Bar - Consolidated */}
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
              placeholder="Search driver by name, contact or vehicle..."
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
          Add New Driver
        </Button>
      </div>

      {/* Drivers List - Streamlined Table */}
      <div className="card overflow-hidden border-surface-200">
        <div className="px-6 py-5 border-b border-surface-100 bg-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-surface-900 tracking-tight">Driver Directory</h3>
            <p className="text-sm text-surface-500 mt-0.5">Total of {drivers.length} registered drivers</p>
          </div>
          {filteredDrivers.length !== drivers.length && (
            <span className="text-xs font-medium text-surface-400 bg-surface-50 px-2 py-1 rounded-md">
              Showing {filteredDrivers.length} results
            </span>
          )}
        </div>

        {filteredDrivers.length === 0 ? (
          <div className="p-12 text-center">
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left" suppressHydrationWarning>
              <thead className="text-xs text-surface-500 uppercase bg-surface-50 border-b border-surface-200">
                <tr>
                  <th className="px-6 py-3 font-medium">Driver Name</th>
                  <th className="px-6 py-3 font-medium">Contact</th>
                  <th className="px-6 py-3 font-medium">Vehicle</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-surface-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs">
                          {driver.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        {driver.name}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-surface-600">{driver.contact_number}</td>
                    <td className="px-6 py-3 text-surface-600">
                      {driver.vehicle_type ? (
                        <span>
                          {driver.vehicle_type}
                          {driver.vehicle_number && <span className="text-surface-400"> • {driver.vehicle_number}</span>}
                        </span>
                      ) : (
                        <span className="text-surface-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => requestEdit(driver)}>
                          Edit
                        </Button>
                        <button
                          onClick={() => setDeleteConfirm(driver.id)}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  >
                    <option value="">Not Assigned</option>
                    <option value="Car">Car</option>
                    <option value="Van">Van</option>
                    <option value="Mini Coach">Mini Coach</option>
                    <option value="30 Seater Coach">30 Seater Coach</option>
                    <option value="Large Coach">Large Coach</option>
                  </select>
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

      {/* Delete Confirmation Modal via PIN */}
      {deleteConfirm && (
        <AdminPinModal
            isOpen={!!deleteConfirm}
            title="Authorize Deletion"
            description="Are you sure you want to delete this driver? This action cannot be undone."
            onAuthorized={() => handleDelete(deleteConfirm)}
            onClose={() => setDeleteConfirm(null)}
        />
      )}

      {/* Edit Authorization PIN */}
      {editPending && (
        <AdminPinModal
            isOpen={!!editPending}
            title="Authorize Edit"
            description="Enter the admin PIN to edit this driver profile."
            onAuthorized={() => executeEdit()}
            onClose={() => setEditPending(null)}
        />
      )}
    </div>
  );
}
