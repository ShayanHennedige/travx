import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateInvoiceHTML } from "@/lib/pdf/generateInvoiceHTML";
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
        // Fetch invoice
        const { data: invoice, error } = await supabase
            .from("customer_invoices")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !invoice) {
            return NextResponse.json(
                { error: "Invoice not found" },
                { status: 404 }
            );
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

        // Generate HTML with logo
        const html = generateInvoiceHTML(invoice as any, logoBase64);

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
                "Content-Disposition": `attachment; filename="invoice-${invoice.invoice_no}.pdf"`,
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
