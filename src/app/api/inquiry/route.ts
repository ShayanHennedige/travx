import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { publicInquirySchema } from "@/lib/validations/inquiry";

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

    // Insert inquiry
    const { data: inquiry, error } = await supabaseAdmin
      .from("inquiries")
      .insert({
        first_name: result.data.first_name,
        last_name: result.data.last_name,
        passport_no: result.data.passport_no || null,
        contact_number: result.data.contact_number,
        client_email: result.data.client_email,
        country: result.data.country,
        arriving_date: result.data.arriving_date,
        departure_date: result.data.departure_date,
        no_of_pax: result.data.no_of_pax,
        no_of_children: result.data.no_of_children,
        hotel_type: result.data.hotel_type,
        room_category: result.data.room_category,
        rooms_dbl: result.data.rooms_dbl,
        rooms_sgl: result.data.rooms_sgl,
        rooms_tpl: result.data.rooms_tpl,
        rooms_qtpl: result.data.rooms_qtpl,
        activities: result.data.activities,
        status: "new",
        priority: "medium",
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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
