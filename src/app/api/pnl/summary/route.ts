import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const INCOME_STATUSES = ["confirmed", "sent", "paid", "overdue"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const normalizeReference = (reference?: string | null) => (reference || "").trim().toLowerCase();

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
        // Debug: Check all tours first
        const { data: allTours, error: allToursError } = await supabase
            .from("tours")
            .select("id, status, client_name")
            .order("end_date", { ascending: false });

        console.log("DEBUG: All tours in database:", allTours?.length || 0);
        if (allTours) {
            const statusCounts = allTours.reduce((acc: any, t: any) => {
                acc[t.status] = (acc[t.status] || 0) + 1;
                return acc;
            }, {});
            console.log("DEBUG: Tour status breakdown:", statusCounts);
        }

        // Base the summary on all tours so dashboard records are not hidden by status.
        let tourQuery = supabase
            .from("tours")
            .select("id, itinerary_id, client_name, start_date, end_date, status, log_sheet_finalized, log_sheet_data")
            .order("end_date", { ascending: false });

        if (startDate) {
            tourQuery = tourQuery.gte("end_date", startDate.toISOString().split("T")[0]);
        }

        const { data: tours, error: tourError } = await tourQuery;

        if (tourError) {
            console.error("Error fetching tours:", tourError);
        }

        console.log("DEBUG: Tours fetched:", tours?.length || 0, "tours");
        if (tours?.length === 0) {
            console.log("DEBUG: No tours found for range:", range);
        }

        const startDateStr = startDate ? startDate.toISOString().split("T")[0] : null;

        let invoiceQuery = supabase
            .from("customer_invoices")
            .select("id, total_amount, tour_id, tour_reference, invoice_date, status")
            .in("status", INCOME_STATUSES as any);

        if (startDateStr) {
            invoiceQuery = invoiceQuery.gte("invoice_date", startDateStr);
        }

        const { data: invoices, error: invoiceError } = await invoiceQuery;

        if (invoiceError) {
            console.error("Error fetching invoices:", invoiceError);
        }

        let voucherQuery = supabase
            .from("payment_vouchers")
            .select("id, total_usd, payee_type, tour_id, tour_reference, voucher_category, voucher_date")
            .neq("voucher_category", "admin");

        if (startDateStr) {
            voucherQuery = voucherQuery.gte("voucher_date", startDateStr);
        }

        const { data: vouchers, error: voucherError } = await voucherQuery;

        if (voucherError) {
            console.error("Error fetching vouchers:", voucherError);
        }

        let costingQuery = supabase
            .from("tour_costing_sheets")
            .select("id, itinerary_id, per_person_usd, total_usd, status, updated_at")
            .order("updated_at", { ascending: false });

        if (startDateStr) {
            costingQuery = costingQuery.gte("updated_at", `${startDateStr}T00:00:00Z`);
        }

        const { data: costings, error: costingError } = await costingQuery;
        if (costingError) {
            console.error("Error fetching costing sheets:", costingError);
        }

        // Group by tour and include every tour so the dashboard doesn't hide zero-income items.
        const tourMap = new Map<
            string,
            {
                tour_id: string;
                tour_reference: string;
                income: number;
                hotel: number;
                driver: number;
                misc: number;
                invoice_count: number;
                voucher_count: number;
            }
        >();
        const referenceToKey = new Map<string, string>();

        const resolveKey = (tourId: string | null | undefined, tourReference: string | null | undefined, fallbackId: string) => {
            const normalizedReference = normalizeReference(tourReference);

            if (tourId && tourMap.has(tourId)) return tourId;
            if (normalizedReference && referenceToKey.has(normalizedReference)) {
                return referenceToKey.get(normalizedReference)!;
            }
            if (tourId) {
                if (normalizedReference) {
                    referenceToKey.set(normalizedReference, tourId);
                }
                return tourId;
            }
            if (normalizedReference) {
                const refKey = `ref:${normalizedReference}`;
                referenceToKey.set(normalizedReference, refKey);
                return refKey;
            }
            return `orphan:${fallbackId}`;
        };



        (tours || []).forEach((tour) => {
            const logSheetData = (tour as any).log_sheet_data;
            const isLogSheetFinalized = (tour as any).log_sheet_finalized;
            // Compute driver expenses directly from finalized log sheet (ground truth)
            let driverFromLogSheet = 0;
            if (logSheetData?.totalExpenses) {
                driverFromLogSheet = Math.round((logSheetData.totalExpenses / 300) * 100) / 100;
            }

            tourMap.set(tour.id, {
                tour_id: tour.id,
                tour_reference: tour.client_name || "Unknown",
                income: 0,
                hotel: 0,
                driver: driverFromLogSheet,
                misc: 0,
                invoice_count: 0,
                voucher_count: 0,
            });

            const normalizedReference = normalizeReference(tour.client_name);
            if (normalizedReference) {
                referenceToKey.set(normalizedReference, tour.id);
            }
        });

        const itineraryToTour = new Map<string, { id: string; reference_number?: string | null; status?: string | null }>();
        (tours || []).forEach((tour) => {
            if (tour.itinerary_id) {
                itineraryToTour.set(tour.itinerary_id, {
                    id: tour.id,
                    reference_number: tour.client_name,
                    status: tour.status,
                });
            }
        });

        const itineraryIds = Array.from(new Set((costings || []).map((c) => c.itinerary_id).filter(Boolean)));
        const itineraryReferenceMap = new Map<string, string>();

        if (itineraryIds.length) {
            const { data: itineraries } = await supabase
                .from("itineraries")
                .select("id, inquiry_id, group_inquiry_id")
                .in("id", itineraryIds as string[]);

            const inquiryIds = Array.from(new Set((itineraries || []).map((it) => it.inquiry_id).filter(Boolean)));
            const groupInquiryIds = Array.from(new Set((itineraries || []).map((it) => it.group_inquiry_id).filter(Boolean)));

            const { data: inquiries } = inquiryIds.length
                ? await supabase.from("inquiries").select("id, inquiry_number").in("id", inquiryIds as string[])
                : { data: [] as any[] };

            const { data: groupInquiries } = groupInquiryIds.length
                ? await supabase.from("group_inquiries").select("id, inquiry_number").in("id", groupInquiryIds as string[])
                : { data: [] as any[] };

            const inquiryNumberById = new Map<string, string>();
            (inquiries || []).forEach((inq: any) => {
                if (inq.id && inq.inquiry_number) inquiryNumberById.set(inq.id, inq.inquiry_number);
            });
            (groupInquiries || []).forEach((inq: any) => {
                if (inq.id && inq.inquiry_number) inquiryNumberById.set(inq.id, inq.inquiry_number);
            });

            (itineraries || []).forEach((it: any) => {
                const ref = inquiryNumberById.get(it.inquiry_id) || inquiryNumberById.get(it.group_inquiry_id);
                if (it.id && ref) {
                    itineraryReferenceMap.set(it.id, ref);
                }
            });
        }

        // Override income from costing sheets so P&L income follows costing as requested.
        (costings || []).forEach((costing: any) => {
            const mappedTour = costing.itinerary_id ? itineraryToTour.get(costing.itinerary_id) : null;
            const derivedReference = itineraryReferenceMap.get(costing.itinerary_id) || mappedTour?.reference_number || null;
            const key = resolveKey(mappedTour?.id || null, derivedReference, `costing:${costing.id}`);

            const existing = tourMap.get(key) || {
                tour_id: mappedTour?.id || key,
                tour_reference: derivedReference || "Unknown",
                income: 0,
                hotel: 0,
                driver: 0,
                misc: 0,
                invoice_count: 0,
                voucher_count: 0,
            };

            const costingIncome = Number(costing.total_usd || 0) || Number(costing.per_person_usd || 0) || 0;
            if (costingIncome > 0) {
                existing.income = costingIncome;
            }
            if ((!existing.tour_reference || existing.tour_reference === "Unknown") && derivedReference) {
                existing.tour_reference = derivedReference;
            }

            tourMap.set(key, existing);

            const normalizedReference = normalizeReference(derivedReference);
            if (normalizedReference) {
                referenceToKey.set(normalizedReference, key);
            }
        });

        // Aggregate invoice income by tour
        invoices?.forEach((inv) => {
            const normalizedRef = normalizeReference(inv.tour_reference);
            if (!inv.tour_id && (!normalizedRef || normalizedRef === 'unknown')) return;

            const key = resolveKey(inv.tour_id, inv.tour_reference, inv.id);
            const existing = tourMap.get(key) || {
                tour_id: inv.tour_id || key,
                tour_reference: inv.tour_reference || "Unknown",
                income: 0,
                hotel: 0,
                driver: 0,
                misc: 0,
                invoice_count: 0,
                voucher_count: 0,
            };
            // Costing total_usd is the authoritative income. Use invoice income only when costing income is unavailable.
            if ((existing.income || 0) === 0) {
                existing.income += inv.total_amount || 0;
            }
            existing.invoice_count += 1;
            tourMap.set(key, existing);
        });

        // Aggregate expenses by tour
        vouchers?.forEach((v) => {
            const normalizedRef = normalizeReference(v.tour_reference);
            if (!v.tour_id && (!normalizedRef || normalizedRef === 'unknown')) return;

            const key = resolveKey(v.tour_id, v.tour_reference, v.id);
            const existing = tourMap.get(key) || {
                tour_id: v.tour_id || key,
                tour_reference: v.tour_reference || "Unknown",
                income: 0,
                hotel: 0,
                driver: 0,
                misc: 0,
                invoice_count: 0,
                voucher_count: 0,
            };
            const amount = v.total_usd || 0;
            switch (v.payee_type) {
                case "Hotel":
                    existing.hotel += amount;
                    break;
                case "Driver":
                case "Staff":
                    // If we already have driver expenses from the log sheet, ignore the auto-generated transport voucher
                    // to prevent double counting. The log sheet is the most direct source.
                    const tourHasLogSheet = tours?.find(t => t.id === v.tour_id)?.log_sheet_data;
                    if (v.voucher_category === "transport" && tourHasLogSheet) {
                        // Skip this voucher as it's represented by driverFromLogSheet
                        break;
                    }
                    existing.driver += amount;
                    break;
                case "Miscellaneous":
                case "Supplier":
                case "Other":
                    existing.misc += amount;
                    break;
            }
            existing.voucher_count += 1;
            tourMap.set(key, existing);
        });

        // Fallback: merge saved pnl_records in case historical data is not fully linked to tours/invoices/vouchers.
        let pnlRecordQuery = supabase
            .from("pnl_records")
            .select("id, tour_id, tour_reference, hotel_expenses, driver_expenses, staff_payments, supplier_expenses, other_expenses, total_income, total_expenses, net_profit, period_end, updated_at")
            .order("updated_at", { ascending: false });

        if (startDateStr) {
            pnlRecordQuery = pnlRecordQuery.gte("updated_at", `${startDateStr}T00:00:00Z`);
        }

        const { data: pnlRecords, error: pnlRecordsError } = await pnlRecordQuery;
        if (pnlRecordsError) {
            console.error("Error fetching pnl_records fallback data:", pnlRecordsError);
        }

        (pnlRecords || []).forEach((row) => {
            const normalizedRef = normalizeReference(row.tour_reference);
            if (!row.tour_id && (!normalizedRef || normalizedRef === 'unknown')) return;

            const key = resolveKey(row.tour_id, row.tour_reference, row.id);
            const hotel = Number(row.hotel_expenses || 0);
            const driver = Number(row.driver_expenses || 0) + Number(row.staff_payments || 0);
            const misc = Number(row.supplier_expenses || 0) + Number(row.other_expenses || 0);
            const income = Number(row.total_income || 0);
            const expenses = Number(row.total_expenses || (hotel + driver + misc));

            const existing = tourMap.get(key);
            if (!existing) {
                tourMap.set(key, {
                    tour_id: row.tour_id || key,
                    tour_reference: row.tour_reference || "Unknown",
                    income,
                    hotel,
                    driver,
                    misc,
                    invoice_count: 0,
                    voucher_count: 0,
                });

                const normalizedReference = normalizeReference(row.tour_reference);
                if (normalizedReference) {
                    referenceToKey.set(normalizedReference, key);
                }
                return;
            }

            const existingTotal = existing.income + existing.hotel + existing.driver + existing.misc;
            const fallbackTotal = income + expenses;
            if (existingTotal === 0 && fallbackTotal > 0) {
                existing.income = income;
                existing.hotel = hotel;
                existing.driver = driver;
                existing.misc = misc;
                tourMap.set(key, existing);
            }
        });

        // Convert map to records array - include all tours even when income is missing.
        const rawRecords = Array.from(tourMap.values()).map((t) => ({
            id: t.tour_id,
            tour_id: t.tour_id,
            tour_reference: t.tour_reference,
            income: t.income,
            hotel_expenses: t.hotel,
            driver_expenses: t.driver,
            misc_expenses: t.misc,
            total_expenses: t.hotel + t.driver + t.misc,
            net_profit: t.income - (t.hotel + t.driver + t.misc),
            invoice_count: t.invoice_count,
            voucher_count: t.voucher_count,
            has_detail: UUID_RE.test(t.tour_id),
            detail_key: UUID_RE.test(t.tour_id)
                ? t.tour_id
                : (t.tour_reference && t.tour_reference !== "Unknown" ? `ref:${t.tour_reference}` : null),
        }));

        // Final dedupe by reference to avoid duplicate rows like the same tour appearing twice.
        const dedupedByReference = new Map<string, (typeof rawRecords)[number]>();

        rawRecords.forEach((record) => {
            const normalizedRef = normalizeReference(record.tour_reference);
            const referenceKey = (normalizedRef && normalizedRef !== "unknown") ? normalizedRef : record.tour_id;
            const existing = dedupedByReference.get(referenceKey);

            if (!existing) {
                dedupedByReference.set(referenceKey, record);
                return;
            }

            const existingWeight = (existing.has_detail ? 100 : 0) + ((existing.invoice_count || 0) * 10) + (existing.voucher_count || 0);
            const candidateWeight = (record.has_detail ? 100 : 0) + ((record.invoice_count || 0) * 10) + (record.voucher_count || 0);
            const primary = candidateWeight > existingWeight ? record : existing;
            const secondary = primary === existing ? record : existing;

            if ((primary.income || 0) === 0 && (secondary.income || 0) > 0) {
                primary.income = secondary.income;
            }
            if ((primary.hotel_expenses || 0) === 0 && (secondary.hotel_expenses || 0) > 0) {
                primary.hotel_expenses = secondary.hotel_expenses;
            }
            if ((primary.driver_expenses || 0) === 0 && (secondary.driver_expenses || 0) > 0) {
                primary.driver_expenses = secondary.driver_expenses;
            }
            if ((primary.misc_expenses || 0) === 0 && (secondary.misc_expenses || 0) > 0) {
                primary.misc_expenses = secondary.misc_expenses;
            }

            primary.total_expenses = (primary.hotel_expenses || 0) + (primary.driver_expenses || 0) + (primary.misc_expenses || 0);
            primary.net_profit = (primary.income || 0) - (primary.total_expenses || 0);
            primary.invoice_count = Math.max(primary.invoice_count || 0, secondary.invoice_count || 0);
            primary.voucher_count = Math.max(primary.voucher_count || 0, secondary.voucher_count || 0);
            primary.has_detail = Boolean(primary.has_detail || secondary.has_detail);
            primary.detail_key = primary.has_detail
                ? primary.tour_id
                : (primary.detail_key || secondary.detail_key || null);

            dedupedByReference.set(referenceKey, primary);
        });

        const records = Array.from(dedupedByReference.values())
            .filter((record) => {
                // Exclude 'Unknown' entries with no income (orphaned expenses)
                if (record.tour_reference === "Unknown") return false;
                // Exclude entirely empty records (no financial activity)
                if ((record.income || 0) === 0 && (record.total_expenses || 0) === 0) return false;
                return true;
            });

        // Calculate totals from final merged records.
        const totalIncome = records.reduce((sum, record) => sum + (record.income || 0), 0);
        const hotelExpenses = records.reduce((sum, record) => sum + (record.hotel_expenses || 0), 0);
        const driverExpenses = records.reduce((sum, record) => sum + (record.driver_expenses || 0), 0);
        const miscExpenses = records.reduce((sum, record) => sum + (record.misc_expenses || 0), 0);
        const totalTourExpenses = records.reduce((sum, record) => sum + (record.total_expenses || 0), 0);
        const netProfit = totalIncome - totalTourExpenses;
        const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

        // Sort by net profit descending
        records.sort((a, b) => b.net_profit - a.net_profit);

        console.log("DEBUG: Final PNL records:", records.length, "| Total Income:", totalIncome, "| Total Expenses:", totalTourExpenses);

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
                tourStatusBreakdown: allTours ? allTours.reduce((acc: any, t: any) => {
                    acc[t.status] = (acc[t.status] || 0) + 1;
                    return acc;
                }, {}) : {},
            },
            records,
        });
    } catch (err) {
        console.error("Error calculating PNL summary:", err);
        return NextResponse.json({ error: "Failed to calculate PNL summary" }, { status: 500 });
    }
}
