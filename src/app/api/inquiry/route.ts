import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { publicInquirySchema } from "@/lib/validations/inquiry";
import { generateBaseReferenceNumber } from "@/lib/utils/reference-generator";
import { sendInquiryNotification } from "@/lib/email";

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

    // Calculate number of nights from dates
    const arrivingDate = new Date(result.data.arriving_date);
    const departureDate = new Date(result.data.departure_date);
    const diffTime = departureDate.getTime() - arrivingDate.getTime();
    const no_of_nights = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Prepare insert payload
    const insertPayload = {
      first_name: result.data.first_name || null,
      last_name: result.data.last_name || null,
      client_name: `${result.data.first_name || ""} ${result.data.last_name || ""}`.trim() || null,
      passport_no: result.data.passport_no || null,
      contact_number: result.data.contact_number || null,
      client_email: result.data.client_email || null,
      agent_name: result.data.agent_name || null,
      agent_email: result.data.agent_email || null,
      agent_company: result.data.agent_company || null,
      arranged_by_agent: result.data.arranged_by_agent || false,
      inbound_flight_no: result.data.inbound_flight_no || null,
      inbound_arrival_date: result.data.inbound_arrival_date || null,
      inbound_arrival_time: result.data.inbound_arrival_time || null,
      outbound_flight_no: result.data.outbound_flight_no || null,
      outbound_departure_date: result.data.outbound_departure_date || null,
      outbound_departure_time: result.data.outbound_departure_time || null,
      country: result.data.country || null,
      arriving_date: result.data.arriving_date,
      departure_date: result.data.departure_date,
      no_of_nights,
      no_of_pax: result.data.no_of_pax,
      no_of_children: result.data.no_of_children,
      hotel_type: result.data.hotel_type,
      room_category: result.data.room_category,
      meal_plan: result.data.meal_plan || null,
      rooms_dbl: result.data.rooms_dbl,
      rooms_sgl: result.data.rooms_sgl,
      rooms_tpl: result.data.rooms_tpl,
      rooms_qtpl: result.data.rooms_qtpl,
      activities: result.data.activities,
      client_desires: result.data.client_desires || null,
      status: "new",
      priority: "medium",
      inquiry_number: finalRef, // Use generated number
    };

    // Insert inquiry with fallback for missing fields
    let { data: inquiry, error } = await supabaseAdmin
      .from("inquiries")
      .insert(insertPayload)
      .select()
      .single();

    // Fallback if migration hasn't been run (missing columns)
    if (error && (error.code === '42703' || error.message.includes('column'))) {
      console.warn("Database schema mismatch, falling back to legacy insert. Please run migrations.");
      
      const { 
        arranged_by_agent, 
        inbound_flight_no, 
        inbound_arrival_date, 
        inbound_arrival_time, 
        outbound_flight_no, 
        outbound_departure_date, 
        outbound_departure_time, 
        ...safePayload 
      } = insertPayload;

      const retry = await supabaseAdmin
        .from("inquiries")
        .insert(safePayload)
        .select()
        .single();
      
      inquiry = retry.data;
      error = retry.error;
    }

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
