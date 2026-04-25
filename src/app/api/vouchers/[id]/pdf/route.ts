import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { launchBrowser } from "@/lib/pdf/browser";

export const maxDuration = 60;
import { generateVoucherHTML } from "@/lib/pdf/generateVoucherHTML";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: voucher, error } = await supabase
    .from("hotel_vouchers")
    .select(`
      *,
      inquiries (
        inquiry_number,
        first_name,
        last_name,
        passport_no,
        country
      ),
      group_inquiries (
        inquiry_number,
        head_first_name,
        head_last_name,
        head_passport_no,
        country
      )
    `)
    .eq("id", id)
    .single();

  if (error || !voucher) {
    console.error("Error fetching voucher for PDF:", error);
    return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
  }

  const inquiry = voucher.inquiries || voucher.group_inquiries;
  const travelerName = voucher.inquiries
    ? `${voucher.inquiries.first_name || ""} ${voucher.inquiries.last_name || ""}`.trim()
    : voucher.group_inquiries
      ? `${voucher.group_inquiries.head_first_name || ""} ${voucher.group_inquiries.head_last_name || ""}`.trim()
      : "";

  if (travelerName) {
    voucher.guest_name = travelerName;
  }

  const tourNo = inquiry?.inquiry_number || "N/A";
  const totalPax = (voucher.pax_adults || 0) + (voucher.pax_children || 0) + (voucher.pax_infants || 0);

  // Fallback for missing voucher number
  const hasVoucherNumber = voucher.voucher_number && voucher.voucher_number !== "null";
  const displayVoucherNumber = hasVoucherNumber
    ? voucher.voucher_number
    : `V-${tourNo === "N/A" ? id.slice(0, 8).toUpperCase() : tourNo}-${voucher.id.slice(0, 4).toUpperCase()}`;

  voucher.voucher_number = displayVoucherNumber; // Use for HTML template

  const htmlContent = generateVoucherHTML(voucher, tourNo, totalPax, inquiry);

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

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

    const filename = voucher.is_amendment
      ? `${displayVoucherNumber}-Amendment.pdf`
      : `${displayVoucherNumber}.pdf`;

    const { searchParams } = new URL(request.url);
    const isView = searchParams.get("view") === "true";
    const disposition = isView ? "inline" : `attachment; filename="${filename}"`;

    return new Response(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
      },
    });
  } catch (e) {
    console.error("Error generating PDF:", e);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
