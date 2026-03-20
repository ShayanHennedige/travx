import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCostingSheetHTML } from "@/lib/pdf/generateCostingSheetHTML";
import { launchBrowser } from "@/lib/pdf/browser";

export const maxDuration = 60;
import path from "path";
import fs from "fs";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();

    try {
        // Fetch costing sheet - simple query first
        const { data: costingSheet, error } = await supabase
            .from("tour_costing_sheets")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            console.error("Supabase error fetching costing sheet:", error);
            return NextResponse.json(
                { error: "Costing sheet not found", details: error.message },
                { status: 404 }
            );
        }

        if (!costingSheet) {
            console.error("No costing sheet found for id:", id);
            return NextResponse.json(
                { error: "Costing sheet not found" },
                { status: 404 }
            );
        }

        // Fetch related inquiry data separately (more reliable)
        let inquiryData: any = null;
        if (costingSheet.itinerary_id) {
            const { data: itinerary } = await supabase
                .from("itineraries")
                .select("inquiry_id, group_inquiry_id")
                .eq("id", costingSheet.itinerary_id)
                .single();

            if (itinerary) {
                if (itinerary.inquiry_id) {
                    const { data: inquiry } = await supabase
                        .from("inquiries")
                        .select("inquiry_number, client_name, passport_no")
                        .eq("id", itinerary.inquiry_id)
                        .single();
                    inquiryData = inquiry;
                } else if (itinerary.group_inquiry_id) {
                    const { data: groupInquiry } = await supabase
                        .from("group_inquiries")
                        .select("inquiry_number, head_first_name, head_last_name, head_passport_no")
                        .eq("id", itinerary.group_inquiry_id)
                        .single();
                    if (groupInquiry) {
                        inquiryData = {
                            inquiry_number: groupInquiry.inquiry_number,
                            client_name: `${groupInquiry.head_first_name || ""} ${groupInquiry.head_last_name || ""}`.trim(),
                            passport_no: groupInquiry.head_passport_no
                        };
                    }
                }
            }
        }

        // Load logo as base64
        let logoBase64 = "";
        try {
            const logoPath = path.join(process.cwd(), "public", "Serendia.png");
            const logoBuffer = fs.readFileSync(logoPath);
            logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
        } catch (logoErr) {
            console.warn("Could not load logo:", logoErr);
        }

        // Extract reference and client name from the fetched data
        const reference = inquiryData?.inquiry_number || id.slice(0, 8);
        const client_name = (costingSheet as any).client_name || inquiryData?.client_name || '';
        const passport_no = inquiryData?.passport_no || '';

        // Generate HTML
        const html = generateCostingSheetHTML({ ...costingSheet, reference, client_name, passport_no }, logoBase64);

        // Launch Puppeteer
        const browser = await launchBrowser();

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "0mm",
                right: "0mm",
                bottom: "0mm",
                left: "0mm",
            },
        });

        await browser.close();

        // Return PDF
        return new Response(pdfBuffer as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="costing-sheet-${id}.pdf"`,
            },
        });
    } catch (err) {
        console.error("Error generating PDF:", err);
        return NextResponse.json(
            { error: "Failed to generate PDF" },
            { status: 500 }
        );
    }
}
