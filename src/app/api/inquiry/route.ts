import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { publicInquirySchema } from "@/lib/validations/inquiry";
import { generateBaseReferenceNumber } from "@/lib/utils/reference-generator";
import { sendInquiryNotification } from "@/lib/email";

// Strip HTML tags and trim to prevent stored XSS
function sanitize(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/<[^>]*>/g, "").trim() || null;
}

// Create a Supabase client for public submissions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const result = publicInquirySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      );
    }

    // Generate Reference Number
    const country = result.data.country || "Unknown";
    const baseRef = generateBaseReferenceNumber(country);

    // Check for existing references to determine suffix
    const { data: existingRefs, error: searchError } = await supabaseAdmin
      .from("inquiries")
      .select("inquiry_number")
      .ilike("inquiry_number", `${baseRef}%`);

    if (searchError) {
      console.error("Error checking references:", searchError);
      throw new Error("Failed to generate reference number");
    }

    let finalRef = baseRef;
    if (existingRefs && existingRefs.length > 0) {
      // Find the highest suffix
      let maxSuffix = 0;
      let hasExactMatch = false;

      existingRefs.forEach((row) => {
        if (row.inquiry_number === baseRef) {
          hasExactMatch = true;
        } else {
          const parts = row.inquiry_number.split("-");
          if (parts.length > 1) {
            const suffix = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(suffix) && suffix > maxSuffix) {
              maxSuffix = suffix;
            }
          }
        }
      });

      if (hasExactMatch || maxSuffix > 0) {
        finalRef = `${baseRef}-${maxSuffix + 1}`;
      }
    }

    // Insert inquiry
    const { data: inquiry, error } = await supabaseAdmin
      .from("inquiries")
      .insert({
        first_name: sanitize(result.data.first_name),
        last_name: sanitize(result.data.last_name),
        client_name: sanitize(`${result.data.first_name || ""} ${result.data.last_name || ""}`.trim()),
        passport_no: sanitize(result.data.passport_no),
        contact_number: sanitize(result.data.contact_number),
        client_email: result.data.client_email || null,
        agent_name: sanitize(result.data.agent_name),
        agent_email: result.data.agent_email || null,
        agent_company: sanitize(result.data.agent_company),
        is_tour_agent: result.data.is_tour_agent || false,
        country: sanitize(result.data.country),
        arriving_date: result.data.arriving_date,
        arrival_flight_no: result.data.arrival_flight_no || null,
        arrival_time: result.data.arrival_time || null,
        departure_date: result.data.departure_date,
        departure_flight_no: result.data.departure_flight_no || null,
        departure_time: result.data.departure_time || null,
        no_of_pax: result.data.no_of_pax,
        no_of_children: result.data.no_of_children,
        hotel_type: result.data.hotel_type,
        room_category: result.data.room_category,
        meal_plan: result.data.meal_plan,
        mixed_mode: result.data.mixed_mode || false,
        rooms_dbl: result.data.rooms_dbl,
        rooms_sgl: result.data.rooms_sgl,
        rooms_tpl: result.data.rooms_tpl,
        rooms_qtpl: result.data.rooms_qtpl,
        activities: result.data.activities,
        client_desires: sanitize(result.data.client_desires),
        status: "new",
        priority: "medium",
        inquiry_number: finalRef, // Use generated number
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send email notification (async)
    // Use agent email if available, otherwise client email
    const notificationData = {
      ...inquiry,
      primary_email: inquiry.agent_email || inquiry.client_email
    };

    sendInquiryNotification(notificationData).catch((err) => {
      console.error("Background email notification failed:", err);
    });

    return NextResponse.json(
      {
        success: true,
        message: "Inquiry submitted successfully",
        inquiry_number: inquiry.inquiry_number
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
