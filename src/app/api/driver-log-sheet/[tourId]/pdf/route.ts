import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateLogSheetHTML } from "@/lib/pdf/generateLogSheetHTML";
import { getLogSheetBaseline } from "@/lib/tours/logSheetData";

interface RouteParams {
    params: Promise<{ tourId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
    const { tourId } = await params;
    const url = new URL(request.url);
    const format = url.searchParams.get("format");
    const supabase = await createClient();

    try {
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

        const baseData = await getLogSheetBaseline(tourId);
        const savedData = tour.log_sheet_data || {};
        const isFinalized = tour.log_sheet_finalized || false;

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

        const html = generateLogSheetHTML(mergedData);

        // Return raw HTML for client-side rendering
        if (format === "html") {
            return NextResponse.json({ html, name: tour.name });
        }

        // Fallback: server-side PDF via Puppeteer
        const { launchBrowser } = await import("@/lib/pdf/browser");
        const browser = await launchBrowser();
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
        });

        await browser.close();

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
