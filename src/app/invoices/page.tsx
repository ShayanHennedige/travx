"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";
import { format } from "date-fns";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { AdminPinModal } from "@/components/AdminPinModal";

function InvoicesListContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const itineraryId = searchParams.get("itinerary_id");
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

    // PIN and Modal states
    const [pendingAction, setPendingAction] = useState<{ type: 'delete' | 'edit', invoice: any } | null>(null);
    const [showPinModal, setShowPinModal] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<any>(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const fetchInvoices = async () => {
        setIsLoading(true);
        const supabase = createClient();

        let query = supabase
            .from("customer_invoices")
            .select("*")
            .order("created_at", { ascending: false });

        // Filter by itinerary_id if provided in URL
        if (itineraryId) {
            query = query.eq("itinerary_id", itineraryId);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching invoices:", error);
            toast.error("Failed to load invoices");
        } else {
            setInvoices(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchInvoices();
    }, [itineraryId]);

    const requestAction = (type: 'delete' | 'edit', invoice: any) => {
        setPendingAction({ type, invoice });
        setShowPinModal(true);
    };

    const handlePinAuthorized = async () => {
        setShowPinModal(false);
        if (!pendingAction) return;

        if (pendingAction.type === 'delete') {
            await executeDelete(pendingAction.invoice.id);
        } else if (pendingAction.type === 'edit') {
            setEditingInvoice({ ...pendingAction.invoice });
        }
        setPendingAction(null);
    };

    const executeDelete = async (invoiceId: string) => {
        setDeletingId(invoiceId);

        try {
            const response = await fetch(`/api/customer-invoices?id=${invoiceId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Failed to delete invoice");
            }

            toast.success("Invoice deleted successfully");
            await fetchInvoices(); // Refresh the list
        } catch (error: any) {
            console.error("Error deleting invoice:", error);
            toast.error(error.message || "Failed to delete invoice");
        } finally {
            setDeletingId(null);
        }
    };

    const handleSaveEdit = async () => {
        setIsSavingEdit(true);
        try {
            const response = await fetch("/api/customer-invoices", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editingInvoice),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Failed to update invoice");
            }

            toast.success(`Invoice updated successfully`);
            setEditingInvoice(null);
            await fetchInvoices();
        } catch (error: any) {
            console.error("Error updating invoice:", error);
            toast.error(error.message || "Failed to update invoice");
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleStatusChange = async (invoiceId: string, currentStatus: string) => {
        // Toggle between draft and confirmed
        const newStatus = currentStatus === "draft" ? "confirmed" : "draft";

        setUpdatingStatusId(invoiceId);

        try {
            const response = await fetch("/api/customer-invoices", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: invoiceId,
                    status: newStatus,
                }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Failed to update status");
            }

            toast.success(`Invoice status changed to ${newStatus}`);
            await fetchInvoices(); // Refresh the list
        } catch (error: any) {
            console.error("Error updating status:", error);
            toast.error(error.message || "Failed to update status");
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "confirmed": return "bg-green-100 text-green-700";
            case "paid": return "bg-blue-100 text-blue-700";
            case "sent": return "bg-purple-100 text-purple-700";
            case "overdue": return "bg-red-100 text-red-700";
            default: return "bg-surface-100 text-surface-600";
        }
    };

    if (isLoading) return <div className="p-8 text-center text-surface-500">Loading invoices...</div>;

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <h1 className="text-2xl font-bold text-surface-900">Customer Invoices</h1>
                <Link href="/operations">
                    <Button variant="secondary">Back to Operations</Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {invoices.length === 0 ? (
                    <Card className="p-8 text-center text-surface-500">
                        No invoices found.
                    </Card>
                ) : (
                    invoices.map((invoice) => (
                        <Card key={invoice.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-surface-900">{invoice.invoice_no}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(invoice.status)}`}>
                                        {invoice.status}
                                    </span>
                                </div>
                                <div className="text-xs text-surface-500">
                                    Customer: <span className="text-surface-700 font-medium">{invoice.customer_name}</span>
                                </div>
                                <div className="text-[10px] text-surface-400">
                                    Tour Ref: {invoice.tour_reference || "N/A"} • Date: {format(new Date(invoice.invoice_date || invoice.created_at), "MMM d, yyyy")}
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                                <div className="text-right">
                                    <div className="text-sm font-bold text-surface-900">$ {invoice.total_amount?.toLocaleString()}</div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Link href={`/api/customer-invoices/${invoice.id}/pdf?view=true`} target="_blank">
                                        <Button size="sm" variant="secondary" className="text-xs">View PDF</Button>
                                    </Link>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs"
                                        onClick={async () => {
                                            try {
                                                const res = await fetch(`/api/customer-invoices/${invoice.id}/pdf`);
                                                if (!res.ok) throw new Error("Failed");
                                                const blob = await res.blob();
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement("a");
                                                a.href = url;
                                                a.download = `Invoice-${invoice.invoice_no}.pdf`;
                                                document.body.appendChild(a);
                                                a.click();
                                                a.remove();
                                                window.URL.revokeObjectURL(url);
                                            } catch { toast.error("Download failed"); }
                                        }}
                                    >
                                        Download
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs text-indigo-600 hover:bg-indigo-50"
                                        onClick={() => requestAction('edit', invoice)}
                                    >
                                        Edit
                                    </Button>
                                    
                                    {invoice.status !== "confirmed" && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-xs text-primary-600"
                                            onClick={() => handleStatusChange(invoice.id, invoice.status)}
                                            disabled={updatingStatusId === invoice.id}
                                        >
                                            {updatingStatusId === invoice.id ? "..." : invoice.status === "draft" ? "Confirm" : "Draft"}
                                        </Button>
                                    )}

                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs text-red-600 hover:bg-red-50"
                                        onClick={() => requestAction('delete', invoice)}
                                        disabled={deletingId === invoice.id}
                                    >
                                        {deletingId === invoice.id ? "..." : "Delete"}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* PIN Authorization Modal */}
            {showPinModal && (
                <AdminPinModal
                    isOpen={showPinModal}
                    title={`Authorize ${pendingAction?.type === 'delete' ? 'Deletion' : 'Edit'}`}
                    onAuthorized={handlePinAuthorized}
                    onClose={() => {
                        setShowPinModal(false);
                        setPendingAction(null);
                    }}
                />
            )}

            {/* Edit Modal */}
            {editingInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-surface-200 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-surface-900">Edit Invoice {editingInvoice.invoice_no}</h2>
                            <button
                                onClick={() => setEditingInvoice(null)}
                                className="text-surface-500 hover:text-surface-700"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-surface-900 mb-2">Package Description</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    rows={4}
                                    value={editingInvoice.package_description || ""}
                                    onChange={(e) => setEditingInvoice({ ...editingInvoice, package_description: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-surface-900 mb-2">Internal Notes</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    rows={2}
                                    value={editingInvoice.notes || ""}
                                    onChange={(e) => setEditingInvoice({ ...editingInvoice, notes: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {(["sgl", "dbl", "tpl", "qud"] as const).map(type => (
                                    <div key={type} className="space-y-2 p-3 bg-surface-50 rounded-lg border border-surface-200">
                                        <div className="text-xs font-bold text-surface-500 uppercase tracking-widest">{type} Rooms</div>
                                        <div>
                                            <label className="text-[10px] text-surface-400 uppercase">Quantity</label>
                                            <input
                                                type="number"
                                                className="w-full px-2 py-1 text-sm border border-surface-300 rounded"
                                                value={editingInvoice[`qty_${type}`] || 0}
                                                onChange={(e) => setEditingInvoice({ ...editingInvoice, [`qty_${type}`]: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-surface-400 uppercase">Rate (USD)</label>
                                            <input
                                                type="number"
                                                className="w-full px-2 py-1 text-sm border border-surface-300 rounded"
                                                value={editingInvoice[`rate_${type}`] || 0}
                                                onChange={(e) => setEditingInvoice({ ...editingInvoice, [`rate_${type}`]: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-surface-700 mb-1">Bank Charges (USD)</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
                                        value={editingInvoice.bank_charges || 0}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, bank_charges: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-surface-700 mb-1">Tax Percentage (%)</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
                                        value={editingInvoice.tax_percentage || 0}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, tax_percentage: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-4 border-t border-surface-200">
                                <Button variant="secondary" onClick={() => setEditingInvoice(null)}>Cancel</Button>
                                <Button loading={isSavingEdit} onClick={handleSaveEdit}>Save Changes</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function InvoicesListPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-surface-500">Loading...</div>}>
            <InvoicesListContent />
        </Suspense>
    );
}
