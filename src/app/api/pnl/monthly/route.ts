import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, format, parseISO, subMonths } from "date-fns";

// GET - Get monthly P&L summary for completed tours
export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get month/year from params, default to current month
    const monthParam = searchParams.get("month"); // Format: YYYY-MM
    const monthsBack = parseInt(searchParams.get("months_back") || "6"); // How many months to fetch

    try {
        // If specific month requested
        if (monthParam) {
            const targetDate = parseISO(`${monthParam}-01`);
            const monthStart = startOfMonth(targetDate);
            const monthEnd = endOfMonth(targetDate);

            const monthData = await getMonthlyPnl(supabase, monthStart, monthEnd);

            return NextResponse.json({
                month: format(monthStart, "MMMM yyyy"),
                monthKey: format(monthStart, "yyyy-MM"),
                ...monthData
            });
        }

        // Otherwise, fetch summary for last N months
        const monthlyData = [];
        const now = new Date();

        for (let i = 0; i < monthsBack; i++) {
            const targetDate = subMonths(now, i);
            const monthStart = startOfMonth(targetDate);
            const monthEnd = endOfMonth(targetDate);

            const data = await getMonthlyPnl(supabase, monthStart, monthEnd);

            monthlyData.push({
                month: format(monthStart, "MMMM yyyy"),
                monthKey: format(monthStart, "yyyy-MM"),
                ...data
            });
        }

        return NextResponse.json({ months: monthlyData });

    } catch (err) {
        console.error("Error calculating monthly P&L:", err);
        return NextResponse.json({ error: "Failed to calculate monthly P&L" }, { status: 500 });
    }
}

// Helper function to get P&L for a specific month
async function getMonthlyPnl(supabase: any, monthStart: Date, monthEnd: Date) {
    const startStr = monthStart.toISOString().split("T")[0];
    const endStr = monthEnd.toISOString().split("T")[0];

    // Get completed tours for this month (tours that ended within this month)
    const { data: tours } = await supabase
        .from("tours")
        .select("id, client_name, start_date, end_date, status")
        .or(`status.eq.completed,end_date.lt.${new Date().toISOString()}`)
        .gte("end_date", startStr)
        .lte("end_date", endStr);

    const tourIds = tours?.map((t: any) => t.id) || [];

    if (tourIds.length === 0) {
        return {
            tourCount: 0,
            totalIncome: 0,
            totalExpenses: 0,
            hotelExpenses: 0,
            driverExpenses: 0,
            vehicleCosts: 0,
            miscExpenses: 0,
            netProfit: 0,
            profitMargin: 0,
            tours: []
        };
    }

    // Get invoices for these tours
    const { data: invoices } = await supabase
        .from("customer_invoices")
        .select("tour_id, total_amount, status")
        .in("tour_id", tourIds)
        .in("status", ["confirmed", "paid"]);

    // Get vouchers for these tours
    const { data: vouchers } = await supabase
        .from("payment_vouchers")
        .select("tour_id, total_usd, payee_type")
        .in("tour_id", tourIds);

    // Calculate totals
    const totalIncome = invoices?.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0) || 0;

    const hotelExpenses = vouchers?.filter((v: any) => v.payee_type === "Hotel")
        .reduce((sum: number, v: any) => sum + (v.total_usd || 0), 0) || 0;

    const driverExpenses = vouchers?.filter((v: any) => v.payee_type === "Driver" || v.payee_type === "Staff")
        .reduce((sum: number, v: any) => sum + (v.total_usd || 0), 0) || 0;

    const miscExpenses = vouchers?.filter((v: any) =>
        v.payee_type === "Miscellaneous" || v.payee_type === "Supplier" || v.payee_type === "Other"
    ).reduce((sum: number, v: any) => sum + (v.total_usd || 0), 0) || 0;

    const totalExpenses = hotelExpenses + driverExpenses + miscExpenses;
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    // Build per-tour breakdown
    const tourBreakdown = tours?.map((tour: any) => {
        const tourInvoices = invoices?.filter((i: any) => i.tour_id === tour.id) || [];
        const tourVouchers = vouchers?.filter((v: any) => v.tour_id === tour.id) || [];

        const income = tourInvoices.reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0);
        const hotel = tourVouchers.filter((v: any) => v.payee_type === "Hotel")
            .reduce((sum: number, v: any) => sum + (v.total_usd || 0), 0);
        const driver = tourVouchers.filter((v: any) => v.payee_type === "Driver" || v.payee_type === "Staff")
            .reduce((sum: number, v: any) => sum + (v.total_usd || 0), 0);
        const misc = tourVouchers.filter((v: any) =>
            v.payee_type === "Miscellaneous" || v.payee_type === "Supplier" || v.payee_type === "Other"
        ).reduce((sum: number, v: any) => sum + (v.total_usd || 0), 0);
        const expenses = hotel + driver + misc;

        return {
            id: tour.id,
            clientName: tour.client_name,
            startDate: tour.start_date,
            endDate: tour.end_date,
            income,
            hotelExpenses: hotel,
            driverExpenses: driver,
            miscExpenses: misc,
            totalExpenses: expenses,
            netProfit: income - expenses
        };
    }) || [];

    return {
        tourCount: tours?.length || 0,
        totalIncome,
        totalExpenses,
        hotelExpenses,
        driverExpenses,
        vehicleCosts: 0, // Will be populated when actual km logging is implemented
        miscExpenses,
        netProfit,
        profitMargin,
        tours: tourBreakdown
    };
}
