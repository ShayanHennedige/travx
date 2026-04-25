import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { groupInquirySchema } from "@/lib/validations/groupInquiry";
import { generateBaseReferenceNumber } from "@/lib/utils/reference-generator";
import { sendInquiryNotification } from "@/lib/email";

function sanitize(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/<[^>]*>/g, "").trim() || null;
}

// Create a Supabase client for public submissions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const result = groupInquirySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      );
    }

    const {
      is_tour_agent,
      agent_name,
      agent_email,
      agent_company,
      head_first_name,
      head_last_name,
      head_passport_no,
      contact_number,
      client_email,
      country,
      arriving_date,
      arrival_flight_no,
      arrival_time,
      departure_date,
      departure_flight_no,
      departure_time,
      no_of_adults,
      no_of_children,
      hotel_type,
      room_category,
      meal_plan,
      rooms_dbl,
      rooms_sgl,
      rooms_tpl,
      rooms_qtpl,
      activities,
      client_desires,
      adult_members,
      child_members,
    } = result.data;

    // Generate Reference Number
    const baseRef = generateBaseReferenceNumber(country || "Unknown");

    // Check for existing references in group_inquiries to determine suffix
    const { data: existingRefs, error: searchError } = await supabase
      .from("group_inquiries")
      .select("inquiry_number")
      .ilike("inquiry_number", `${baseRef}%`);

    if (searchError) {
      console.error("Error checking references:", searchError);
      // Fallback to baseRef if search fails, though suffix is better
    }

    let finalRef = baseRef;
    if (existingRefs && existingRefs.length > 0) {
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

    // Calculate number of nights (Math.floor: check-in day 1, check-out day 2 = 1 night)
    const arrivingDate = new Date(arriving_date);
    const departureDate = new Date(departure_date);
    const diffTime = departureDate.getTime() - arrivingDate.getTime();
    const no_of_nights = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Insert group inquiry
    const { data: groupInquiry, error: inquiryError } = await supabase
      .from("group_inquiries")
      .insert({
        is_tour_agent: is_tour_agent || false,
        agent_name: sanitize(agent_name),
        agent_email: agent_email || null,
        agent_company: sanitize(agent_company),
        head_first_name: sanitize(head_first_name),
        head_last_name: sanitize(head_last_name),
        head_passport_no: sanitize(head_passport_no),
        contact_number: sanitize(contact_number),
        client_email: client_email || null,
        country: sanitize(country),
        arriving_date,
        arrival_flight_no: arrival_flight_no || null,
        arrival_time: arrival_time || null,
        departure_date,
        departure_flight_no: departure_flight_no || null,
        departure_time: departure_time || null,
        no_of_nights,
        no_of_adults,
        no_of_children: no_of_children || 0,
        hotel_type: hotel_type,
        room_category: room_category,
        meal_plan: meal_plan && meal_plan.length > 0 ? meal_plan : null,
        rooms_dbl,
        rooms_sgl,
        rooms_tpl,
        rooms_qtpl,
        activities,
        client_desires: sanitize(client_desires),
        status: "new",
        priority: "medium",
        inquiry_number: finalRef,
      })
      .select()
      .single();

    if (inquiryError) {
      console.error("Database error:", inquiryError);
      return NextResponse.json(
        { error: inquiryError.message },
        { status: 500 }
      );
    }

    // Insert adult members
    const adultMembersData = adult_members.map((member) => ({
      group_inquiry_id: groupInquiry.id,
      member_type: "adult" as const,
      full_name: member.full_name,
      passport_no: member.passport_no || null,
      date_of_birth: member.date_of_birth || null,
      special_requirements: member.special_requirements || null,
    }));

    if (adultMembersData.length > 0) {
      const { error: adultError } = await supabase
        .from("group_members")
        .insert(adultMembersData);

      if (adultError) {
        console.error("Error inserting adult members:", adultError);
      }
    }

    // Insert child members
    if (child_members && child_members.length > 0) {
      const childMembersData = child_members.map((member) => ({
        group_inquiry_id: groupInquiry.id,
        member_type: "child" as const,
        full_name: member.full_name,
        passport_no: member.passport_no || null,
        date_of_birth: member.date_of_birth || null,
        special_requirements: member.special_requirements || null,
      }));

      const { error: childError } = await supabase
        .from("group_members")
        .insert(childMembersData);

      if (childError) {
        console.error("Error inserting child members:", childError);
      }
    }

    // Send email notification (async)
    // Use agent email if available, otherwise client email
    const notificationData = {
      ...groupInquiry,
      primary_email: groupInquiry.agent_email || groupInquiry.client_email
    };

    sendInquiryNotification(notificationData).catch((err) => {
      console.error("Background group email notification failed:", err);
    });

    return NextResponse.json(
      {
        success: true,
        message: "Group inquiry submitted successfully",
        inquiry_number: groupInquiry.inquiry_number,
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
