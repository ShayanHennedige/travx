import { format } from "date-fns";

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

export function getCountryCode(countryName: string): string {
    if (!countryName) return "UNK";

    // normalized search
    const normalized = countryName.trim();

    // Direct lookup
    if (COUNTRY_CODES[normalized]) {
        return COUNTRY_CODES[normalized];
    }

    // Fallback: First 3 letters, uppercase
    return normalized.substring(0, 3).toUpperCase();
}

export function generateBaseReferenceNumber(country: string, date: Date | string = new Date()): string {
    const code = getCountryCode(country);
    const dateStr = format(new Date(date), "yyyyMMdd");
    return `${code}${dateStr}`;
}
