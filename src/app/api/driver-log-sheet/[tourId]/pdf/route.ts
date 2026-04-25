import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { launchBrowser } from "@/lib/pdf/browser";
import { generateLogSheetHTML } from "@/lib/pdf/generateLogSheetHTML";
import { getLogSheetBaseline } from "@/lib/tours/logSheetData";

interface RouteParams {
    params: Promise<{ tourId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
    const { tourId } = await params;
    const supabase = await createClient();

    try {
        // 1. Fetch the fresh tour/itinerary/inquiry data (similar to Excel route)
        const { data: tour, error: tourError } = await supabase
            .from("tours")
            .select(`
                *,
                drivers (name, vehicle_type, vehicle_number),
                itineraries (content, inquiry_id, group_inquiry_id)
            `)
            .eq("id", tourId)
            .single();

        if (tourError || !tour) {
            return NextResponse.json({ error: "Tour not found" }, { status: 404 });
        }

        // 2. Fetch the baseline data directly to avoid self-fetch loops/auth issues
        const baseData = await getLogSheetBaseline(tourId);
        
        const savedData = tour.log_sheet_data || {};
        const isFinalized = tour.log_sheet_finalized || false;

        // 3. Merge base data with saved draft data (mirroring LogSheetView logic)
        const mergedData = {
            ...baseData,
            tourName: tour.name,
            days: (savedData.days && savedData.days.length > 0) ? savedData.days : baseData.days,
            costs: {
                paging: savedData.costs?.paging ?? 0,
                highway: savedData.costs?.highway ?? 0,
                batta: savedData.costs?.batta ?? 0,
                tickets: savedData.costs?.tickets ?? 0,
                other: savedData.costs?.other ?? 0,
            },
            actualExcessRate: savedData.actualExcessRate ?? null,
            totalActualKmOverride: savedData.totalActualKmOverride ?? null,
            editableLimits: savedData.editableLimits || baseData.limits,
            tourAdvance: savedData.tourAdvance || 0,
            isFinalized
        };

        // 4. Generate HTML
        const html = generateLogSheetHTML(mergedData);

        // 5. Generate PDF using Puppeteer
        const browser = await launchBrowser();
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "10mm",
                right: "10mm",
                bottom: "10mm",
                left: "10mm",
            },
        });

        await browser.close();

        // 6. Return PDF
        const filename = `LogSheet-${tour.name.replace(/\s+/g, '-')}.pdf`;
        return new Response(pdfBuffer as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });

    } catch (err) {
        console.error("Error generating Log Sheet PDF:", err);
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    }
}
