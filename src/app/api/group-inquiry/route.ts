import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { groupInquirySchema } from "@/lib/validations/groupInquiry";

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
      head_first_name,
      head_last_name,
      head_passport_no,
      contact_number,
      client_email,
      country,
      arriving_date,
      departure_date,
      no_of_adults,
      no_of_children,
      hotel_type,
      room_category,
      rooms_dbl,
      rooms_sgl,
      rooms_tpl,
      rooms_qtpl,
      activities,
      adult_members,
      child_members,
    } = result.data;

    // Calculate number of nights
    const arrivingDate = new Date(arriving_date);
    const departureDate = new Date(departure_date);
    const diffTime = departureDate.getTime() - arrivingDate.getTime();
    const no_of_nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Insert group inquiry
    const { data: groupInquiry, error: inquiryError } = await supabase
      .from("group_inquiries")
      .insert({
        head_first_name,
        head_last_name,
        head_passport_no: head_passport_no || null,
        contact_number,
        client_email,
        country,
        arriving_date,
        departure_date,
        no_of_nights,
        no_of_adults,
        no_of_children: no_of_children || 0,
        hotel_type,
        room_category,
        rooms_dbl,
        rooms_sgl,
        rooms_tpl,
        rooms_qtpl,
        activities,
        status: "new",
        priority: "medium",
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
