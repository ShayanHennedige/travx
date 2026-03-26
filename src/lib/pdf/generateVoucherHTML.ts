import { format } from "date-fns";

export function generateVoucherHTML(voucher: any, tourNo: string, totalPax: number, inquiry: any): string {
  const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL || 'https://tvxwjknpdzvuovjgqvvi.supabase.co/storage/v1/object/public/logo/Serendia.png';
  const checkInDate = voucher.check_in_date ? format(new Date(voucher.check_in_date), "dd-MMM-yy") : "";
  const checkOutDate = voucher.check_out_date ? format(new Date(voucher.check_out_date), "dd-MMM-yy") : "";
  const confirmedDate = voucher.confirmed_date ? format(new Date(voucher.confirmed_date), "yyyy-MM-dd") : "";
  const bookedDate = voucher.booked_date ? format(new Date(voucher.booked_date), "yyyy-MM-dd") : "";

  const isAmendment = voucher.is_amendment;
  const headerTitle = isAmendment ? "Hotel Reservation Voucher — Amendment" : "Hotel Reservation Voucher";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${voucher.voucher_number}</title>
      <style>
        @page { size: A4; margin: 14mm 16mm 16mm 16mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: "Times New Roman", Times, Georgia, serif;
          font-size: 10.5px;
          line-height: 1.55;
          color: #2c2c2c;
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 0 16px;
          border-bottom: 2px solid #2c2c2c;
          margin-bottom: 22px;
        }
        .logo { height: 110px; width: auto; }
        .company-info {
          text-align: right;
          font-size: 12px;
          color: #444;
          line-height: 1.65;
        }
        .company-name {
          font-size: 17px;
          font-weight: bold;
          color: #2c2c2c;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        /* Title */
        .title-section {
          text-align: center;
          margin-bottom: 16px;
        }
        .title-section h1 {
          font-size: 16px;
          font-weight: normal;
          font-style: italic;
          color: #2c2c2c;
        }
        .title-line {
          width: 50px;
          height: 1.5px;
          background: #c09853;
          margin: 6px auto;
        }

        /* Amendment Badge */
        .amendment-badge {
          text-align: center;
          padding: 6px 12px;
          color: #c09853;
          font-weight: bold;
          font-size: 10px;
          border: 1px dashed #c09853;
          margin-bottom: 12px;
        }

        /* Details Grid */
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          border-top: 1px solid #e5e0d8;
          border-left: 1px solid #e5e0d8;
          margin-bottom: 16px;
        }
        .detail-cell {
          padding: 7px 10px;
          border-bottom: 1px solid #e5e0d8;
          border-right: 1px solid #e5e0d8;
        }
        .detail-cell.full {
          grid-column: 1 / -1;
        }
        .detail-label {
          font-size: 7.5px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #999;
        }
        .detail-value {
          font-size: 11px;
          color: #2c2c2c;
          font-weight: bold;
          margin-top: 1px;
        }
        .detail-value.accent { color: #c09853; }

        /* Section Title */
        .section-title {
          font-size: 11px;
          font-style: italic;
          color: #2c2c2c;
          margin: 14px 0 6px 0;
          padding-bottom: 3px;
          border-bottom: 1px solid #c09853;
          display: inline-block;
        }

        /* Clean Tables */
        .clean-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
        }
        .clean-table th {
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #888;
          font-weight: normal;
          padding: 5px 10px;
          text-align: center;
          border-bottom: 1.5px solid #2c2c2c;
        }
        .clean-table td {
          padding: 6px 10px;
          border-bottom: 1px solid #eee;
          font-size: 10.5px;
          text-align: center;
        }

        /* Booking Grid */
        .booking-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          border-top: 1px solid #e5e0d8;
          border-left: 1px solid #e5e0d8;
          margin-bottom: 14px;
        }
        .booking-cell {
          padding: 6px 10px;
          border-bottom: 1px solid #e5e0d8;
          border-right: 1px solid #e5e0d8;
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .booking-cell em {
          font-size: 9px;
          color: #888;
          min-width: 60px;
        }
        .booking-cell strong {
          font-size: 10.5px;
        }

        /* Remarks */
        .remarks-box {
          padding: 10px;
          min-height: 60px;
          border: 1px solid #e5e0d8;
          margin-bottom: 14px;
          font-size: 10px;
          color: #555;
          line-height: 1.6;
        }

        /* Footer Grid */
        .footer-meta {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 0;
          border-top: 1px solid #e5e0d8;
          border-left: 1px solid #e5e0d8;
          margin-top: 16px;
        }
        .footer-cell {
          padding: 8px 10px;
          border-bottom: 1px solid #e5e0d8;
          border-right: 1px solid #e5e0d8;
        }
        .footer-cell-label {
          font-size: 7px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #999;
        }
        .footer-cell-value {
          font-size: 10px;
          font-weight: bold;
          color: #2c2c2c;
          margin-top: 2px;
        }

        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <img src="${logoUrl}" alt="TraveX" class="logo" />
        <div class="company-info">
          <div class="company-name">TraveX</div>
          63A, Old Road, Pannipitiya, Sri Lanka<br>
          +94 77 346 9998 &nbsp;·&nbsp; info@Travex.com
        </div>
      </div>

      <!-- Title -->
      <div class="title-section">
        <h1>${headerTitle}</h1>
        <div class="title-line"></div>
      </div>

      ${isAmendment ? `<div class="amendment-badge">⚠ AMENDMENT — Amended by ${voucher.amendment_confirmed_by || "Management"} on ${format(new Date(), "yyyy-MM-dd")}</div>` : ""}

      <!-- Voucher Details -->
      <div class="details-grid">
        <div class="detail-cell">
          <div class="detail-label">Voucher Number</div>
          <div class="detail-value accent">${voucher.voucher_number}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">Tour Number</div>
          <div class="detail-value">${tourNo}</div>
        </div>
        <div class="detail-cell full">
          <div class="detail-label">Guest Name</div>
          <div class="detail-value">${voucher.guest_name} (${totalPax} Pax)</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">Nationality</div>
          <div class="detail-value">${voucher.nationality || (inquiry as any)?.country || "—"}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">Passport No</div>
          <div class="detail-value">${(inquiry as any)?.passport_no || (inquiry as any)?.head_passport_no || "—"}</div>
        </div>
        <div class="detail-cell full">
          <div class="detail-label">Hotel</div>
          <div class="detail-value">${voucher.hotel_name}</div>
        </div>
      </div>

      <!-- Room Details -->
      <div class="section-title">Room Details</div>
      <table class="clean-table">
        <thead>
          <tr>
            <th>Room Type</th>
            <th>SGL</th>
            <th>DBL</th>
            <th>TPL</th>
            <th>QUAD</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: bold;">No. of Rooms</td>
            <td>${voucher.room_type === "SGL" ? voucher.no_of_rooms : "—"}</td>
            <td>${voucher.room_type === "DBL" ? voucher.no_of_rooms : "—"}</td>
            <td>${voucher.room_type === "TPL" ? voucher.no_of_rooms : "—"}</td>
            <td>${voucher.room_type === "QUAD" || voucher.room_type === "QTPL" ? voucher.no_of_rooms : "—"}</td>
          </tr>
        </tbody>
      </table>

      <div class="booking-grid">
        <div class="booking-cell"><em>Category</em> <strong>${voucher.room_category || "Deluxe Room"}</strong></div>
        <div class="booking-cell"><em>Meal Plan</em> <strong>${getMealPlanLabel(voucher.meal_plan)}</strong></div>
      </div>

      <!-- Booking Details -->
      <div class="section-title">Booking Details</div>
      <div class="booking-grid">
        <div class="booking-cell"><em>Check In</em> <strong>${checkInDate}</strong></div>
        <div class="booking-cell"><em>Arrival</em> <strong>${voucher.arrival_time || "Afternoon"}</strong></div>
        <div class="booking-cell"><em>Check Out</em> <strong>${checkOutDate}</strong></div>
        <div class="booking-cell"><em>Departure</em> <strong>${voucher.departure_time || "After Breakfast"}</strong></div>
        <div class="booking-cell"><em>Nights</em> <strong>${voucher.no_of_nights || 0} Night(s)</strong></div>
        <div class="booking-cell"><em>Total Pax</em> <strong>Adults: ${voucher.pax_adults || 0} · Children: ${voucher.pax_children || 0} · Infants: ${voucher.pax_infants || 0}</strong></div>
      </div>

      <!-- Remarks -->
      <div class="section-title">Booking Remarks</div>
      <div class="remarks-box">
        ${voucher.remarks ? voucher.remarks.split("\\n").map((line: string) => `<div>• ${line}</div>`).join("") : "No special instructions."}
      </div>

      <!-- Footer Meta -->
      <div class="footer-meta">
        <div class="footer-cell">
          <div class="footer-cell-label">Confirmed By</div>
          <div class="footer-cell-value">${voucher.confirmed_by || "—"}</div>
        </div>
        <div class="footer-cell">
          <div class="footer-cell-label">Confirmed Date</div>
          <div class="footer-cell-value">${confirmedDate || "—"}</div>
        </div>
        <div class="footer-cell">
          <div class="footer-cell-label">Booked By</div>
          <div class="footer-cell-value">${voucher.booked_by || "—"}</div>
        </div>
        <div class="footer-cell">
          <div class="footer-cell-label">Booked Date</div>
          <div class="footer-cell-value">${bookedDate || "—"}</div>
        </div>
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
