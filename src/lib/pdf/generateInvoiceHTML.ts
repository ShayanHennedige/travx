import { CustomerInvoice } from "@/lib/validations/invoice";
import { format } from "date-fns";
import { numberToWords } from "@/lib/utils/numberToWords";

export function generateInvoiceHTML(invoice: CustomerInvoice & { id: string }, logoBase64?: string): string {
    const {
        invoice_no,
        invoice_date,
        customer_name,
        customer_company,
        tour_reference,
        qty_dbl,
        qty_sgl,
        qty_tpl,
        qty_qud,
        no_of_pax,
        subtotal,
        bank_charges = 0,
        tax_amount,
        total_amount,
        currency = "USD",
        notes,
        package_description
    } = invoice;

    const isExtraInvoice = (invoice as any).payment_terms === "extra_invoice";
    const invoiceTitle = isExtraInvoice ? "Extra Invoice" : "Invoice";
    const totalPax = no_of_pax || ((qty_dbl ?? 0) * 2) + (qty_sgl ?? 0) + ((qty_tpl ?? 0) * 3) + ((qty_qud ?? 0) * 4);
    const amountInWords = numberToWords(total_amount ?? 0);

    const formattedDate = invoice_date
        ? (() => {
            const date = new Date(invoice_date);
            const day = date.getDate();
            const suffix = (day === 1 || day === 21 || day === 31) ? 'st'
                : (day === 2 || day === 22) ? 'nd'
                    : (day === 3 || day === 23) ? 'rd' : 'th';
            return `${day}${suffix} ${format(date, "MMMM yyyy")}`;
        })()
        : format(new Date(), "do MMMM yyyy");

    const logoHtml = logoBase64
        ? `<img src="${logoBase64}" alt="TravX" style="height: 42px; width: auto;">`
        : `<div style="font-size: 13px; font-weight: bold; color: #2c2c2c; letter-spacing: 2px; text-transform: uppercase;">TRAVX</div>`;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${invoiceTitle} - ${invoice_no}</title>
    <style>
        @page { size: A4; margin: 14mm 16mm 16mm 16mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: "Times New Roman", Times, Georgia, serif;
            font-size: 10.5px;
            color: #2c2c2c;
            line-height: 1.55;
        }
        table { width: 100%; border-collapse: collapse; }

        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding-bottom: 10px;
            border-bottom: 1.5px solid #2c2c2c;
            margin-bottom: 20px;
        }
        .company-info {
            text-align: right;
            font-size: 9px;
            color: #555;
            line-height: 1.45;
        }
        .company-name {
            font-size: 13px;
            font-weight: bold;
            color: #2c2c2c;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 2px;
        }

        /* Title */
        .title {
            text-align: left;
            margin-bottom: 18px;
        }
        .title h1 {
            font-size: 18px;
            font-weight: normal;
            font-style: italic;
            color: #2c2c2c;
            letter-spacing: 0.5px;
        }
        .title-line {
            width: 50px;
            height: 1.5px;
            background: #c09853;
            margin: 6px 0;
        }

        /* Meta */
        .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
            border-top: 1px solid #e5e0d8;
            border-left: 1px solid #e5e0d8;
            margin-bottom: 16px;
        }
        .meta-cell {
            padding: 7px 10px;
            border-bottom: 1px solid #e5e0d8;
            border-right: 1px solid #e5e0d8;
        }
        .meta-label {
            font-size: 7.5px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #999;
        }
        .meta-value {
            font-size: 11px;
            color: #2c2c2c;
            font-weight: bold;
            margin-top: 1px;
        }

        /* Items Table */
        .items-table th {
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            color: #888;
            font-weight: normal;
            padding: 6px 10px;
            text-align: left;
            border-bottom: 1.5px solid #2c2c2c;
        }
        .items-table td {
            padding: 10px;
            border-bottom: 1px solid #eee;
            font-size: 10.5px;
        }
        .items-table .amt {
            text-align: right;
            font-weight: bold;
            vertical-align: middle;
        }
        .items-table .desc {
            text-align: left;
            line-height: 1.6;
        }

        /* Totals */
        .totals-section {
            margin-top: 12px;
            width: 50%;
            margin-left: auto;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 10.5px;
            border-bottom: 1px dotted #e5e0d8;
        }
        .total-row.grand {
            border-top: 1.5px solid #2c2c2c;
            border-bottom: 1.5px solid #2c2c2c;
            padding: 6px 0;
            margin-top: 4px;
            font-weight: bold;
            font-size: 12px;
        }
        .amount-words {
            margin-top: 8px;
            font-style: italic;
            font-size: 9.5px;
            color: #888;
        }

        /* Note */
        .note {
            margin: 14px 0;
            font-size: 10px;
            color: #c09853;
            font-weight: bold;
        }

        /* Section Title */
        .section-title {
            font-size: 12px;
            font-style: italic;
            color: #2c2c2c;
            margin-bottom: 8px;
            padding-bottom: 3px;
            border-bottom: 1px solid #c09853;
            display: inline-block;
        }

        /* Bank Table */
        .bank-table td {
            padding: 4px 10px;
            font-size: 10px;
            border-bottom: 1px solid #eee;
        }
        .bank-table .blbl {
            width: 25%;
            color: #888;
            font-size: 9px;
        }
        .bank-table .bval { color: #2c2c2c; }

        /* Signature */
        .signature {
            margin-top: 24px;
        }
        .sig-name {
            font-family: 'Brush Script MT', cursive;
            font-size: 18pt;
            font-style: italic;
            margin-bottom: 20px;
            color: #2c2c2c;
        }
        .sig-line {
            width: 160px;
            border-top: 1px solid #2c2c2c;
            padding-top: 4px;
            font-size: 7.5px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #999;
        }

        /* Policies */
        .policies {
            margin-top: 18px;
            font-size: 9px;
            line-height: 1.5;
            color: #555;
        }
        .policies h4 {
            font-size: 9px;
            font-style: italic;
            color: #2c2c2c;
            margin-bottom: 4px;
            border-bottom: 1px solid #c09853;
            display: inline-block;
            padding-bottom: 2px;
        }
        .policies ul { margin: 0 0 10px 15px; padding: 0; }
        .policies li { margin-bottom: 2px; }

        /* Footer */
        .footer {
            margin-top: 18px;
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
            <div class="company-name">TravX</div>
            63A, Old Road, Pannipitiya, Sri Lanka<br>
            +94 77 346 9998 &nbsp;·&nbsp; info@serendiaholidays.com
        </div>
    </div>

    <!-- Title -->
    <div class="title">
        <h1>${invoiceTitle}</h1>
        <div class="title-line"></div>
    </div>

    <!-- Meta -->
    <div class="meta-grid">
        <div class="meta-cell">
            <div class="meta-label">Date</div>
            <div class="meta-value">${formattedDate}</div>
        </div>
        <div class="meta-cell">
            <div class="meta-label">Invoice Number</div>
            <div class="meta-value">${invoice_no}</div>
        </div>
        <div class="meta-cell">
            <div class="meta-label">Name of Travel Agent</div>
            <div class="meta-value">${customer_name || ''}</div>
        </div>
        <div class="meta-cell">
            <div class="meta-label">Name of Agent Company</div>
            <div class="meta-value">${customer_company || ''}</div>
        </div>
        <div class="meta-cell">
            <div class="meta-label">Tour Reference</div>
            <div class="meta-value">${tour_reference || ''}</div>
        </div>
        <div class="meta-cell">
            <div class="meta-label">Client Name</div>
            <div class="meta-value">${notes || ''}</div>
        </div>
        <div class="meta-cell">
            <div class="meta-label">Number of Pax</div>
            <div class="meta-value">${totalPax.toString().padStart(2, '0')}</div>
        </div>
    </div>

    <!-- Items -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 10%;">Item</th>
                <th style="width: 60%;">Description</th>
                <th style="width: 30%; text-align: right;">Amount (${currency})</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="text-align: center; vertical-align: middle;">01</td>
                <td class="desc">${package_description ? package_description.replace(/\n/g, '<br>') : 'Tour Package Sri Lanka'}</td>
                <td class="amt">${(subtotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
        </tbody>
    </table>

    <!-- Totals -->
    <div class="totals-section">
        <div class="total-row"><span>Sub Total</span><span>${(subtotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        <div class="total-row"><span>Bank Charges</span><span>${(bank_charges ?? 0) > 0 ? (bank_charges ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span></div>
        <div class="total-row"><span>Tax</span><span>${(tax_amount ?? 0) > 0 ? (tax_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</span></div>
        <div class="total-row grand"><span>Total Payable (${currency})</span><span>${(total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
    </div>
    <div class="amount-words">${currency} ${amountInWords.toUpperCase()} ONLY</div>

    <p class="note">** Full payment should be made 30 days prior to arrival</p>

    <!-- Bank Details -->
    <div class="section-title">Bank Details — USD Account</div>
    <table class="bank-table">
        <tr><td class="blbl">Bank Name</td><td class="bval">Sampath Bank PCL</td></tr>
        <tr><td class="blbl">Bank Code</td><td class="bval">7278</td></tr>
        <tr><td class="blbl">Bank Branch</td><td class="bval">Maharagama Super</td></tr>
        <tr><td class="blbl">Bank Address</td><td class="bval">200, High Level Road, Maharagama, Sri Lanka</td></tr>
        <tr><td class="blbl">Branch Code</td><td class="bval">092</td></tr>
        <tr><td class="blbl">Account Name</td><td class="bval">TravX Travel Management</td></tr>
        <tr><td class="blbl">F E F A Account No.</td><td class="bval">5092 3100 0143</td></tr>
        <tr><td class="blbl">SWIFT Code</td><td class="bval">BSAMLKLX</td></tr>
    </table>

    <!-- Signature -->
    <div class="signature" style="page-break-after: always;">
        <img src="https://axcfwwdahunzxsdeohkv.supabase.co/storage/v1/object/public/signature/WhatsApp%20Image%202026-04-08%20at%2011.16.09.jpeg" alt="Authorized Signature" style="height: 70px; width: auto; margin-left: -40px; display: block;">
    </div>

    <!-- Policies (Page 2) -->
    <div class="policies">
        <h4>Important Instructions</h4>
        <ul>
            <li>50% deposit at the time of booking. Balance payment before 1 month prior to departure.</li>
            <li>Prices subject to change due to exchange fluctuations. Payment deadlines must be strictly adhered to.</li>
            <li>Any government LEVIES, TAXES and VAT introduced in the future will be applicable to the Tour Package.</li>
        </ul>
        <h4>Cancellation Policy</h4>
        <p>In the event you cancel your tour voluntarily, the following percentages of the package price will be refunded by TravX Travel Management:</p>
        <ul>
            <li>More than 91 days prior to departure – 100% Refundable</li>
            <li>61 – 90 days prior to departure – 75% Refundable</li>
            <li>31 – 60 days prior to departure – 25% Refundable</li>
            <li>0 – 30 days prior to departure – No Refund (0%)</li>
        </ul>
    </div>

    <!-- Footer -->
    <div class="footer">
        <div class="footer-line"></div>
        TravX
    </div>
</body>
</html>
    `.trim();
}
