import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { PnlDashboard } from "./PnlDashboard";

export default async function PnlPage() {
    return (
        <AppLayout>
            <Header
                title="Profit & Loss"
                subtitle="Track income, expenses, and profitability across all tours"
            />
            <PnlDashboard />
        </AppLayout>
    );
}
