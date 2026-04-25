import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { launchBrowser } from "@/lib/pdf/browser";

export const maxDuration = 60;
import { format } from "date-fns";
import { formatAmountInWords } from "@/lib/validations/paymentVoucher";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch voucher data
    const { data: voucher, error } = await supabase
        .from("payment_vouchers")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !voucher) {
        return NextResponse.json(
            { error: "Payment voucher not found" },
            { status: 404 }
        );
    }

    let browser;
    try {
        browser = await launchBrowser();
        const page = await browser.newPage();

        const html = generatePaymentVoucherHTML(voucher);
        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
        });

        const filename = `Payment_Voucher_${voucher.voucher_no}.pdf`;
        const { searchParams } = new URL(request.url);
        const isView = searchParams.get("view") === "true";
        const disposition = isView ? "inline" : `attachment; filename="${filename}"`;

        return new NextResponse(Buffer.from(pdf) as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": disposition,
            },
        });
    } catch (e) {
        console.error("Error generating payment voucher PDF:", e);
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

function generatePaymentVoucherHTML(voucher: any): string {
    const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL || 'https://axcfwwdahunzxsdeohkv.supabase.co/storage/v1/object/public/logo/Serendia.png';
    const voucherDate = voucher.voucher_date
        ? format(new Date(voucher.voucher_date), "do MMMM yyyy")
        : format(new Date(), "do MMMM yyyy");

    const amountInWords = voucher.amount_in_words || formatAmountInWords(voucher.total_usd || 0);

    const paymentModes = [
        { label: "Cash", checked: voucher.payment_mode === "Cash" },
        { label: "Bank Transfer", checked: voucher.payment_mode === "Bank Transfer" },
        { label: "Cheque", checked: voucher.payment_mode === "Cheque" },
        { label: "Credit Card", checked: voucher.payment_mode === "Credit Card" },
        { label: "Debit Card", checked: voucher.payment_mode === "Debit Card" },
    ];

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Payment Voucher - ${voucher.voucher_no}</title>
    <style>
        @page { size: A4; margin: 14mm 16mm 16mm 16mm; }
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
            align-items: flex-end;
            padding-bottom: 10px;
            border-bottom: 1.5px solid #2c2c2c;
            margin-bottom: 16px;
        }
        .logo { height: 42px; width: auto; }
        .company-info { text-align: right; font-size: 9px; color: #555; line-height: 1.45; }
        .company-name { font-size: 13px; font-weight: bold; color: #2c2c2c; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 2px; }

        /* Title */
        .title-section { text-align: center; margin-bottom: 14px; }
        .title-section h1 { font-size: 16px; font-weight: normal; font-style: italic; color: #2c2c2c; }
        .title-line { width: 50px; height: 1.5px; background: #c09853; margin: 5px auto; }

        /* Meta Grid */
        .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
            border-top: 1px solid #e5e0d8;
            border-left: 1px solid #e5e0d8;
            margin-bottom: 14px;
        }
        .meta-cell { padding: 6px 10px; border-bottom: 1px solid #e5e0d8; border-right: 1px solid #e5e0d8; }
        .meta-label { font-size: 7px; text-transform: uppercase; letter-spacing: 1.5px; color: #999; }
        .meta-value { font-size: 10.5px; color: #2c2c2c; font-weight: bold; margin-top: 1px; }

        /* Section Title */
        .section-title { font-size: 11px; font-style: italic; color: #2c2c2c; margin: 12px 0 6px 0; padding-bottom: 3px; border-bottom: 1px solid #c09853; display: inline-block; }

        /* Description Table */
        .desc-table td { padding: 5px 10px; border-bottom: 1px solid #eee; font-size: 10px; }
        .desc-table .dlbl { color: #888; font-size: 9px; width: 25%; }

        /* Amount Box */
        .amount-box { margin-top: 10px; width: 55%; margin-left: auto; border: 1px solid #e5e0d8; padding: 10px 14px; }
        .amount-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px; padding-bottom: 3px; border-bottom: 1px dotted #e5e0d8; }
        .amount-row:last-child { border-bottom: none; }
        .amount-row.total { font-weight: bold; border-top: 1.5px solid #2c2c2c; border-bottom: none; padding-top: 5px; margin-top: 3px; font-size: 11px; color: #c09853; }
        .amount-words { font-size: 9px; color: #888; font-style: italic; margin-top: 6px; }

        /* Payment Modes */
        .payment-modes { display: flex; gap: 14px; flex-wrap: wrap; padding: 6px 0; }
        .payment-mode-item { display: flex; align-items: center; gap: 4px; font-size: 10px; }
        .checkbox { display: inline-block; width: 11px; height: 11px; border: 1px solid #2c2c2c; position: relative; border-radius: 2px; }
        .checkbox.checked::after { content: "✓"; position: absolute; top: -2px; left: 1px; font-size: 9px; font-weight: bold; color: #c09853; }

        /* Cheque/Bank */
        .detail-row { display: flex; gap: 8px; padding: 5px 0; border-bottom: 1px solid #eee; font-size: 10px; }
        .detail-row em { color: #888; font-size: 9px; min-width: 120px; }

        /* Remarks */
        .remarks-box { border: 1px solid #e5e0d8; min-height: 40px; padding: 8px 10px; margin-top: 4px; font-size: 10px; color: #555; }

        /* Signatures */
        .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
        .sig-item { text-align: center; }
        .sig-line { border-bottom: 1px solid #2c2c2c; min-height: 28px; margin-bottom: 4px; font-size: 10px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 4px; }
        .sig-label { font-size: 7px; text-transform: uppercase; letter-spacing: 1.5px; color: #999; }

        /* Footer */
        .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #aaa; font-style: italic; }
        .footer-line { width: 40px; height: 1px; background: #c09853; margin: 6px auto; }

        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <img src="${logoUrl}" alt="TravX" class="logo">
        <div class="company-info">
            <div class="company-name">TravX</div>
            63A, Old Road, Pannipitiya, Sri Lanka<br>
            +94 77 346 9998 &nbsp;·&nbsp; info@serendiaholidays.com
        </div>
    </div>

    <!-- Title -->
    <div class="title-section">
        <h1>Payment Voucher</h1>
        <div class="title-line"></div>
    </div>

    <!-- Voucher Details -->
    <div class="meta-grid">
        <div class="meta-cell"><div class="meta-label">Voucher No</div><div class="meta-value">${voucher.voucher_no || ''}</div></div>
        <div class="meta-cell"><div class="meta-label">Date</div><div class="meta-value">${voucherDate}</div></div>
        <div class="meta-cell"><div class="meta-label">Hotel Invoice No</div><div class="meta-value">${voucher.hotel_invoice_no || ''}</div></div>
        <div class="meta-cell"><div class="meta-label">Tour Reference</div><div class="meta-value">${voucher.tour_reference || ''}</div></div>
        <div class="meta-cell"><div class="meta-label">Payee Type</div><div class="meta-value">${voucher.payee_type || ''}</div></div>
        <div class="meta-cell"><div class="meta-label">Payee Name</div><div class="meta-value">${voucher.payee_name || ''}</div></div>
    </div>

    <!-- Description -->
    <div class="section-title">Description</div>
    <table class="desc-table">
        <tr><td colspan="2">${voucher.description || `${voucher.nights_count || 0} nights accommodation`}</td></tr>
        <tr><td class="dlbl">Rate</td><td>USD ${(voucher.rate_usd || 0).toFixed(2)} × ${voucher.nights_count || 0} nights</td></tr>
    </table>

    <!-- Amount Summary -->
    <div class="amount-box">
        <div class="amount-row"><span>Total Amount (USD)</span><span><strong>$ ${(voucher.total_usd || 0).toFixed(2)}</strong></span></div>
        <div class="amount-row total"><span>Total Amount (LKR)</span><span>LKR ${(voucher.total_lkr || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
    </div>
    <div class="amount-words">${amountInWords}</div>

    <!-- Payment Details -->
    <div class="section-title">Payment Details</div>
    <div style="padding: 4px 0;">
        <div style="font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Mode of Payment</div>
        <div class="payment-modes">
            ${paymentModes.map(mode => `
                <div class="payment-mode-item">
                    <span class="checkbox ${mode.checked ? 'checked' : ''}"></span>
                    <span>${mode.label}</span>
                </div>
            `).join('')}
        </div>
    </div>

    <div class="detail-row"><em>Cheque / Transaction Ref</em> <span>${voucher.cheque_ref_no || '—'}</span></div>
    <div class="detail-row"><em>Bank Name</em> <span>${voucher.bank_name || '—'}</span></div>

    <!-- Remarks -->
    <div class="section-title">Remarks</div>
    <div class="remarks-box">${voucher.remarks || '—'}</div>

    <!-- Signatures -->
    <div class="sig-grid">
        <div class="sig-item"><div class="sig-line">${voucher.prepared_by || ''}</div><div class="sig-label">Prepared By</div></div>
        <div class="sig-item"><div class="sig-line">${voucher.checked_by || ''}</div><div class="sig-label">Checked By</div></div>
        <div class="sig-item"><div class="sig-line">${voucher.authorized_by || ''}</div><div class="sig-label">Authorized By</div></div>
        <div class="sig-item"><div class="sig-line">${voucherDate}</div><div class="sig-label">Date</div></div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <div class="footer-line"></div>
        TravX
    </div>
</body>
</html>
    `;
}
