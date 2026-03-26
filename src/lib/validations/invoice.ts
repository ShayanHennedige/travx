import { z } from "zod";

// Invoice statuses
export const invoiceStatuses = [
    "draft",
    "confirmed",
    "sent",
    "paid",
    "overdue",
    "cancelled",
] as const;

// Customer Invoice schema
export const customerInvoiceSchema = z.object({
    id: z.string().uuid().optional(),
    invoice_no: z.string().optional(), // Auto-generated
    invoice_date: z.string().optional(),

    // Tour/Costing Reference
    tour_id: z.string().uuid().optional().nullable(),
    itinerary_id: z.string().uuid().optional().nullable(),
    costing_sheet_id: z.string().uuid().optional().nullable(),
    tour_reference: z.string().optional(),

    // Customer Info
    customer_name: z.string().min(1, "Customer name is required"),
    customer_company: z.string().optional(),
    customer_email: z.string().email().optional().or(z.literal("")),
    customer_address: z.string().optional(),

    // Rates (absorbed from costing sheet)
    rate_sgl: z.number().min(0).optional(),
    rate_dbl: z.number().min(0).optional(),
    rate_tpl: z.number().min(0).optional(),
    rate_qud: z.number().min(0).optional(),

    // Quantities
    qty_sgl: z.number().int().min(0).optional(),
    qty_dbl: z.number().int().min(0).optional(),
    qty_tpl: z.number().int().min(0).optional(),
    qty_qud: z.number().int().min(0).optional(),
    no_of_pax: z.number().int().min(1).optional(),

    // Totals
    subtotal: z.number().min(0).optional(),
    bank_charges: z.number().min(0).optional(),
    tax_percentage: z.number().min(0).max(100).optional(),
    tax_amount: z.number().min(0).optional(),
    total_amount: z.number().min(0).optional(),
    currency: z.string().default("USD"),

    // Payment Info
    payment_terms: z.string().optional(),
    due_date: z.string().optional(),
    paid_amount: z.number().min(0).optional(),

    // Status
    status: z.enum(invoiceStatuses).default("draft"),

    // Notes & Description
    notes: z.string().optional(),
    package_description: z.string().optional(),
});

// PNL Record schema
export const pnlRecordSchema = z.object({
    id: z.string().uuid().optional(),
    tour_id: z.string().uuid().optional().nullable(),
    costing_sheet_id: z.string().uuid().optional().nullable(),
    tour_reference: z.string().optional(),
    period_start: z.string().optional(),
    period_end: z.string().optional(),

    // Income
    customer_invoice_total: z.number().min(0).default(0),
    other_income: z.number().min(0).default(0),

    // Expenses
    hotel_expenses: z.number().min(0).default(0),
    driver_expenses: z.number().min(0).default(0),
    staff_payments: z.number().min(0).default(0),
    supplier_expenses: z.number().min(0).default(0),
    other_expenses: z.number().min(0).default(0),

    // Status
    status: z.enum(["draft", "finalized", "approved"]).default("draft"),

    // Notes
    notes: z.string().optional(),
});

export type CustomerInvoice = z.infer<typeof customerInvoiceSchema>;
export type PnlRecord = z.infer<typeof pnlRecordSchema>;
export type InvoiceStatus = typeof invoiceStatuses[number];

// Helper to calculate invoice totals
export function calculateInvoiceTotals(invoice: Partial<CustomerInvoice>): {
    subtotal: number;
    tax_amount: number;
    total_amount: number;
} {
    const subtotal =
        (Number(invoice.rate_sgl) || 0) * (Number(invoice.qty_sgl) || 0) +
        (Number(invoice.rate_dbl) || 0) * (Number(invoice.qty_dbl) || 0) +
        (Number(invoice.rate_tpl) || 0) * (Number(invoice.qty_tpl) || 0) +
        (Number(invoice.rate_qud) || 0) * (Number(invoice.qty_qud) || 0);

    const bankCharges = Number(invoice.bank_charges) || 0;
    const taxPercentage = Number(invoice.tax_percentage) || 0;
    const tax_amount = (subtotal * taxPercentage) / 100;
    const total_amount = subtotal + bankCharges + tax_amount;

    return { subtotal, tax_amount, total_amount };
}

// Helper to calculate PNL summary
export function calculatePnlSummary(pnl: Partial<PnlRecord>): {
    total_income: number;
    total_expenses: number;
    net_profit: number;
    profit_margin: number;
} {
    const total_income = (pnl.customer_invoice_total || 0) + (pnl.other_income || 0);
    const total_expenses =
        (pnl.hotel_expenses || 0) +
        (pnl.driver_expenses || 0) +
        (pnl.staff_payments || 0) +
        (pnl.supplier_expenses || 0) +
        (pnl.other_expenses || 0);
    const net_profit = total_income - total_expenses;
    const profit_margin = total_income > 0 ? (net_profit / total_income) * 100 : 0;

    return { total_income, total_expenses, net_profit, profit_margin };
}
