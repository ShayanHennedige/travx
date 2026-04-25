import { z } from "zod";

// Payment modes
export const paymentModes = [
    "Cash",
    "Bank Transfer",
    "Cheque",
    "Credit Card",
    "Debit Card",
] as const;

// Payee types - for tour expenses
export const payeeTypes = [
    "Hotel",
    "Driver",
    "Miscellaneous",
] as const;

// Voucher categories
export const voucherCategories = [
    "hotel",
    "transport",
    "extras",
    "admin",
] as const;

// Voucher statuses
export const voucherStatuses = [
    "draft",
    "pending",
    "approved",
    "paid",
    "cancelled",
] as const;

// Payee schema
export const payeeSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1, "Payee name is required"),
    type: z.enum(payeeTypes),
    bank_name: z.string().optional(),
    account_number: z.string().optional(),
    contact_info: z.string().optional(),
    is_active: z.boolean().default(true),
});

// Payment voucher schema
export const paymentVoucherSchema = z.object({
    id: z.string().uuid().optional(),
    voucher_no: z.string().optional(), // Auto-generated
    voucher_date: z.string().optional(),

    // Tour/Costing Reference
    tour_id: z.string().uuid().optional().nullable(),
    costing_sheet_id: z.string().uuid().optional().nullable(),
    tour_reference: z.string().optional(),
    hotel_invoice_no: z.string().optional(),

    // Payee Information
    payee_id: z.string().uuid().optional().nullable(),
    payee_type: z.enum(payeeTypes),
    payee_name: z.string().min(1, "Payee name is required"),

    // Description
    description: z.string().optional(),
    nights_count: z.number().int().min(0).default(0),

    // Amounts
    rate_usd: z.number().min(0).default(0),
    total_usd: z.number().min(0).default(0),
    exchange_rate: z.number().min(0).default(300),
    total_lkr: z.number().min(0).default(0),
    amount_in_words: z.string().optional(),

    // Payment Method
    payment_mode: z.enum(paymentModes).optional().nullable(),
    cheque_ref_no: z.string().optional(),
    bank_name: z.string().optional(),

    // Remarks
    remarks: z.string().optional(),

    // Signatures
    prepared_by: z.string().optional(),
    checked_by: z.string().optional(),
    authorized_by: z.string().optional(),

    // Status
    status: z.enum(voucherStatuses).default("draft"),

    // Category
    voucher_category: z.enum(voucherCategories).default("hotel"),
});

export type Payee = z.infer<typeof payeeSchema>;
export type PaymentVoucher = z.infer<typeof paymentVoucherSchema>;
export type PaymentMode = typeof paymentModes[number];
export type PayeeType = typeof payeeTypes[number];
export type VoucherStatus = typeof voucherStatuses[number];
export type VoucherCategory = typeof voucherCategories[number];

// Helper function to convert number to words
export function numberToWords(amount: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (amount === 0) return 'Zero';
    if (amount < 0) return 'Minus ' + numberToWords(Math.abs(amount));

    let words = '';

    if (Math.floor(amount / 1000000) > 0) {
        words += numberToWords(Math.floor(amount / 1000000)) + ' Million ';
        amount %= 1000000;
    }

    if (Math.floor(amount / 1000) > 0) {
        words += numberToWords(Math.floor(amount / 1000)) + ' Thousand ';
        amount %= 1000;
    }

    if (Math.floor(amount / 100) > 0) {
        words += numberToWords(Math.floor(amount / 100)) + ' Hundred ';
        amount %= 100;
    }

    if (amount > 0) {
        if (words !== '') words += 'and ';
        if (amount < 20) {
            words += ones[amount];
        } else {
            words += tens[Math.floor(amount / 10)];
            if (amount % 10 > 0) {
                words += ' ' + ones[amount % 10];
            }
        }
    }

    return words.trim();
}

// Format USD amount to words
export function formatAmountInWords(usd: number): string {
    const dollars = Math.floor(usd);
    const cents = Math.round((usd - dollars) * 100);

    let result = 'USD ' + numberToWords(dollars);
    if (cents > 0) {
        result += ' and ' + numberToWords(cents) + ' Cents';
    }
    result += ' Only';

    return result;
}
