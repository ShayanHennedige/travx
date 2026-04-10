
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Reference Generator Utilities (inline to avoid import issues) ---
const COUNTRY_CODES: Record<string, string> = {
    "Australia": "AUS",
    "United Kingdom": "GBR",
    "United States": "USA",
    "Canada": "CAN",
    "Germany": "DEU",
    "France": "FRA",
    "Italy": "ITA",
    "Spain": "ESP",
    "China": "CHN",
    "India": "IND",
    "Japan": "JPN",
    "Sri Lanka": "LKA",
    "Russia": "RUS",
    "New Zealand": "NZL",
    "Singapore": "SGP",
    "Malaysia": "MYS",
    "United Arab Emirates": "ARE",
    "Saudi Arabia": "SAU",
    "Qatar": "QAT",
    "Kuwait": "KWT",
    "Oman": "OMN",
    "Bahrain": "BHR",
    "Netherlands": "NLD",
    "Switzerland": "CHE",
    "Sweden": "SWE",
    "Norway": "NOR",
    "Denmark": "DNK",
    "Finland": "FIN",
    "Belgium": "BEL",
    "Austria": "AUT",
    "Poland": "POL",
    "Czech Republic": "CZE",
    "Hungary": "HUN",
    "Portugal": "PRT",
    "Greece": "GRC",
    "Turkey": "TUR",
    "Israel": "ISR",
    "South Africa": "ZAF",
    "Brazil": "BRA",
    "Argentina": "ARG",
    "Mexico": "MEX",
    "Thailand": "THA",
    "Vietnam": "VNM",
    "Indonesia": "IDN",
    "Philippines": "PHL",
    "South Korea": "KOR",
};

function getCountryCode(countryName: string): string {
    if (!countryName) return "UNK";
    const normalized = countryName.trim();
    if (COUNTRY_CODES[normalized]) {
        return COUNTRY_CODES[normalized];
    }
    return normalized.substring(0, 3).toUpperCase();
}

function generateBaseReferenceNumber(country: string, date: Date | string = new Date()): string {
    const code = getCountryCode(country);
    const dateStr = format(new Date(date), "yyyyMMdd");
    return `${code}${dateStr}`;
}

// --- Main Backfill Logic ---
async function backfill() {
    console.log("Starting backfill...");

    // 1. Fetch inquiries with missing inquiry_number
    const { data: inquiries, error } = await supabase
        .from("inquiries")
        .select("id, country, created_at, inquiry_number")
        .is("inquiry_number", null);

    if (error) {
        console.error("Error fetching inquiries:", error);
        process.exit(1);
    }

    if (!inquiries || inquiries.length === 0) {
        console.log("No inquiries found with missing reference numbers.");
        return;
    }

    console.log(`Found ${inquiries.length} inquiries to backfill.`);

    for (const inquiry of inquiries) {
        try {
            const country = inquiry.country || "Unknown";
            const createdAt = new Date(inquiry.created_at);
            const baseRef = generateBaseReferenceNumber(country, createdAt);

            console.log(`Processing ${inquiry.id} (${country}) -> Base: ${baseRef}`);

            // Check for existing to determine suffix
            // Note: This check runs against the live DB, so it sees previous updates in this loop if they were committed.
            const { data: existing, error: searchError } = await supabase
                .from("inquiries")
                .select("inquiry_number")
                .ilike("inquiry_number", `${baseRef}%`);

            if (searchError) {
                console.error(`Error checking existence for ${baseRef}:`, searchError);
                continue;
            }

            let finalRef = baseRef;
            if (existing && existing.length > 0) {
                let maxSuffix = 0;
                let hasExactMatch = false;

                existing.forEach((row) => {
                    if (row.inquiry_number === baseRef) {
                        hasExactMatch = true;
                    } else {
                        const parts = row.inquiry_number.split("-");
                        if (parts.length > 1) {
                            const s = parseInt(parts[parts.length - 1]);
                            if (!isNaN(s) && s > maxSuffix) maxSuffix = s;
                        }
                    }
                });

                if (hasExactMatch || maxSuffix > 0) {
                    finalRef = `${baseRef}-${maxSuffix + 1}`;
                }
            }

            console.log(`  Assigning: ${finalRef}`);

            // Update
            const { error: updateError } = await supabase
                .from("inquiries")
                .update({ inquiry_number: finalRef })
                .eq("id", inquiry.id);

            if (updateError) {
                console.error(`  FAILED to update ${inquiry.id}:`, updateError.message);
            } else {
                console.log(`  SUCCESS: Updated ${inquiry.id}`);
            }

        } catch (err) {
            console.error(`  Unexpected error processing ${inquiry.id}:`, err);
        }
    }

    console.log("Backfill complete.");
}

backfill();
