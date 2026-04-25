import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST - Finalize a log sheet and create a transport payment voucher
export async function POST(request: Request) {
    const supabase = await createClient();

    try {
        const { tourId, logSheetData, isDraft } = await request.json();

        if (!tourId || !logSheetData) {
            return NextResponse.json(
                { error: "tourId and logSheetData are required" },
                { status: 400 }
            );
        }

        // 1. Save finalized log sheet data to tour
        const { error: tourError } = await supabase
            .from("tours")
            .update({
                log_sheet_data: logSheetData,
                log_sheet_finalized: !isDraft,
            })
            .eq("id", tourId);

        if (tourError) {
            console.error("Error finalizing log sheet:", tourError);
            return NextResponse.json({ error: tourError.message }, { status: 500 });
        }

        // 2. Get tour info for the transport voucher
        const { data: tour } = await supabase
            .from("tours")
            .select("id, client_name, reference_number, start_date, end_date")
            .eq("id", tourId)
            .single();

        // 3. Delete any existing auto-generated transport vouchers for this tour
        // This prevents stacking when re-finalizing and cleans up old buggy data
        const { error: deleteError } = await supabase
            .from("payment_vouchers")
            .delete()
            .eq("tour_id", tourId)
            .eq("voucher_category", "transport")
            .eq("payee_type", "Driver");

        if (deleteError) {
            console.error("Error cleaning old transport vouchers:", deleteError);
        }

        // 4. Create a fresh transport payment voucher with the correct USD conversion
        const totalTransportCostLKR = logSheetData.totalExpenses || 0;
        const exchangeRate = 300; // LKR to USD rate
        const totalTransportCostUSD = Math.round((totalTransportCostLKR / exchangeRate) * 100) / 100;
        const tourRef = tour?.reference_number || tour?.client_name || "";

        if (!isDraft && totalTransportCostLKR > 0) {
            // Generate voucher number
            const { data: lastVoucher } = await supabase
                .from("payment_vouchers")
                .select("voucher_no")
                .order("created_at", { ascending: false })
                .limit(1);

            const lastNo = lastVoucher?.[0]?.voucher_no;
            let nextNum = 1;
            if (lastNo) {
                const match = lastNo.match(/(\d+)/);
                if (match) nextNum = parseInt(match[1]) + 1;
            }
            const voucherNo = `PV-${String(nextNum).padStart(4, "0")}`;

            const { error: voucherError } = await supabase
                .from("payment_vouchers")
                .insert({
                    voucher_no: voucherNo,
                    voucher_date: new Date().toISOString().split("T")[0],
                    tour_id: tourId,
                    tour_reference: tourRef,
                    payee_type: "Driver",
                    payee_name: logSheetData.driverName || "Driver",
                    description: `Transport costs from finalized log sheet — ${logSheetData.totalActualKm || 0} km`,
                    total_usd: totalTransportCostUSD,
                    total_lkr: totalTransportCostLKR,
                    exchange_rate: exchangeRate,
                    voucher_category: "transport",
                    status: "draft",
                    remarks: `Auto-generated from finalized log sheet. Actual KM: ${logSheetData.totalActualKm || 0}`,
                });

            if (voucherError) {
                console.error("Error creating transport voucher:", voucherError);
            }
        }

        return NextResponse.json({
            success: true,
            message: isDraft ? "Log sheet saved successfully" : "Log sheet finalized and transport voucher created",
            tourId,
            driverExpenseUSD: totalTransportCostUSD,
        });
    } catch (error) {
        console.error("Server error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
