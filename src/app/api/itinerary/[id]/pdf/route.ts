import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateItineraryHTML } from "@/lib/pdf/generateItineraryHTML";
import puppeteer from "puppeteer";

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
    const supabase = await createClient();

    // Fetch itinerary with inquiry data
    const { data: itinerary, error } = await supabase
      .from("itineraries")
      .select(`
        id,
        content,
        created_at,
        inquiry_id,
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
          room_category
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
    const inquiryData = itinerary.inquiries as unknown;
    const inquiry = inquiryData as {
      inquiry_number: string;
      first_name: string;
      last_name: string;
      client_email: string;
      arriving_date: string;
      departure_date: string;
      no_of_nights: number;
      no_of_pax: number;
      no_of_children: number;
      hotel_type: string;
      room_category?: string;
    } | null;

    // Generate HTML
    const html = generateItineraryHTML(content, inquiry);

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
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
          <div style="margin-bottom: 5px;">TravX Holidays (Pvt) Ltd | Sri Lanka Travel Specialists | www.travx.com</div>
          <div>Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
        </div>
      `,
    });

    await browser.close();

    // Generate filename
    const filename = inquiry
      ? `${inquiry.inquiry_number}-Itinerary.pdf`
      : `TravX-Itinerary-${id.slice(0, 8)}.pdf`;

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
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
