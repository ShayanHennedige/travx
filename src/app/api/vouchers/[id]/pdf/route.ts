import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import puppeteer from "puppeteer";
import { format } from "date-fns";

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
        last_name
      ),
      group_inquiries (
        inquiry_number,
        head_first_name,
        head_last_name
      )
    `)
    .eq("id", id)
    .single();

  if (error || !voucher) {
    console.error("Error fetching voucher for PDF:", error);
    return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
  }

  const inquiry = voucher.inquiries || voucher.group_inquiries;
  const tourNo = inquiry?.inquiry_number || "N/A";
  const totalPax = (voucher.pax_adults || 0) + (voucher.pax_children || 0) + (voucher.pax_infants || 0);

  const htmlContent = generateVoucherHTML(voucher, tourNo, totalPax);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

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

    const filename = voucher.is_amendment 
      ? `${voucher.voucher_number}-Amendment.pdf`
      : `${voucher.voucher_number}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
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

function generateVoucherHTML(voucher: any, tourNo: string, totalPax: number): string {
  const checkInDate = voucher.check_in_date ? format(new Date(voucher.check_in_date), "dd-MMM-yy") : "";
  const checkOutDate = voucher.check_out_date ? format(new Date(voucher.check_out_date), "dd-MMM-yy") : "";
  const confirmedDate = voucher.confirmed_date ? format(new Date(voucher.confirmed_date), "yyyy-MM-dd") : "";
  const bookedDate = voucher.booked_date ? format(new Date(voucher.booked_date), "yyyy-MM-dd") : "";

  const isAmendment = voucher.is_amendment;
  const headerTitle = isAmendment ? "Hotel Reservation Voucher - Amendment" : "Hotel Reservation Voucher";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${voucher.voucher_number}</title>
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 11px;
          line-height: 1.4;
          color: #000;
          padding: 20px;
        }
        .container {
          width: 100%;
          max-width: 700px;
          margin: 0 auto;
          border: 2px solid #000;
        }
        
        /* Header with TravX branding */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 15px;
          border-bottom: 2px solid #000;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          font-weight: bold;
        }
        .company-info h1 {
          font-size: 22px;
          font-weight: bold;
          color: #1d4ed8;
          margin-bottom: 2px;
        }
        .company-info .tagline {
          font-size: 10px;
          color: #64748b;
          font-style: italic;
        }
        .contact-info {
          text-align: right;
          font-size: 10px;
          color: #334155;
          line-height: 1.5;
        }
        .contact-info strong {
          color: #1d4ed8;
        }
        
        /* Voucher Title */
        .voucher-title {
          background-color: ${isAmendment ? "#dc2626" : "#1d4ed8"};
          color: white;
          padding: 8px 15px;
          font-weight: bold;
          font-size: 13px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        /* Info Rows */
        .row {
          display: flex;
          border-bottom: 1px solid #cbd5e1;
        }
        .row:last-child {
          border-bottom: none;
        }
        .label {
          width: 140px;
          padding: 8px 12px;
          border-right: 1px solid #cbd5e1;
          background-color: #f1f5f9;
          font-weight: 600;
          color: #475569;
        }
        .value {
          flex: 1;
          padding: 8px 12px;
          background-color: #fff;
        }
        .value strong {
          color: #1e293b;
        }
        
        /* Section Headers */
        .section-header {
          background-color: #e2e8f0;
          padding: 8px 12px;
          font-weight: bold;
          font-size: 12px;
          color: #1e293b;
          border-bottom: 1px solid #cbd5e1;
          border-top: 2px solid #94a3b8;
        }
        
        /* Tables */
        .room-table, .rate-table {
          width: 100%;
          border-collapse: collapse;
          border-bottom: 1px solid #cbd5e1;
        }
        .room-table td, .rate-table td {
          padding: 8px 10px;
          border-right: 1px solid #cbd5e1;
          text-align: center;
          background-color: #fff;
        }
        .room-table td:last-child, .rate-table td:last-child {
          border-right: none;
        }
        .room-table td:first-child, .rate-table td:first-child {
          text-align: left;
          background-color: #f1f5f9;
          font-weight: 600;
          color: #475569;
        }
        
        /* Remarks Section */
        .remarks-section {
          background-color: #fef9c3;
          padding: 12px;
          min-height: 70px;
          border-bottom: 1px solid #cbd5e1;
        }
        .remarks-section p {
          color: #b91c1c;
          font-weight: bold;
          margin-bottom: 4px;
        }
        
        /* Footer */
        .footer-row {
          display: flex;
          border-top: 2px solid #94a3b8;
          background-color: #f8fafc;
        }
        .footer-cell {
          flex: 1;
          padding: 10px 12px;
          border-right: 1px solid #cbd5e1;
        }
        .footer-cell:last-child {
          border-right: none;
        }
        .footer-cell .label-text {
          font-size: 10px;
          color: #64748b;
          margin-bottom: 2px;
        }
        .footer-cell .value-text {
          font-weight: 600;
          color: #1e293b;
        }
        
        /* Amendment Notice */
        .amendment-notice {
          background-color: #fef2f2;
          color: #dc2626;
          font-weight: bold;
          padding: 10px 12px;
          border-top: 2px solid #dc2626;
          text-align: center;
        }
        
        /* Nett Label */
        .nett-label {
          text-align: center;
          font-size: 10px;
          color: #64748b;
          padding: 4px;
          background-color: #f1f5f9;
          border-bottom: 1px solid #cbd5e1;
        }
        
        /* Voucher Number Badge */
        .voucher-badge {
          background-color: #f1f5f9;
          padding: 6px 12px;
          border-bottom: 1px solid #cbd5e1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .voucher-badge .number {
          font-weight: bold;
          color: #1d4ed8;
          font-size: 12px;
        }
        .voucher-badge .date {
          font-size: 10px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header with TravX Branding -->
        <div class="header">
          <div class="logo-section">
            <div class="logo">TX</div>
            <div class="company-info">
              <h1>TravX</h1>
              <p class="tagline">Sri Lanka Travel Specialists</p>
            </div>
          </div>
          <div class="contact-info">
            <strong>TravX Holidays (Pvt) Ltd</strong><br>
            63A, Old Road, Pannipitiya<br>
            Colombo, Sri Lanka<br>
            Tel: +94 11 2817781 | Mob: +94 77 3469998<br>
            Email: info@travx.com | www.travx.com
          </div>
        </div>

        <!-- Voucher Title -->
        <div class="voucher-title">${headerTitle}</div>
        
        <!-- Voucher Number -->
        <div class="voucher-badge">
          <span class="number">Voucher: ${voucher.voucher_number}</span>
          <span class="date">Generated: ${format(new Date(), "dd MMM yyyy")}</span>
        </div>

        <!-- Tour Info -->
        <div class="row">
          <div class="label">Tour No</div>
          <div class="value"><strong>${tourNo}</strong></div>
        </div>
        <div class="row">
          <div class="label">Guest Name</div>
          <div class="value"><strong>${voucher.guest_name}</strong> (${totalPax} pax)</div>
        </div>
        <div class="row">
          <div class="label">Nationality</div>
          <div class="value">${voucher.nationality || "Not specified"}</div>
        </div>
        <div class="row">
          <div class="label">Hotel</div>
          <div class="value"><strong>${voucher.hotel_name}</strong></div>
        </div>

        <!-- Room Details Section -->
        <div class="section-header">Room Details</div>
        
        <table class="room-table">
          <tr>
            <td style="width: 120px;">Room Type</td>
            <td>SGL</td>
            <td>${voucher.room_type === "SGL" ? voucher.no_of_rooms : "-"}</td>
            <td>DBL</td>
            <td>${voucher.room_type === "DBL" ? voucher.no_of_rooms : "-"}</td>
            <td>TPL</td>
            <td>${voucher.room_type === "TPL" ? voucher.no_of_rooms : "-"}</td>
            <td>QTPL</td>
            <td>${voucher.room_type === "QTPL" ? voucher.no_of_rooms : "-"}</td>
          </tr>
        </table>

        <div class="row">
          <div class="label">No. of Rooms</div>
          <div class="value"><strong>${voucher.no_of_rooms || 0}</strong>${voucher.remarks?.includes("Guide") ? " + 01 Guide" : ""}</div>
        </div>
        <div class="row">
          <div class="label">Room Category</div>
          <div class="value"><strong>${voucher.room_category || "Deluxe Room"}</strong></div>
        </div>
        <div class="row">
          <div class="label">Meal Plan</div>
          <div class="value"><strong>${getMealPlanLabel(voucher.meal_plan)}</strong></div>
        </div>

        <!-- Booking Details Section -->
        <div class="section-header">Booking Details</div>

        <table class="room-table">
          <tr>
            <td style="width: 100px;">Check In</td>
            <td><strong>${checkInDate}</strong></td>
            <td>Arrival</td>
            <td>${voucher.arrival_time || "Afternoon"}</td>
            <td style="width: 100px;">Check Out</td>
            <td><strong>${checkOutDate}</strong></td>
            <td>Departure</td>
            <td>${voucher.departure_time || "After Breakfast"}</td>
          </tr>
        </table>

        <div class="row">
          <div class="label">No. of Nights</div>
          <div class="value"><strong>${voucher.no_of_nights || 0}</strong> night${(voucher.no_of_nights || 0) !== 1 ? "s" : ""}</div>
        </div>

        <table class="room-table">
          <tr>
            <td style="width: 100px;">Pax Count</td>
            <td>Adults</td>
            <td><strong>${voucher.pax_adults || 0}</strong></td>
            <td>Children</td>
            <td><strong>${voucher.pax_children || 0}</strong></td>
            <td>Infants</td>
            <td><strong>${voucher.pax_infants || 0}</strong></td>
          </tr>
        </table>

        <!-- Rate Table -->
        <div class="section-header">Room Rates</div>
        <table class="rate-table">
          <tr>
            <td style="width: 120px;">Rate (${voucher.room_rate_currency || "USD"})</td>
            <td>SGL</td>
            <td>${voucher.room_rate_sgl ? formatRate(voucher.room_rate_sgl) : "FOC"}</td>
            <td>DBL</td>
            <td>${voucher.room_rate_dbl ? formatRate(voucher.room_rate_dbl) : "-"}</td>
            <td>TPL</td>
            <td>${voucher.room_rate_tpl ? formatRate(voucher.room_rate_tpl) : "-"}</td>
          </tr>
        </table>
        <div class="nett-label">All rates are NETT and inclusive of applicable taxes</div>

        <!-- Booking Remarks -->
        <div class="section-header">Booking Remarks</div>
        <div class="remarks-section">
          ${voucher.remarks ? voucher.remarks.split("\n").map((line: string) => `<p>${line}</p>`).join("") : "<p style='color: #94a3b8; font-weight: normal; font-style: italic;'>No special remarks</p>"}
        </div>

        <!-- Footer -->
        <div class="footer-row">
          <div class="footer-cell">
            <div class="label-text">Confirmed By</div>
            <div class="value-text">${voucher.confirmed_by || "-"}</div>
          </div>
          <div class="footer-cell">
            <div class="label-text">Confirmed Date</div>
            <div class="value-text">${confirmedDate || "-"}</div>
          </div>
          <div class="footer-cell">
            <div class="label-text">Booked By</div>
            <div class="value-text">${voucher.booked_by || "-"}</div>
          </div>
          <div class="footer-cell">
            <div class="label-text">Booked Date</div>
            <div class="value-text">${bookedDate || "-"}</div>
          </div>
        </div>

        ${isAmendment ? `
        <div class="amendment-notice">
          ⚠️ AMENDMENT - Confirmed by: ${voucher.amendment_confirmed_by || "N/A"}
        </div>
        ` : ""}
      </div>
    </body>
    </html>
  `;
}

function getMealPlanLabel(plan: string): string {
  const plans: Record<string, string> = {
    "BB": "Bed & Breakfast (BB)",
    "HB": "Half Board (HB)",
    "FB": "Full Board (FB)",
    "AI": "All Inclusive (AI)",
    "RO": "Room Only (RO)",
  };
  return plans[plan] || plan || "Bed & Breakfast (BB)";
}

function formatRate(rate: number): string {
  return rate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
