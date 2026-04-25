import { format, parseISO } from "date-fns";

export function generateLogSheetHTML(data: any): string {
    const { tour, days, limits, company, costs, actualExcessRate, totalActualKmOverride, editableLimits, tourAdvance, tourName } = data;
    const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL || 'https://axcfwwdahunzxsdeohkv.supabase.co/storage/v1/object/public/logo/Serendia.png';

    const totalEstimatedKm = days.reduce((sum: number, d: any) => sum + (d.estimatedKm || 0), 0);
    const calculatedTotalActualKm = days.reduce((sum: number, d: any) => sum + (d.actualKm || 0), 0);
    const totalActualKm = totalActualKmOverride !== null ? totalActualKmOverride : calculatedTotalActualKm;

    const baseTransportCost = editableLimits.baseTransportCost || 0;
    const mileageLimit = editableLimits.totalMileageLimit || 0;
    const rate = actualExcessRate !== null ? actualExcessRate : (limits?.mileageRate || 0);
    
    const mileageCost = totalActualKm * rate;

    const totalExpenses = mileageCost + (costs.paging || 0) + (costs.highway || 0) + (costs.batta || 0) + (costs.tickets || 0) + (costs.other || 0);

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Driver Log Sheet - ${tourName}</title>
      <style>
        @page { size: A4; margin: 10mm 15mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: "Times New Roman", Times, Georgia, serif;
          font-size: 11px;
          line-height: 1.4;
          color: #2c2c2c;
          background: white;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }

        /* Header (Matching Voucher Style) */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-bottom: 8px;
          border-bottom: 1.5px solid #2c2c2c;
          margin-bottom: 20px;
        }
        .logo { height: 40px; width: auto; }
        .company-info {
          text-align: right;
          font-size: 9px;
          color: #555;
          line-height: 1.4;
        }
        .company-name {
          font-family: sans-serif;
          font-size: 14px;
          font-weight: bold;
          color: #2c2c2c;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        /* Title */
        .title-section {
          text-align: center;
          margin-bottom: 25px;
        }
        .title-section h1 {
          font-size: 18px;
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

        /* Info Grid */
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          border-top: 1px solid #e5e0d8;
          border-left: 1px solid #e5e0d8;
          margin-bottom: 20px;
        }
        .detail-cell {
          padding: 6px 10px;
          border-bottom: 1px solid #e5e0d8;
          border-right: 1px solid #e5e0d8;
        }
        .detail-cell.full {
          grid-column: 1 / -1;
        }
        .detail-label {
          font-family: sans-serif;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #999;
          margin-bottom: 2px;
        }
        .detail-value {
          font-size: 12px;
          color: #2c2c2c;
          font-weight: bold;
        }
        .detail-value.accent { color: #c09853; }

        .flex-row {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .text-italic { font-style: italic; color: #888; font-size: 9px; min-width: 60px; }

        /* Tables */
        .section-title {
          font-size: 11px;
          font-style: italic;
          color: #2c2c2c;
          margin: 15px 0 8px 0;
          padding-bottom: 3px;
          border-bottom: 1px solid #c09853;
          display: inline-block;
        }

        .clean-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .clean-table th {
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #888;
          font-weight: normal;
          padding: 8px 10px;
          text-align: center;
          border-bottom: 1.5px solid #2c2c2c;
        }
        .clean-table td {
          padding: 8px 10px;
          border-bottom: 1px solid #eee;
          font-size: 10px;
          color: #2c2c2c;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }

        /* Cost Table */
        .cost-table {
            width: 300px;
            margin-left: auto;
            border-collapse: collapse;
        }
        .cost-table td {
            padding: 6px 8px;
            border-bottom: 1px solid #e5e0d8;
        }
        .cost-label { font-style: italic; color: #888; font-size: 9px; }
        .cost-value { font-weight: bold; text-align: right; font-size: 11px; }
        .total-row td { border-bottom: 1.5px solid #2c2c2c; padding-top: 10px; }
        .total-price { color: #c09853; font-size: 13px; }
        .balance-row td { border-bottom: none; padding-top: 15px; }
        .balance-due { font-size: 15px; font-weight: 900; }

        .bg-highlight { background-color: #faf9f7; }

      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <img src="${logoUrl}" alt="TravX" class="logo" />
          <div class="company-info">
            <div class="company-name">TravX</div>
            ${company?.address || "63A, Old Road, Pannipitiya, Sri Lanka"}<br>
            ${company?.phone || "+94 77 346 9998"} &nbsp;·&nbsp; ${company?.email || "info@serendiaholidays.com"}
          </div>
        </div>

        <!-- Title -->
        <div class="title-section">
          <h1>Driver Log Sheet</h1>
          <div class="title-line"></div>
        </div>

        <!-- Tour Details -->
        <div class="details-grid">
          <div class="detail-cell full">
            <div class="detail-label">Guest Name</div>
            <div class="detail-value accent">${tour?.guestName || "—"}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">Tour Number</div>
            <div class="detail-value">${tourName || "—"}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">Driver Name</div>
            <div class="detail-value">${tour?.driverName || "Not Assigned"}</div>
          </div>
          <div class="detail-cell">
             <div class="flex-row">
                <div class="text-italic">Pax</div>
                <div class="detail-value">${tour?.paxInfo || "—"}</div>
             </div>
          </div>
          <div class="detail-cell">
             <div class="flex-row">
                <div class="text-italic">Vehicle</div>
                <div class="detail-value">${tour?.driverVehicle || "—"}</div>
             </div>
          </div>
          <div class="detail-cell">
             <div class="flex-row">
                <div class="text-italic">Arrival</div>
                <div class="detail-value">${tour?.arrivalDate || "—"} ${tour?.arrivalFlight || ""}</div>
             </div>
          </div>
          <div class="detail-cell">
             <div class="flex-row">
                <div class="text-italic">Departure</div>
                <div class="detail-value">${tour?.departureDate || "—"} ${tour?.departureFlight || ""}</div>
             </div>
          </div>
          ${editableLimits.totalMileageLimit > 0 ? `
          <div class="detail-cell bg-highlight">
             <div class="flex-row">
                <div class="text-italic">Package KM</div>
                <div class="detail-value">${editableLimits.totalMileageLimit}</div>
             </div>
          </div>
          <div class="detail-cell bg-highlight">
             <div class="flex-row">
                <div class="text-italic">Batta Total</div>
                <div class="detail-value">${editableLimits.battaLimit}</div>
             </div>
          </div>
          ` : ''}
        </div>

        <!-- Daily Log -->
        <div class="section-title">Daily Log (Driver Input)</div>
        <table class="clean-table">
          <thead>
            <tr>
              <th style="width: 15%;">Date</th>
              <th style="width: 55%; text-align: left;">Itinerary</th>
              <th style="width: 15%;">Package KM</th>
              <th style="width: 15%;">Actual KM</th>
            </tr>
          </thead>
          <tbody>
            ${days.map((day: any) => `
              <tr>
                <td class="text-center" style="color: #555;">${day.date ? format(parseISO(day.date), "dd-MMM") : "—"}</td>
                <td>${day.route || "—"}</td>
                <td class="text-center" style="color: #555;">${day.estimatedKm || 0}</td>
                <td class="text-center font-bold" style="background-color: #faf9f7;">${day.actualKm || 0}</td>
              </tr>
            `).join('')}
            <tr>
                <td colspan="2" class="text-right cost-label" style="padding: 12px 10px;">TOTAL KM (DRIVER VS ACTUAL)</td>
                <td class="text-center font-bold" style="font-size: 11px; border-bottom: 1.5px solid #2c2c2c;">${totalEstimatedKm.toLocaleString()}</td>
                <td class="text-center font-bold" style="font-size: 11px; border-bottom: 1.5px solid #2c2c2c; background-color: #f5f4ef; color: #c09853;">${totalActualKm.toLocaleString()}</td>
            </tr>
            <tr>
                <td colspan="2" class="text-right cost-label" style="padding: 12px 10px;">Rate (km)</td>
                <td class="text-center font-bold" style="color: #555; font-size: 10px;">${(limits?.mileageRate || 0).toFixed(2)}</td>
                <td class="text-center font-bold" style="background-color: #f5f4ef; color: #c09853;">${rate.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Costs Calculation -->
        <table class="cost-table">
            <tr>
                <td class="cost-label">Total Mileage Cost</td>
                <td class="cost-value" style="color: #999; font-size: 9px; font-weight: normal; padding-right: 20px;">
                    ${(totalEstimatedKm * rate).toLocaleString()}
                </td>
                <td class="cost-value">${mileageCost.toLocaleString()}</td>
            </tr>
            <tr>
                <td class="cost-label">Paging Fee</td>
                <td class="cost-value" colspan="2">${(costs.paging || 0).toLocaleString()}</td>
            </tr>
            <tr>
                <td class="cost-label">Highway Cost</td>
                <td class="cost-value" colspan="2">${(costs.highway || 0).toLocaleString()}</td>
            </tr>
            <tr>
                <td class="cost-label">Batta</td>
                <td class="cost-value" colspan="2">${(costs.batta || 0).toLocaleString()}</td>
            </tr>
            <tr>
                <td class="cost-label">Tickets / Entry Fees</td>
                <td class="cost-value" colspan="2">${(costs.tickets || 0).toLocaleString()}</td>
            </tr>
            <tr class="total-row">
                <td class="cost-label" style="font-family: sans-serif; font-weight: bold; font-size: 10px; color: #2c2c2c;">TOTAL PRICE</td>
                <td class="cost-value total-price" colspan="2">Rs. ${totalExpenses.toLocaleString()}</td>
            </tr>
            <tr>
                <td class="cost-label">Tour Advance</td>
                <td class="cost-value" colspan="2">Rs. ${(tourAdvance || 0).toLocaleString()}</td>
            </tr>
            <tr class="balance-row">
                <td class="cost-label" style="font-family: sans-serif; font-weight: bold; font-size: 11px; color: #2c2c2c;">Balance Due</td>
                <td class="cost-value balance-due" colspan="2">Rs. ${(totalExpenses - (tourAdvance || 0)).toLocaleString()}</td>
            </tr>
        </table>
      </div>
    </body>
    </html>
    `;
}
