import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
    const supabase = await createClient();
    const { tour_id } = await request.json();

    if (!tour_id) {
        return NextResponse.json({ error: "tour_id required" }, { status: 400 });
    }

    // Generate unique token
    const token = randomBytes(32).toString("base64url");

    // Set expiration (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Insert into feedback_tokens table
    const { data, error } = await supabase
        .from("feedback_tokens")
        .insert({
            token,
            tour_id,
            expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating feedback token:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Construct feedback URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const feedbackLink = `${baseUrl}/feedback?token=${token}`;

    return NextResponse.json({
        token,
        link: feedbackLink,
        expires_at: expiresAt.toISOString(),
    });
}
