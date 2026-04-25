import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateItineraryHTML } from "@/lib/pdf/generateItineraryHTML";
import { launchBrowser } from "@/lib/pdf/browser";

export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface ItineraryContent {
  title: string;
  summary: string;
  days: {
    day: number;
    date: string;
    title: string;
    overnight_location: string;
    hotel_suggestion: string;
    activities: {
      time: string;
      activity: string;
      location: string;
      duration: string;
      driving_time?: string;
    }[];
    meals: {
      breakfast: string;
      lunch: string;
      dinner: string;
    };
    notes?: string;
  }[];
  practical_notes: string[];
  total_driving_hours: string;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const includeRates = searchParams.get("include_rates") === "true";

    const supabase = await createClient();

    // Fetch itinerary with inquiry data (both individual and group)
    const { data: itinerary, error } = await supabase
      .from("itineraries")
      .select(`
        id,
        content,
        created_at,
        inquiry_id,
        group_inquiry_id,
        inquiries (
          inquiry_number,
          first_name,
          last_name,
          client_email,
          arriving_date,
          departure_date,
          no_of_nights,
          no_of_pax,
          no_of_children,
          hotel_type,
          room_category,
          meal_plan
        ),
        group_inquiries (
          inquiry_number,
          head_first_name,
          head_last_name,
          client_email,
          agent_name,
          agent_company,
          arriving_date,
          departure_date,
          no_of_nights,
          no_of_adults,
          no_of_children,
          hotel_type,
          room_category,
          meal_plan,
          rooms_dbl,
          rooms_sgl,
          rooms_tpl,
          rooms_qtpl
        )
      `)
      .eq("id", id)
      .single();

    if (error || !itinerary) {
      return NextResponse.json(
        { error: "Itinerary not found" },
        { status: 404 }
      );
    }

    const content = itinerary.content as ItineraryContent;

    // Handle both individual and group inquiries
    const individualInquiry = itinerary.inquiries as any;
    const groupInquiry = itinerary.group_inquiries as any;

    // Normalize inquiry data
    const inquiry = individualInquiry ? {
      inquiry_number: individualInquiry.inquiry_number,
      first_name: individualInquiry.first_name,
      last_name: individualInquiry.last_name,
      client_email: individualInquiry.client_email,
      arriving_date: individualInquiry.arriving_date,
      departure_date: individualInquiry.departure_date,
      no_of_nights: individualInquiry.no_of_nights,
      no_of_pax: individualInquiry.no_of_pax,
      no_of_children: individualInquiry.no_of_children,
      hotel_type: individualInquiry.hotel_type,
      room_category: individualInquiry.room_category,
      meal_plan: individualInquiry.meal_plan,
      is_group: false,
    } : groupInquiry ? {
      inquiry_number: groupInquiry.inquiry_number,
      first_name: groupInquiry.agent_name || groupInquiry.head_first_name || 'Guest',
      last_name: groupInquiry.agent_company || groupInquiry.head_last_name || '',
      client_email: groupInquiry.client_email,
      arriving_date: groupInquiry.arriving_date,
      departure_date: groupInquiry.departure_date,
      no_of_nights: groupInquiry.no_of_nights,
      no_of_pax: groupInquiry.no_of_adults,
      no_of_children: groupInquiry.no_of_children,
      hotel_type: groupInquiry.hotel_type,
      room_category: groupInquiry.room_category,
      meal_plan: groupInquiry.meal_plan,
      is_group: true,
      rooms_dbl: groupInquiry.rooms_dbl,
      rooms_sgl: groupInquiry.rooms_sgl,
      rooms_tpl: groupInquiry.rooms_tpl,
      rooms_qtpl: groupInquiry.rooms_qtpl,
    } : null;

    // Fetch costing sheet if including rates
    let costingData = null;
    if (includeRates) {
      const { data: costingSheet } = await supabase
        .from("tour_costing_sheets")
        .select("*")
        .eq("itinerary_id", id)
        .single();

      if (costingSheet) {
        costingData = costingSheet;
      }
    }

    // Generate HTML with rates option
    const html = generateItineraryHTML(content, inquiry, { includeRates, costingData });

    // Launch Puppeteer and generate PDF — always close browser in finally
    const browser = await launchBrowser();
    let pdfBuffer: Uint8Array;

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "10mm",
          right: "10mm",
          bottom: "25mm",
          left: "10mm",
        },
        displayHeaderFooter: true,
        headerTemplate: "<div></div>",
        footerTemplate: `
          <div style="width: 100%; text-align: center; font-size: 9px; color: #666; padding-top: 15px; font-family: Times New Roman, serif;">
            <div style="margin-bottom: 5px;">TravX</div>
            <div>Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
          </div>
        `,
      });
    } finally {
      await browser.close();
    }

    // Generate filename
    const suffix = includeRates ? "-Rates" : "";
    const filename = inquiry
      ? `${inquiry.inquiry_number}-Itinerary${suffix}.pdf`
      : `TravX-Itinerary${suffix}-${id.slice(0, 8)}.pdf`;

    // Return PDF as response
    return new Response(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
