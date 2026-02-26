import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

// POST - Generate feedback token and send email
export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { inquiry_id, group_inquiry_id, itinerary_id, tour_id } = body;

    if (!inquiry_id && !group_inquiry_id && !itinerary_id && !tour_id) {
      return NextResponse.json(
        { error: "At least one ID (inquiry_id, group_inquiry_id, itinerary_id, or tour_id) is required" },
        { status: 400 }
      );
    }

    // Get user info for created_by
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch customer data and tour info
    let customerEmail = "";
    let customerName = "";
    let reference = "";
    let effectiveInquiryId = inquiry_id;
    let effectiveGroupInquiryId = group_inquiry_id;

    // Try to get data from tour first (most complete)
    if (tour_id) {
      const { data: tour } = await supabase
        .from("tours")
        .select(`
          *,
          itineraries (
            id,
            inquiry_id,
            group_inquiry_id
          )
        `)
        .eq("id", tour_id)
        .single();

      if (tour) {
        // Get inquiry IDs from itinerary if not directly provided
        const itinerary = Array.isArray(tour.itineraries) ? tour.itineraries[0] : tour.itineraries;
        if (itinerary) {
          if (!effectiveInquiryId && itinerary.inquiry_id) {
            effectiveInquiryId = itinerary.inquiry_id;
          }
          if (!effectiveGroupInquiryId && itinerary.group_inquiry_id) {
            effectiveGroupInquiryId = itinerary.group_inquiry_id;
          }
        }
      }
    }

    // Also check itinerary if provided
    if (itinerary_id && (!effectiveInquiryId && !effectiveGroupInquiryId)) {
      const { data: itinerary } = await supabase
        .from("itineraries")
        .select("inquiry_id, group_inquiry_id")
        .eq("id", itinerary_id)
        .single();

      if (itinerary) {
        if (itinerary.inquiry_id && !effectiveInquiryId) {
          effectiveInquiryId = itinerary.inquiry_id;
        }
        if (itinerary.group_inquiry_id && !effectiveGroupInquiryId) {
          effectiveGroupInquiryId = itinerary.group_inquiry_id;
        }
      }
    }

    // Fetch customer data from inquiry or group_inquiry
    if (effectiveInquiryId) {
      const { data: inquiry } = await supabase
        .from("inquiries")
        .select("client_email, first_name, last_name, inquiry_number")
        .eq("id", effectiveInquiryId)
        .single();

      if (inquiry) {
        customerEmail = inquiry.client_email || "";
        customerName = `${inquiry.first_name || ""} ${inquiry.last_name || ""}`.trim();
        reference = inquiry.inquiry_number || "";
      }
    } else if (effectiveGroupInquiryId) {
      const { data: groupInquiry } = await supabase
        .from("group_inquiries")
        .select("client_email, head_first_name, head_last_name, inquiry_number")
        .eq("id", effectiveGroupInquiryId)
        .single();

      if (groupInquiry) {
        customerEmail = groupInquiry.client_email || "";
        customerName = `${groupInquiry.head_first_name || ""} ${groupInquiry.head_last_name || ""}`.trim();
        reference = groupInquiry.inquiry_number || "";
      }
    }

    if (!customerEmail) {
      return NextResponse.json(
        { error: "Could not find customer email address" },
        { status: 404 }
      );
    }

    // Generate secure token
    const token = randomBytes(32).toString("hex");
    
    // Token expires in 14 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    // Create token record
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("feedback_tokens")
      .insert({
        token,
        inquiry_id: inquiry_id || null,
        group_inquiry_id: group_inquiry_id || null,
        itinerary_id: itinerary_id || null,
        tour_id: tour_id || null,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (tokenError) {
      console.error("Error creating token:", tokenError);
      return NextResponse.json({ error: tokenError.message }, { status: 500 });
    }

    // Generate feedback URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";
    const feedbackUrl = `${baseUrl}/feedback?token=${token}`;

    // Send email (using Supabase Edge Function or external service)
    // For now, we'll log it and return the URL
    // TODO: Integrate with email service (Resend, SendGrid, etc.)
    console.log("Feedback email should be sent:", {
      to: customerEmail,
      subject: `Feedback Request - ${reference}`,
      body: `Dear ${customerName},\n\nWe hope you enjoyed your trip! Please share your feedback by clicking the link below:\n\n${feedbackUrl}\n\nThis link will expire in 14 days.\n\nBest regards,\nTravX Team`,
    });

    // For now, return success with URL (admin can copy if email fails)
    return NextResponse.json({
      success: true,
      token: tokenRecord,
      feedback_url: feedbackUrl,
      email_sent: false, // Set to true when email integration is complete
      message: "Token created successfully. Email integration pending.",
    });

  } catch (err: any) {
    console.error("Server error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
