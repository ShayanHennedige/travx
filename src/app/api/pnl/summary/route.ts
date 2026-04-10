import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Get aggregated PNL summary for dashboard
export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "all";

    // Calculate date range
    let startDate: Date | null = null;
    const now = new Date();

    switch (range) {
        case "month":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case "quarter":
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            break;
        case "year":
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        default:
            startDate = null;
    }

    try {
        // Get customer invoices (Income) - include confirmed and paid status
        let invoiceQuery = supabase
            .from("customer_invoices")
            .select("total_amount, tour_id, tour_reference, invoice_date, status")
            .in("status", ["confirmed", "paid"]);

        if (startDate) {
            invoiceQuery = invoiceQuery.gte("invoice_date", startDate.toISOString().split("T")[0]);
        }

        const { data: invoices, error: invoiceError } = await invoiceQuery;

        if (invoiceError) {
            console.error("Error fetching invoices:", invoiceError);
        }

        // Get payment vouchers (Expenses) - linked to tours
        // These are tour-specific expenses (Hotel, Driver, Miscellaneous)
        let voucherQuery = supabase
            .from("payment_vouchers")
            .select("total_usd, payee_type, tour_id, tour_reference, voucher_date")
            .not("tour_id", "is", null);

        if (startDate) {
            voucherQuery = voucherQuery.gte("voucher_date", startDate.toISOString().split("T")[0]);
        }

        const { data: vouchers, error: voucherError } = await voucherQuery;

        if (voucherError) {
            console.error("Error fetching vouchers:", voucherError);
        }

        // Calculate tour expense breakdown by category
        const hotelExpenses =
            vouchers
                ?.filter((v) => v.payee_type === "Hotel")
                .reduce((sum, v) => sum + (v.total_usd || 0), 0) || 0;

        const driverExpenses =
            vouchers
                ?.filter((v) => v.payee_type === "Driver" || v.payee_type === "Staff")
                .reduce((sum, v) => sum + (v.total_usd || 0), 0) || 0;

        const miscExpenses =
            vouchers
                ?.filter((v) => v.payee_type === "Miscellaneous" || v.payee_type === "Other" || v.payee_type === "Supplier")
                .reduce((sum, v) => sum + (v.total_usd || 0), 0) || 0;

        // Calculate totals
        const totalIncome = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
        const totalTourExpenses = hotelExpenses + driverExpenses + miscExpenses;
        const netProfit = totalIncome - totalTourExpenses;
        const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

        // Group by tour for records - only tours with actual data
        const tourMap = new Map<
            string,
            {
                tour_id: string;
                tour_reference: string;
                income: number;
                hotel: number;
                driver: number;
                misc: number;
            }
        >();

        // Aggregate invoice income by tour
        invoices?.forEach((inv) => {
            if (!inv.tour_id) return;
            const existing = tourMap.get(inv.tour_id) || {
                tour_id: inv.tour_id,
                tour_reference: inv.tour_reference || "Unknown",
                income: 0,
                hotel: 0,
                driver: 0,
                misc: 0,
            };
            existing.income += inv.total_amount || 0;
            tourMap.set(inv.tour_id, existing);
        });

        // Aggregate expenses by tour
        vouchers?.forEach((v) => {
            if (!v.tour_id) return;
            const existing = tourMap.get(v.tour_id) || {
                tour_id: v.tour_id,
                tour_reference: v.tour_reference || "Unknown",
                income: 0,
                hotel: 0,
                driver: 0,
                misc: 0,
            };
            const amount = v.total_usd || 0;
            switch (v.payee_type) {
                case "Hotel":
                    existing.hotel += amount;
                    break;
                case "Driver":
                case "Staff":
                    existing.driver += amount;
                    break;
                case "Miscellaneous":
                case "Supplier":
                case "Other":
                    existing.misc += amount;
                    break;
            }
            tourMap.set(v.tour_id, existing);
        });

        // Convert map to records array - only include tours with income OR expenses
        const records = Array.from(tourMap.values())
            .filter((t) => t.income > 0 || t.hotel > 0 || t.driver > 0 || t.misc > 0)
            .map((t) => ({
                id: t.tour_id,
                tour_id: t.tour_id,
                tour_reference: t.tour_reference,
                income: t.income,
                hotel_expenses: t.hotel,
                driver_expenses: t.driver,
                misc_expenses: t.misc,
                total_expenses: t.hotel + t.driver + t.misc,
                net_profit: t.income - (t.hotel + t.driver + t.misc),
                status: t.income > 0 ? "has_income" : "expenses_only",
            }));

        // Sort by net profit descending
        records.sort((a, b) => b.net_profit - a.net_profit);

        return NextResponse.json({
            summary: {
                totalIncome,
                totalExpenses: totalTourExpenses,
                netProfit,
                profitMargin,
                recordCount: records.length,
                expenseBreakdown: {
                    hotel: hotelExpenses,
                    driver: driverExpenses,
                    misc: miscExpenses,
                },
            },
            records,
        });
    } catch (err) {
        console.error("Error calculating PNL summary:", err);
        return NextResponse.json({ error: "Failed to calculate PNL summary" }, { status: 500 });
    }
}
