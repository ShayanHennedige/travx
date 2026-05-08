import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface LookupItem {
    hotel_name: string;
    room_category?: string;
    meal_plan?: string;
    check_date?: string;
}

interface MatchedRate {
    hotel_name: string;
    room_category: string;
    meal_plan: string;
    rate_sgl: number | null;
    rate_dbl: number | null;
    rate_tpl: number | null;
    rate_child: number | null;
    rate_extra_adult: number | null;
    currency: string;
    valid_from: string;
    valid_to: string;
}

/**
 * Normalize hotel name for fuzzy matching:
 * - Lowercase
 * - Strip common suffixes like "(5 Star)", "(Boutique)", star ratings
 * - Trim whitespace
 */
function normalizeHotelName(name: string): string {
    return name
        .replace(/\s*\(?\d+\s*star\)?/gi, "")
        .replace(/\s*\(?(boutique|villa|resort|budget)\)?/gi, "")
        .trim();
}

/**
 * Normalize meal plan abbreviations to match DB values.
 * Handles cases like "Bed & Breakfast (BB)" -> "BB" or "HB" -> "HB"
 */
function normalizeMealPlan(plan: string): string {
    const upper = plan.toUpperCase().trim();
    // Extract abbreviation from parentheses if present
    const match = upper.match(/\b(BB|HB|FB|AI|RO)\b/);
    return match ? match[1] : upper;
}

// POST - Batch lookup hotel rates
export async function POST(request: Request) {
    const supabase = await createClient();

    try {
        const body = await request.json();
        const { lookups } = body as { lookups: LookupItem[] };

        if (!lookups || !Array.isArray(lookups) || lookups.length === 0) {
            return NextResponse.json(
                { error: "lookups array is required" },
                { status: 400 }
            );
        }

        // Cap at 50 lookups to prevent abuse
        if (lookups.length > 50) {
            return NextResponse.json(
                { error: "Maximum 50 lookups per request" },
                { status: 400 }
            );
        }

        const results: Array<{
            index: number;
            found: boolean;
            rate: MatchedRate | null;
        }> = [];

        // Process each lookup
        for (let i = 0; i < lookups.length; i++) {
            const lookup = lookups[i];

            if (!lookup.hotel_name || lookup.hotel_name.trim().length === 0) {
                results.push({ index: i, found: false, rate: null });
                continue;
            }

            const normalizedName = normalizeHotelName(lookup.hotel_name);
            console.log(`[RATE LOOKUP ${i}] Original: "${lookup.hotel_name}" -> Normalized: "${normalizedName}"`);
            console.log(`[RATE LOOKUP ${i}] room_category: "${lookup.room_category}", meal_plan: "${lookup.meal_plan}", check_date: "${lookup.check_date}"`);

            // Helper to build a base query with hotel name, room category, meal plan filters
            const buildBaseQuery = () => {
                let q = supabase
                    .from("hotel_rates")
                    .select(`
                        id,
                        room_category,
                        meal_plan,
                        valid_from,
                        valid_to,
                        currency,
                        rate_sgl,
                        rate_dbl,
                        rate_tpl,
                        rate_child,
                        rate_extra_adult,
                        created_at,
                        request_id,
                        hotel_rate_requests!inner (
                            id,
                            hotel_name,
                            status
                        )
                    `)
                    .ilike("hotel_rate_requests.hotel_name", `%${normalizedName}%`)
                    .eq("hotel_rate_requests.status", "submitted");

                if (lookup.room_category) {
                    q = q.ilike("room_category", `%${lookup.room_category}%`);
                }
                if (lookup.meal_plan) {
                    const normalizedMeal = normalizeMealPlan(lookup.meal_plan);
                    q = q.eq("meal_plan", normalizedMeal);
                }
                return q;
            };

            // Try 1: With date filter (exact match)
            let data: any[] | null = null;
            let error: any = null;

            if (lookup.check_date) {
                console.log(`[RATE LOOKUP ${i}] Try 1: With date filter (valid_from <= "${lookup.check_date}" AND valid_to >= "${lookup.check_date}")`);
                const dateQuery = buildBaseQuery()
                    .lte("valid_from", lookup.check_date)
                    .gte("valid_to", lookup.check_date)
                    .order("created_at", { ascending: false })
                    .limit(1);

                const result = await dateQuery;
                data = result.data;
                error = result.error;
                console.log(`[RATE LOOKUP ${i}] Try 1 results: ${data?.length || 0} rows found`);
            }

            // Try 2: Without date filter (fallback - get most recent rate)
            if ((!data || data.length === 0) && !error) {
                console.log(`[RATE LOOKUP ${i}] Try 2: Without date filter (fallback)`);
                const fallbackQuery = buildBaseQuery()
                    .order("created_at", { ascending: false })
                    .limit(1);

                const result = await fallbackQuery;
                data = result.data;
                error = result.error;
                console.log(`[RATE LOOKUP ${i}] Try 2 results: ${data?.length || 0} rows found`);
            }

            if (error) {
                console.error(`[RATE LOOKUP ${i}] ERROR:`, error);
                results.push({ index: i, found: false, rate: null });
                continue;
            }

            console.log(`[RATE LOOKUP ${i}] Final: ${data?.length || 0} rows`, data?.length ? JSON.stringify(data[0], null, 2) : "");

            if (data && data.length > 0) {
                const rate = data[0];
                const hotelRequest = rate.hotel_rate_requests as any;
                results.push({
                    index: i,
                    found: true,
                    rate: {
                        hotel_name: hotelRequest?.hotel_name || lookup.hotel_name,
                        room_category: rate.room_category,
                        meal_plan: rate.meal_plan,
                        rate_sgl: rate.rate_sgl,
                        rate_dbl: rate.rate_dbl,
                        rate_tpl: rate.rate_tpl,
                        rate_child: rate.rate_child,
                        rate_extra_adult: rate.rate_extra_adult,
                        currency: rate.currency,
                        valid_from: rate.valid_from,
                        valid_to: rate.valid_to,
                    },
                });
            } else {
                results.push({ index: i, found: false, rate: null });
            }
        }

        return NextResponse.json({ results });
    } catch (error: any) {
        console.error("Error in batch lookup:", error);
        return NextResponse.json(
            { error: error.message || "Failed to lookup rates" },
            { status: 500 }
        );
    }
}
