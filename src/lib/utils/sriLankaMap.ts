// Sri Lanka major destination coordinates (relative to SVG viewBox 0 0 100 200)
// Based on approximate geographic positions on the island

interface Location {
    name: string;
    x: number;
    y: number;
}

// Major Sri Lanka destinations with coordinates for SVG map
export const SRI_LANKA_LOCATIONS: Record<string, Location> = {
    // Airports
    "Colombo Airport": { name: "Bandaranaike International Airport", x: 35, y: 30 },
    "BIA": { name: "Bandaranaike International Airport", x: 35, y: 30 },

    // Major Cities
    "Colombo": { name: "Colombo", x: 32, y: 52 },
    "Negombo": { name: "Negombo", x: 33, y: 35 },
    "Kandy": { name: "Kandy", x: 50, y: 68 },
    "Nuwara Eliya": { name: "Nuwara Eliya", x: 53, y: 90 },
    "Galle": { name: "Galle", x: 38, y: 140 },
    "Bentota": { name: "Bentota", x: 35, y: 110 },
    "Hikkaduwa": { name: "Hikkaduwa", x: 36, y: 125 },
    "Mirissa": { name: "Mirissa", x: 43, y: 150 },
    "Ella": { name: "Ella", x: 62, y: 100 },
    "Yala": { name: "Yala National Park", x: 75, y: 130 },
    "Sigiriya": { name: "Sigiriya", x: 58, y: 50 },
    "Dambulla": { name: "Dambulla", x: 55, y: 55 },
    "Polonnaruwa": { name: "Polonnaruwa", x: 65, y: 48 },
    "Anuradhapura": { name: "Anuradhapura", x: 48, y: 30 },
    "Trincomalee": { name: "Trincomalee", x: 70, y: 28 },
    "Jaffna": { name: "Jaffna", x: 50, y: 5 },
    "Batticaloa": { name: "Batticaloa", x: 75, y: 58 },
    "Arugam Bay": { name: "Arugam Bay", x: 80, y: 90 },
    "Matara": { name: "Matara", x: 48, y: 148 },
    "Tangalle": { name: "Tangalle", x: 55, y: 145 },
    "Unawatuna": { name: "Unawatuna", x: 40, y: 142 },
    "Habarana": { name: "Habarana", x: 60, y: 45 },
    "Pasikuda": { name: "Pasikuda", x: 77, y: 52 },
    "Kitulgala": { name: "Kitulgala", x: 45, y: 78 },
    "Pinnawala": { name: "Pinnawala", x: 45, y: 60 },
    "Kandalama": { name: "Kandalama", x: 56, y: 50 },
    "Wilpattu": { name: "Wilpattu National Park", x: 42, y: 20 },
    "Minneriya": { name: "Minneriya", x: 62, y: 52 },
    "Udawalawe": { name: "Udawalawe National Park", x: 55, y: 120 },
    "Horton Plains": { name: "Horton Plains", x: 55, y: 95 },
    "Adams Peak": { name: "Adam's Peak", x: 48, y: 88 },
};

// Approximate distances between major destinations (in km)
export const ROUTE_DISTANCES: Record<string, Record<string, number>> = {
    "Colombo": {
        "Negombo": 35,
        "Kandy": 115,
        "Sigiriya": 175,
        "Galle": 125,
        "Bentota": 64,
        "Nuwara Eliya": 175,
        "Colombo Airport": 35,
        "BIA": 35,
    },
    "Negombo": {
        "Colombo": 35,
        "Kandy": 100,
        "Sigiriya": 155,
        "Colombo Airport": 10,
    },
    "Kandy": {
        "Colombo": 115,
        "Nuwara Eliya": 80,
        "Sigiriya": 90,
        "Dambulla": 72,
        "Ella": 140,
        "Pinnawala": 40,
    },
    "Sigiriya": {
        "Colombo": 175,
        "Kandy": 90,
        "Dambulla": 18,
        "Polonnaruwa": 60,
        "Habarana": 15,
        "Anuradhapura": 80,
    },
    "Nuwara Eliya": {
        "Kandy": 80,
        "Ella": 65,
        "Colombo": 175,
        "Horton Plains": 32,
    },
    "Ella": {
        "Nuwara Eliya": 65,
        "Yala": 130,
        "Kandy": 140,
        "Udawalawe": 85,
    },
    "Galle": {
        "Colombo": 125,
        "Mirissa": 35,
        "Bentota": 60,
        "Yala": 200,
        "Unawatuna": 6,
    },
    "Yala": {
        "Ella": 130,
        "Galle": 200,
        "Tangalle": 60,
        "Mirissa": 100,
    },
    "Dambulla": {
        "Sigiriya": 18,
        "Kandy": 72,
        "Anuradhapura": 64,
        "Polonnaruwa": 65,
    },
    "Anuradhapura": {
        "Sigiriya": 80,
        "Dambulla": 64,
        "Colombo": 205,
        "Jaffna": 200,
        "Wilpattu": 45,
    },
};

/**
 * Get distance between two locations
 */
export function getDistance(from: string, to: string): number | null {
    // Normalize location names
    const normalizeLocation = (loc: string): string => {
        const normalized = loc.trim();
        // Check for common variations
        if (normalized.toLowerCase().includes("airport")) return "Colombo Airport";
        return normalized;
    };

    const fromNorm = normalizeLocation(from);
    const toNorm = normalizeLocation(to);

    if (ROUTE_DISTANCES[fromNorm]?.[toNorm]) {
        return ROUTE_DISTANCES[fromNorm][toNorm];
    }
    if (ROUTE_DISTANCES[toNorm]?.[fromNorm]) {
        return ROUTE_DISTANCES[toNorm][fromNorm];
    }
    return null;
}

/**
 * Get location coordinates for SVG map
 */
export function getLocationCoordinates(locationName: string): { x: number; y: number } | null {
    // Try exact match first
    if (SRI_LANKA_LOCATIONS[locationName]) {
        const loc = SRI_LANKA_LOCATIONS[locationName];
        return { x: loc.x, y: loc.y };
    }

    // Try case-insensitive partial match
    const lowerName = locationName.toLowerCase();
    for (const [key, value] of Object.entries(SRI_LANKA_LOCATIONS)) {
        if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {
            return { x: value.x, y: value.y };
        }
    }

    return null;
}

/**
 * Generate SVG map with tour route
 */
export function generateTourMapSVG(
    locations: string[],
    distances: number[],
    totalDistance: string | number
): string {
    // Get coordinates for each location
    const coords = locations.map(loc => {
        const coord = getLocationCoordinates(loc);
        return coord || null;
    }).filter(Boolean) as { x: number; y: number }[];

    // Generate path for the route
    let pathD = "";
    if (coords.length > 0) {
        pathD = `M ${coords[0].x} ${coords[0].y}`;
        for (let i = 1; i < coords.length; i++) {
            pathD += ` L ${coords[i].x} ${coords[i].y}`;
        }
    }

    // Generate location markers and labels
    const markers = locations.map((loc, idx) => {
        const coord = getLocationCoordinates(loc);
        if (!coord) return '';

        const distance = idx > 0 && distances[idx - 1] ? ` (${distances[idx - 1]} km)` : '';

        return `
            <circle cx="${coord.x}" cy="${coord.y}" r="2.5" fill="#E91E63" stroke="white" stroke-width="0.5"/>
            <text x="${coord.x + 4}" y="${coord.y + 1}" font-size="4" fill="#333" font-family="Arial, sans-serif">${loc}${distance}</text>
        `;
    }).join('');

    return `
    <svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" style="width: 100%; max-width: 280px; height: auto;">
        <!-- Sri Lanka Island Outline -->
        <path d="
            M 50 3
            C 55 5, 70 12, 75 25
            C 80 38, 82 55, 80 75
            C 78 95, 75 115, 70 130
            C 65 145, 55 155, 45 158
            C 35 161, 28 155, 25 145
            C 22 135, 25 120, 28 105
            C 31 90, 30 75, 28 60
            C 26 45, 28 30, 35 18
            C 42 6, 45 1, 50 3
            Z
        " fill="#E8F5E9" stroke="#4CAF50" stroke-width="0.5"/>
        
        <!-- Tour Route Path -->
        <path d="${pathD}" fill="none" stroke="#E91E63" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="none" opacity="0.8"/>
        
        <!-- Direction Arrows (optional visual enhancement) -->
        <defs>
            <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
                <polygon points="0 0, 4 2, 0 4" fill="#E91E63"/>
            </marker>
        </defs>
        
        <!-- Location Markers and Labels -->
        ${markers}
        
        <!-- Legend -->
        <rect x="5" y="175" width="40" height="20" fill="white" stroke="#ddd" stroke-width="0.3" rx="2"/>
        <text x="7" y="183" font-size="3.5" fill="#333" font-family="Arial, sans-serif" font-weight="bold">Tour Route</text>
        <text x="7" y="190" font-size="3" fill="#666" font-family="Arial, sans-serif">Total: ${totalDistance}</text>
        <line x1="35" y1="183" x2="43" y2="183" stroke="#E91E63" stroke-width="1.5"/>
    </svg>
    `;
}
