"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";
import { format } from "date-fns";
import Link from "next/link";
import { toast } from "react-hot-toast";

function InvoicesListContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const itineraryId = searchParams.get("itinerary_id");
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

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

    const handleDelete = async (invoiceId: string, invoiceNo: string) => {
        if (!confirm(`Are you sure you want to delete invoice ${invoiceNo}? This action cannot be undone.`)) {
            return;
        }

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
            case "overdue": return "bg-accent-500/15 text-accent-700";
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
                                    <Link href={`/api/customer-invoices/${invoice.id}/pdf`} target="_blank">
                                        <Button size="sm" variant="secondary" className="text-xs">View PDF</Button>
                                    </Link>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs text-primary-600"
                                        onClick={() => handleStatusChange(invoice.id, invoice.status)}
                                        disabled={updatingStatusId === invoice.id}
                                    >
                                        {updatingStatusId === invoice.id ? "..." : invoice.status === "draft" ? "Confirm" : "Draft"}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs text-accent-500 hover:bg-accent-500/10"
                                        onClick={() => handleDelete(invoice.id, invoice.invoice_no)}
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
