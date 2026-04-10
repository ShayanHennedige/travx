import { createClient } from '@/lib/supabase/server';

export async function listTestEmails() {
    const supabase = await createClient();

    // Inspect tables
    const { data: listTours, error: tourError } = await supabase.from('tours').select('*').limit(1);
    const { data: listInq, error: inqError } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    const { data: listVouchers, error: voucherError } = await supabase
        .from('hotel_vouchers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    return { listTours, tourError, listInq, inqError, listVouchers, voucherError };
}
