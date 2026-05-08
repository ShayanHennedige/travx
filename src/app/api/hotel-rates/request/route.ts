import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

// POST - Create a new rate request to send to hotel
export async function POST(request: Request) {
    const supabase = await createClient();

    try {
        const body = await request.json();
        const {
            hotel_name,
            hotel_email,
            hotel_contact,
            hotel_location,
            requested_by,
            inquiry_id,
            group_inquiry_id,
            check_in_date,
            check_out_date,
            notes,
            expires_in_days = 30,
        } = body;

        if (!hotel_name || !hotel_email) {
            return NextResponse.json(
                { error: "Hotel name and email are required" },
                { status: 400 }
            );
        }

        // Generate unique token
        const token = crypto.randomBytes(32).toString("hex");

        // Calculate expiry date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expires_in_days);

        // Insert the rate request
        const { data: rateRequest, error } = await supabase
            .from("hotel_rate_requests")
            .insert({
                hotel_name,
                hotel_email,
                hotel_contact: hotel_contact || null,
                hotel_address: hotel_location || null,
                requested_by: requested_by || "TravX System",
                inquiry_id: inquiry_id || null,
                group_inquiry_id: group_inquiry_id || null,
                check_in_date: check_in_date || null,
                check_out_date: check_out_date || null,
                notes: notes || null,
                token,
                expires_at: expiresAt.toISOString(),
                status: "pending",
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating rate request:", error);
            return NextResponse.json(
                { error: "Failed to create rate request" },
                { status: 500 }
            );
        }

        // Generate the form URL
        const formUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/hotel-rates?token=${token}`;

        return NextResponse.json({
            success: true,
            request: rateRequest,
            form_url: formUrl,
            token,
        });
    } catch (error: any) {
        console.error("Error creating rate request:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create rate request" },
            { status: 500 }
        );
    }
}
