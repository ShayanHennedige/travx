import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hotelRatesSubmissionSchema } from "@/lib/validations/hotel-rates";
import nodeCrypto from "crypto";

// POST - Submit hotel rates
export async function POST(request: Request) {
    const supabase = await createClient();

    try {
        const body = await request.json();

        // Validate the submission
        const result = hotelRatesSubmissionSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.flatten() },
                { status: 400 }
            );
        }

        const {
            token,
            hotel_name,
            hotel_location,
            hotel_contact,
            hotel_email,
            room_categories
        } = result.data;

        let rateRequest;

        // If we have a token, look up the existing request
        if (token) {
            const { data, error: requestError } = await supabase
                .from("hotel_rate_requests")
                .select("*")
                .eq("token", token)
                .single();

            if (requestError || !data) {
                // If token invalid, proceed as new request
                console.warn("Invalid token provided, creating new request instead");
            } else if (new Date(data.expires_at) < new Date()) {
                return NextResponse.json(
                    { error: "This rate request has expired" },
                    { status: 401 }
                );
            } else if (data.status === "submitted") {
                return NextResponse.json(
                    { error: "Rates have already been submitted" },
                    { status: 400 }
                );
            } else {
                rateRequest = data;
            }
        }

        // If no existing request found (or no token), create a new one
        if (!rateRequest) {
            const CryptoToken = nodeCrypto.randomBytes(32).toString("hex");
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // Default 30 days

            const { data, error } = await supabase
                .from("hotel_rate_requests")
                .insert({
                    hotel_name: hotel_name || "Unknown Hotel",
                    hotel_email: hotel_email,
                    hotel_contact: hotel_contact || null,
                    hotel_address: hotel_location || null,
                    requested_by: "Public Link",
                    token: CryptoToken,
                    expires_at: expiresAt.toISOString(),
                    status: "submitted", // Mark as submitted immediately
                    submitted_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) {
                console.error("Error creating rate request:", error);
                return NextResponse.json({ error: "Failed to create rate request" }, { status: 500 });
            }
            rateRequest = data;
        } else {
            // Update existing request status
            const { error: updateError } = await supabase
                .from("hotel_rate_requests")
                .update({
                    status: "submitted",
                    submitted_at: new Date().toISOString(),
                    hotel_name: hotel_name || rateRequest.hotel_name,
                    hotel_address: hotel_location || rateRequest.hotel_address,
                    hotel_contact: hotel_contact || rateRequest.hotel_contact,
                    hotel_email: hotel_email || rateRequest.hotel_email,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", rateRequest.id);

            if (updateError) {
                console.error("Error updating request:", updateError);
            }
        }

        // Prepare rates for bulk insert
        const ratesToInsert: any[] = [];

        for (const category of room_categories) {
            for (const plan of category.rate_plans) {
                ratesToInsert.push({
                    request_id: rateRequest.id,
                    room_category: category.room_category,
                    meal_plan: plan.meal_plan,
                    valid_from: plan.valid_from,
                    valid_to: plan.valid_to,
                    currency: plan.currency,
                    rate_sgl: plan.rate_sgl || null,
                    rate_dbl: plan.rate_dbl || null,
                    rate_tpl: plan.rate_tpl || null,
                    rate_child: plan.rate_child || null,
                    rate_extra_adult: plan.rate_extra_adult || null,
                });
            }
        }

        // Insert all rates
        const { error: insertError } = await supabase
            .from("hotel_rates")
            .insert(ratesToInsert);

        if (insertError) {
            console.error("Error inserting rates:", insertError);
            return NextResponse.json(
                { error: "Failed to save rates" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Rates submitted successfully",
            rates_count: ratesToInsert.length,
        });
    } catch (error: any) {
        console.error("Error submitting rates:", error);
        return NextResponse.json(
            { error: error.message || "Failed to submit rates" },
            { status: 500 }
        );
    }
}

// GET - Get submitted rates for a request (admin use)
export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const requestId = searchParams.get("request_id");

    if (!requestId) {
        // List all rate requests
        const { data: requests, error } = await supabase
            .from("hotel_rate_requests")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ requests });
    }

    // Get specific request with its rates
    const { data: rateRequest, error: requestError } = await supabase
        .from("hotel_rate_requests")
        .select("*")
        .eq("id", requestId)
        .single();

    if (requestError) {
        return NextResponse.json({ error: requestError.message }, { status: 404 });
    }

    const { data: rates, error: ratesError } = await supabase
        .from("hotel_rates")
        .select("*")
        .eq("request_id", requestId)
        .order("room_category", { ascending: true });

    if (ratesError) {
        return NextResponse.json({ error: ratesError.message }, { status: 500 });
    }

    return NextResponse.json({
        request: rateRequest,
        rates: rates,
    });
}
