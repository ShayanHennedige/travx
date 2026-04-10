"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppLayout, Header } from "@/components/layout";
import { PaymentVouchersList } from "./PaymentVouchersList";

function PaymentVouchersContent() {
    const searchParams = useSearchParams();
    const tourId = searchParams.get("tour_id");
    const [vouchers, setVouchers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchVouchers = async () => {
            setIsLoading(true);
            const supabase = createClient();

            let query = supabase
                .from("payment_vouchers")
                .select("*")
                .order("voucher_date", { ascending: true });

            // Filter by tour_id if provided in URL
            if (tourId) {
                query = query.eq("tour_id", tourId);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching payment vouchers:", error);
            }

            setVouchers(data || []);
            setIsLoading(false);
        };

        fetchVouchers();
    }, [tourId]);

    if (isLoading) {
        return <div className="p-8 text-center text-surface-500">Loading payment vouchers...</div>;
    }

    return <PaymentVouchersList vouchers={vouchers} />;
}

export default function PaymentVouchersPage() {
    return (
        <AppLayout>
            <Header
                title="Payment Vouchers"
                subtitle="Manage payments to hotels and suppliers"
            />

            <Suspense fallback={<div className="p-8 text-center text-surface-500">Loading...</div>}>
                <PaymentVouchersContent />
            </Suspense>
        </AppLayout>
    );
}
