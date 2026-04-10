import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { PnlDetail } from "./PnlDetail";
import { notFound } from "next/navigation";

interface PageParams {
    params: Promise<{ tourId: string }>;
}

export default async function PnlDetailPage({ params }: PageParams) {
    const { tourId } = await params;
    const supabase = await createClient();

    // Fetch tour reference for header
    const { data: tour } = await supabase
        .from("tours")
        .select("reference_number")
        .eq("id", tourId)
        .single();

    return (
        <AppLayout>
            <Header
                title={`P&L: ${tour?.reference_number || "Tour Details"}`}
                subtitle="Detailed profit and loss breakdown for this tour"
            />
            <PnlDetail tourId={tourId} />
        </AppLayout>
    );
}
