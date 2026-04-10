import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { Button } from "@/components/ui";
import Link from "next/link";
import { PaymentVoucherForm } from "./PaymentVoucherForm";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function PaymentVoucherDetailPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: voucher, error } = await supabase
        .from("payment_vouchers")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !voucher) {
        notFound();
    }

    return (
        <AppLayout>
            <Header
                title={`Payment Voucher ${voucher.voucher_no}`}
                subtitle={`${voucher.payee_type} - ${voucher.payee_name}`}
                action={
                    <Link href="/payment-vouchers">
                        <Button variant="secondary" size="sm">Back to List</Button>
                    </Link>
                }
            />
            <PaymentVoucherForm voucher={voucher} />
        </AppLayout>
    );
}
