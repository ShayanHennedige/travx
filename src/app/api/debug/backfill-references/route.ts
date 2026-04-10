import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateBaseReferenceNumber } from "@/lib/utils/reference-generator";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
    try {
        // 1. Fetch inquiries with missing inquiry_number
        const { data: inquiries, error } = await supabaseAdmin
            .from("inquiries")
            .select("id, country, created_at, inquiry_number")
            .is("inquiry_number", null);

        if (error) throw error;

        if (!inquiries || inquiries.length === 0) {
            return NextResponse.json({ message: "No inquiries to backfill" });
        }

        const updates = [];

        // 2. Process each inquiry
        for (const inquiry of inquiries) {
            const country = inquiry.country || "Unknown";
            const createdAt = new Date(inquiry.created_at);

            const baseRef = generateBaseReferenceNumber(country, createdAt);

            // Check for existing to determine suffix
            const { data: existing } = await supabaseAdmin
                .from("inquiries")
                .select("inquiry_number")
                .ilike("inquiry_number", `${baseRef}%`);

            let finalRef = baseRef;
            if (existing && existing.length > 0) {
                let maxSuffix = 0;
                existing.forEach((row) => {
                    if (row.inquiry_number === baseRef) return;
                    const parts = row.inquiry_number.split("-");
                    if (parts.length > 1) {
                        const s = parseInt(parts[parts.length - 1]);
                        if (!isNaN(s) && s > maxSuffix) maxSuffix = s;
                    }
                });
                // Avoid collision if this ID is already the cause (unlikely in backfill loop)
                finalRef = `${baseRef}-${maxSuffix + 1}`;
            }

            // Update
            // Note: If RLS prevents update, this will log error.
            const { error: updateError } = await supabaseAdmin
                .from("inquiries")
                .update({ inquiry_number: finalRef })
                .eq("id", inquiry.id);

            if (updateError) {
                console.error(`Failed to update ${inquiry.id}:`, updateError);
                updates.push({ id: inquiry.id, error: updateError.message });
            } else {
                updates.push({ id: inquiry.id, old: inquiry.inquiry_number, new: finalRef });
            }
        }

        return NextResponse.json({
            success: true,
            count: updates.length,
            updates
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
