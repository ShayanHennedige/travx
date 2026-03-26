import { CostingSheet } from "@/lib/validations/costingSheet";
import { format } from "date-fns";

export function generateCostingSheetHTML(costingSheet: CostingSheet & { id: string, reference?: string, client_name?: string, passport_no?: string }, logoBase64?: string): string {
    const {
        id,
        reference,
        client_name,
        passport_no,
        agent_name,
        arrival_date,
        no_of_pax,
        hotel_type,
        meal_plan,
        quote_date,
        accommodation_data = [],
        transport_data = [],
        extras_data = [],
        meal_extras = { ex_lunch: 0, ex_dinner: 0, ex_breakfast: 0 },
        exchange_rate = 270,
        total_lkr = 0,
        total_usd = 0,
        per_person_usd = 0
    } = costingSheet;

    const accomTotals = accommodation_data.reduce(
        (acc, row) => ({
            sgl: acc.sgl + (row.sgl || 0),
            dbl: acc.dbl + (row.dbl || 0),
            tri: acc.tri + (row.tri || 0),
            quad: acc.quad + (row.quad || 0),
            quad_triple: acc.quad_triple + (row.quad_triple || 0),
        }),
        { sgl: 0, dbl: 0, tri: 0, quad: 0, quad_triple: 0 }
    );

    const formattedQuoteDate = quote_date
        ? format(new Date(quote_date), "do MMMM yyyy")
        : format(new Date(), "do MMMM yyyy");

    const formattedArrivalDate = arrival_date
        ? format(new Date(arrival_date), "do MMMM yyyy")
        : "N/A";

    const logoHtml = logoBase64
        ? `<img src="${logoBase64}" alt="TraveX" style="height: 110px; width: auto;">` 
        : `<div style="font-size: 13px; font-weight: bold; color: #2c2c2c; letter-spacing: 2px; text-transform: uppercase;">TRAVEX</div>`;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Costing Sheet - ${id.slice(0, 8)}</title>
    <style>
        @page { size: A4; margin: 12mm 14mm 14mm 14mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: "Times New Roman", Times, Georgia, serif;
            font-size: 10px;
            color: #2c2c2c;
            line-height: 1.5;
        }
        table { width: 100%; border-collapse: collapse; }

        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 0 16px;
            border-bottom: 2px solid #2c2c2c;
            margin-bottom: 20px;
        }
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
        .title {
            text-align: center;
            margin-bottom: 14px;
        }
        .title h1 {
            font-size: 16px;
            font-weight: normal;
            font-style: italic;
            color: #2c2c2c;
        }
        .title-line {
            width: 50px;
            height: 1.5px;
            background: #c09853;
            margin: 5px auto;
        }

        /* Meta Grid */
        .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
            border-top: 1px solid #e5e0d8;
            border-left: 1px solid #e5e0d8;
            margin-bottom: 14px;
        }
        .meta-cell {
            padding: 5px 8px;
            border-bottom: 1px solid #e5e0d8;
            border-right: 1px solid #e5e0d8;
        }
        .meta-label {
            font-size: 7px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #999;
        }
        .meta-value {
            font-size: 10px;
            color: #2c2c2c;
            font-weight: bold;
            margin-top: 1px;
        }

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

        /* Data Tables */
        .data-table th {
            font-size: 7.5px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #888;
            font-weight: normal;
            padding: 5px 6px;
            text-align: left;
            border-bottom: 1.5px solid #2c2c2c;
        }
        .data-table td {
            padding: 4px 6px;
            border-bottom: 1px solid #eee;
            font-size: 9.5px;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }

        .data-table tr.totals-row td {
            border-top: 1.5px solid #2c2c2c;
            border-bottom: 1.5px solid #2c2c2c;
            font-weight: bold;
            background: #faf9f6;
        }

        /* Summary Box */
        .summary-box {
            margin-top: 16px;
            width: 50%;
            margin-left: auto;
            border: 1px solid #e5e0d8;
            padding: 10px 14px;
        }
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 10px;
            padding-bottom: 4px;
            border-bottom: 1px dotted #e5e0d8;
        }
        .summary-row:last-child {
            border-bottom: none;
        }
        .summary-row.total {
            font-weight: bold;
            border-top: 1.5px solid #2c2c2c;
            border-bottom: none;
            padding-top: 6px;
            margin-top: 4px;
            font-size: 11px;
            color: #c09853;
        }

        /* Footer */
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 9px;
            color: #aaa;
            font-style: italic;
        }
        .footer-line {
            width: 40px;
            height: 1px;
            background: #c09853;
            margin: 6px auto;
        }

        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div>${logoHtml}</div>
        <div class="company-info">
            <div class="company-name">TraveX</div>
            63A, Old Road, Pannipitiya, Sri Lanka<br>
            +94 77 346 9998 &nbsp;·&nbsp; info@Travex.com
        </div>
    </div>

    <!-- Title -->
    <div class="title">
        <h1>Costing Sheet</h1>
        <div class="title-line"></div>
    </div>

    <!-- Meta -->
    <div class="meta-grid">
        <div class="meta-cell"><div class="meta-label">Date of Quote</div><div class="meta-value">${formattedQuoteDate}</div></div>
        <div class="meta-cell"><div class="meta-label">Arrival Date</div><div class="meta-value">${formattedArrivalDate}</div></div>
        <div class="meta-cell"><div class="meta-label">Agent Name</div><div class="meta-value">${agent_name || 'N/A'}</div></div>
        <div class="meta-cell"><div class="meta-label">No of Pax</div><div class="meta-value">${no_of_pax}</div></div>
        <div class="meta-cell"><div class="meta-label">Client Name</div><div class="meta-value">${client_name || 'Guest'}</div></div>
        <div class="meta-cell"><div class="meta-label">Hotel Type</div><div class="meta-value">${hotel_type || 'N/A'}</div></div>
        <div class="meta-cell"><div class="meta-label">Meal Plan</div><div class="meta-value">${meal_plan || 'BB'}</div></div>
        <div class="meta-cell"><div class="meta-label">Exchange Rate</div><div class="meta-value">${exchange_rate} LKR</div></div>
        <div class="meta-cell"><div class="meta-label">Reference</div><div class="meta-value">${reference || id.slice(0, 8)}</div></div>
        <div class="meta-cell"><div class="meta-label">Passport No</div><div class="meta-value">${passport_no || 'N/A'}</div></div>
    </div>

    <!-- Accommodation -->
    <div class="section-title">Accommodation</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 8%">Day</th>
                <th style="width: 24%">Location</th>
                <th style="width: 26%">Hotel</th>
                <th style="width: 12%">Basis</th>
                <th style="width: 7%" class="text-right">SGL</th>
                <th style="width: 7%" class="text-right">DBL</th>
                <th style="width: 7%" class="text-right">TPL</th>
                <th style="width: 7%" class="text-right">QUAD</th>
            </tr>
        </thead>
        <tbody>
            ${accommodation_data.map(row => `
                <tr>
                    <td class="text-center">${row.day}</td>
                    <td>${row.location}</td>
                    <td>${row.hotel}</td>
                    <td class="text-center">${row.basis}</td>
                    <td class="text-right">${row.sgl || ''}</td>
                    <td class="text-right">${row.dbl || ''}</td>
                    <td class="text-right">${row.tri || ''}</td>
                    <td class="text-right">${row.quad || ''}</td>
                </tr>
            `).join('')}
            <tr class="totals-row">
                <td colspan="4" class="text-right">Total</td>
                <td class="text-right">${accomTotals.sgl}</td>
                <td class="text-right">${accomTotals.dbl}</td>
                <td class="text-right">${accomTotals.tri}</td>
                <td class="text-right">${accomTotals.quad}</td>
            </tr>
        </tbody>
    </table>

    <!-- Transport -->
    <div class="section-title">Transport</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 55%">Description</th>
                <th style="width: 12%" class="text-right">Mileage</th>
                <th style="width: 15%" class="text-right">Rate</th>
                <th style="width: 18%" class="text-right">Total (LKR)</th>
            </tr>
        </thead>
        <tbody>
            ${transport_data.map(row => `
                <tr>
                    <td>${row.description}</td>
                    <td class="text-right">${row.mileage}</td>
                    <td class="text-right">${row.rate}</td>
                    <td class="text-right">${row.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <!-- Extras -->
    <div class="section-title">Extras</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 55%">Item / Description</th>
                <th style="width: 15%" class="text-center">Count</th>
                <th style="width: 30%" class="text-right">Price (USD)</th>
            </tr>
        </thead>
        <tbody>
            ${extras_data.map(row => `
                <tr>
                    <td>${row.name}${row.description ? ` — ${row.description}` : ''}</td>
                    <td class="text-center">${row.count}</td>
                    <td class="text-right">${row.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
            `).join('')}
            ${meal_extras.ex_lunch > 0 ? `<tr><td>Extra Lunch</td><td class="text-center">-</td><td class="text-right">${meal_extras.ex_lunch.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>` : ''}
            ${meal_extras.ex_dinner > 0 ? `<tr><td>Extra Dinner</td><td class="text-center">-</td><td class="text-right">${meal_extras.ex_dinner.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>` : ''}
            ${meal_extras.ex_breakfast > 0 ? `<tr><td>Extra Breakfast</td><td class="text-center">-</td><td class="text-right">${meal_extras.ex_breakfast.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>` : ''}
        </tbody>
    </table>

    <!-- Summary -->
    <div class="summary-box">
        <div class="summary-row"><span>Total Cost (LKR)</span><span>${total_lkr.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
        <div class="summary-row"><span>Per Person (${costingSheet.currency || 'USD'})</span><span>${costingSheet.currency || 'USD'} ${per_person_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
        ${costingSheet.period_description ? `<div class="summary-row"><span>Period</span><span>${costingSheet.period_description}</span></div>` : ''}
        <div class="summary-row total"><span>Grand Total (${costingSheet.currency || 'USD'})</span><span>${costingSheet.currency || 'USD'} ${total_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <div class="footer-line"></div>
        TraveX (Pvt) Ltd.
    </div>
</body>
</html>
  `.trim();
}
