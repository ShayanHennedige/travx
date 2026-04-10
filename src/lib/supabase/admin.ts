import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with the service role key to bypass RLS.
 * This should ONLY be used in server-side contexts for specific authorized operations.
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.warn("Missing Supabase admin configuration. Falling back to anon key.");
        return null;
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
