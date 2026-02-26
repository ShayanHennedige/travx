import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as ExcelJS from "exceljs";
import { format, parseISO, eachDayOfInterval } from "date-fns";

interface RouteParams {
    params: Promise<{ tourId: string }>;
}

interface ItineraryActivity {
    time: string;
    activity: string;
    location: string;
    duration?: string;
    driving_time?: string;
    driving_distance_km?: string; // New field: "X km from previous"
}

interface ItineraryDay {
    day: number;
    date: string;
    title: string;
    overnight_location: string;
    hotel_suggestion?: string;
    day_total_km?: string; // New field: "X km" for the full day
    activities?: ItineraryActivity[];
    notes?: string;
}

interface ItineraryContent {
    title: string;
    summary: string;
    days: ItineraryDay[];
    practical_notes?: string[];
    total_driving_hours?: string;
    total_distance_km?: string; // New field: "Approximate total km"
}

// TravX Company Details
const COMPANY = {
    name: "TravX Tours (Pvt) Ltd",
    address: "123 Galle Road, Colombo 03, Sri Lanka",
    email: "info@travxtours.com",
    phone: "+94 11 234 5678",
    website: "www.travxtours.com",
};

// Theme colors (matching project's globals.css)
const COLORS = {
    primary600: "005CD4",      // --color-primary-600
    primary100: "E0EFFF",      // --color-primary-100
    primary50: "F0F7FF",       // --color-primary-50
    accent500: "FF7A15",       // --color-accent-500
    surface100: "F1F5F9",      // --color-surface-100
    surface200: "E2E8F0",      // --color-surface-200
    surface700: "334155",      // --color-surface-700
    white: "FFFFFF",
    warning: "FEF3C7",         // Light yellow for balance row
};

// Helper to extract mileage from itinerary day
function extractMileageFromDay(day: ItineraryDay): number {
    // First, try to use day_total_km if available (new field)
    // Format: "X km" or "X km from Y to Z"
    if (day.day_total_km) {
        const kmMatch = day.day_total_km.match(/(\d+\.?\d*)\s*km/i);
        if (kmMatch) {
            const mileage = Math.round(parseFloat(kmMatch[1]));
            console.log(`Day ${day.day}: Using day_total_km = ${mileage} km (from: "${day.day_total_km}")`);
            return mileage;
        }
    }

    // Otherwise, sum up driving_distance_km from activities
    // Format: "X km from [Origin] to [Destination]"
    let totalKm = 0;
    if (day.activities) {
        for (const activity of day.activities) {
            if (activity.driving_distance_km) {
                // Match "X km" or "X km from Y to Z"
                const kmMatch = activity.driving_distance_km.match(/(\d+\.?\d*)\s*km/i);
                if (kmMatch) {
                    const activityKm = parseFloat(kmMatch[1]);
                    totalKm += activityKm;
                    console.log(`Day ${day.day} Activity "${activity.activity}": ${activityKm} km (from: "${activity.driving_distance_km}")`);
                }
            }
        }
    }

    if (totalKm > 0) {
        console.log(`Day ${day.day}: Total from activities = ${Math.round(totalKm)} km`);
        return Math.round(totalKm);
    }

    // Fallback: estimate from driving time (~40 km/h average on Sri Lankan roads)
    let totalDrivingHours = 0;
    if (day.activities) {
        for (const activity of day.activities) {
            if (activity.driving_time) {
                const hoursMatch = activity.driving_time.match(/(\d+\.?\d*)\s*hours?/i);
                const minutesMatch = activity.driving_time.match(/(\d+)\s*minutes?/i);

                if (hoursMatch) {
                    totalDrivingHours += parseFloat(hoursMatch[1]);
                }
                if (minutesMatch) {
                    totalDrivingHours += parseInt(minutesMatch[1]) / 60;
                }
            }
        }
    }

    const estimatedKm = Math.round(totalDrivingHours * 40);
    if (estimatedKm > 0) {
        console.log(`Day ${day.day}: Estimated from driving time = ${estimatedKm} km`);
    }
    return estimatedKm;
}

// GET - Generate and download driver log sheet Excel file
export async function GET(request: Request, { params }: RouteParams) {
    const { tourId } = await params;
    const supabase = await createClient();

    try {
        // Fetch tour with related data
        const { data: tour, error: tourError } = await supabase
            .from("tours")
            .select(`
        *,
        itinerary_id,
        drivers (
          id,
          name,
          vehicle_type,
          vehicle_number,
          contact_number
        ),
        itineraries (
          id,
          content,
          inquiry_id,
          group_inquiry_id
        )
      `)
            .eq("id", tourId)
            .single();

        if (tourError || !tour) {
            console.error("Error fetching tour:", tourError);
            return NextResponse.json(
                { error: "Tour not found" },
                { status: 404 }
            );
        }

        // Verify we have the correct itinerary linked to this tour
        if (!tour.itinerary_id) {
            console.error("Tour does not have an itinerary_id");
            return NextResponse.json(
                { error: "Tour is not linked to an itinerary" },
                { status: 400 }
            );
        }

        // If nested query didn't return itinerary, fetch it directly using itinerary_id
        let itineraryContent: ItineraryContent | null = null;
        if (tour.itineraries?.content) {
            try {
                itineraryContent = typeof tour.itineraries.content === "string"
                    ? JSON.parse(tour.itineraries.content)
                    : tour.itineraries.content;
            } catch (e) {
                console.error("Error parsing nested itinerary content:", e);
            }
        }

        // Fallback: fetch itinerary directly if nested query didn't work
        if (!itineraryContent && tour.itinerary_id) {
            const { data: directItinerary, error: itineraryError } = await supabase
                .from("itineraries")
                .select("id, content, inquiry_id, group_inquiry_id")
                .eq("id", tour.itinerary_id)
                .single();

            if (!itineraryError && directItinerary?.content) {
                try {
                    itineraryContent = typeof directItinerary.content === "string"
                        ? JSON.parse(directItinerary.content)
                        : directItinerary.content;
                    console.log("Fetched itinerary directly using itinerary_id:", tour.itinerary_id);
                } catch (e) {
                    console.error("Error parsing direct itinerary content:", e);
                }
            } else {
                console.error("Error fetching itinerary directly:", itineraryError);
            }
        }

        // Fetch inquiry data if available
        let inquiry = null;
        if (tour.inquiry_id) {
            const { data: inquiryData } = await supabase
                .from("inquiries")
                .select("first_name, last_name, country, no_of_pax, no_of_children")
                .eq("id", tour.inquiry_id)
                .single();
            inquiry = inquiryData;
        }

        // Fetch group inquiry data if available
        let groupInquiry = null;
        if (tour.group_inquiry_id) {
            const { data: groupInquiryData } = await supabase
                .from("group_inquiries")
                .select("group_name, travel_agent, country, no_of_pax, no_of_children")
                .eq("id", tour.group_inquiry_id)
                .single();
            groupInquiry = groupInquiryData;
        }

        // Log tour and itinerary info for debugging
        console.log("Tour ID:", tourId);
        console.log("Tour itinerary_id:", tour.itinerary_id);
        console.log("Tour inquiry_id:", tour.inquiry_id);
        console.log("Tour group_inquiry_id:", tour.group_inquiry_id);
        console.log("Tour driver_id:", tour.driver_id);
        if (itineraryContent) {
            console.log("Itinerary days count:", itineraryContent.days?.length);
            console.log("Itinerary title:", itineraryContent.title);
        }

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "TravX";
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet("Log Sheet", {
            pageSetup: {
                paperSize: 9, // A4
                orientation: "portrait",
                fitToPage: true,
                fitToWidth: 1,
                margins: {
                    left: 0.5,
                    right: 0.5,
                    top: 0.5,
                    bottom: 0.5,
                    header: 0.3,
                    footer: 0.3,
                },
            },
        });

        // Set column widths
        worksheet.columns = [
            { width: 14 }, // A - Date/Labels
            { width: 32 }, // B - Itinerary/Values
            { width: 14 }, // C - Mileage/Labels
            { width: 14 }, // D - Actual/Values
        ];

        // ===== DEFINE STYLES =====

        // Table header style (blue theme)
        const tableHeaderStyle: Partial<ExcelJS.Style> = {
            font: { bold: true, size: 11, color: { argb: "FF" + COLORS.white } },
            alignment: { horizontal: "center", vertical: "middle" },
            fill: {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF" + COLORS.primary600 },
            },
            border: {
                top: { style: "thin", color: { argb: "FF" + COLORS.primary600 } },
                bottom: { style: "thin", color: { argb: "FF" + COLORS.primary600 } },
                left: { style: "thin", color: { argb: "FF" + COLORS.primary600 } },
                right: { style: "thin", color: { argb: "FF" + COLORS.primary600 } },
            },
        };

        // Label cell style (light blue background)
        const labelStyle: Partial<ExcelJS.Style> = {
            font: { bold: true, size: 10, color: { argb: "FF" + COLORS.surface700 } },
            alignment: { horizontal: "left", vertical: "middle" },
            fill: {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF" + COLORS.primary100 },
            },
            border: {
                top: { style: "thin", color: { argb: "FF" + COLORS.surface200 } },
                bottom: { style: "thin", color: { argb: "FF" + COLORS.surface200 } },
                left: { style: "thin", color: { argb: "FF" + COLORS.surface200 } },
                right: { style: "thin", color: { argb: "FF" + COLORS.surface200 } },
            },
        };

        // Data cell style
        const cellStyle: Partial<ExcelJS.Style> = {
            font: { size: 10 },
            alignment: { horizontal: "left", vertical: "middle" },
            border: {
                top: { style: "thin", color: { argb: "FF" + COLORS.surface200 } },
                bottom: { style: "thin", color: { argb: "FF" + COLORS.surface200 } },
                left: { style: "thin", color: { argb: "FF" + COLORS.surface200 } },
                right: { style: "thin", color: { argb: "FF" + COLORS.surface200 } },
            },
        };

        // Number cell style (centered)
        const numberCellStyle: Partial<ExcelJS.Style> = {
            font: { size: 10 },
            alignment: { horizontal: "center", vertical: "middle" },
            border: {
                top: { style: "thin", color: { argb: "FF" + COLORS.surface200 } },
                bottom: { style: "thin", color: { argb: "FF" + COLORS.surface200 } },
                left: { style: "thin", color: { argb: "FF" + COLORS.surface200 } },
                right: { style: "thin", color: { argb: "FF" + COLORS.surface200 } },
            },
        };

        // Total row style
        const totalRowStyle: Partial<ExcelJS.Style> = {
            font: { bold: true, size: 10 },
            alignment: { horizontal: "right", vertical: "middle" },
            fill: {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF" + COLORS.surface100 },
            },
            border: {
                top: { style: "thin", color: { argb: "FF" + COLORS.surface200 } },
                bottom: { style: "thin", color: { argb: "FF" + COLORS.surface200 } },
                left: { style: "thin", color: { argb: "FF" + COLORS.surface200 } },
                right: { style: "thin", color: { argb: "FF" + COLORS.surface200 } },
            },
        };

        // Balance row style (highlighted)
        const balanceRowStyle: Partial<ExcelJS.Style> = {
            font: { bold: true, size: 11, color: { argb: "FF" + COLORS.surface700 } },
            alignment: { horizontal: "right", vertical: "middle" },
            fill: {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF" + COLORS.warning },
            },
            border: {
                top: { style: "medium", color: { argb: "FF" + COLORS.accent500 } },
                bottom: { style: "medium", color: { argb: "FF" + COLORS.accent500 } },
                left: { style: "medium", color: { argb: "FF" + COLORS.accent500 } },
                right: { style: "medium", color: { argb: "FF" + COLORS.accent500 } },
            },
        };

        let currentRow = 1;

        // ===== HEADER SECTION =====

        // Company Name (Row 1)
        worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
        const companyNameCell = worksheet.getCell(`A${currentRow}`);
        companyNameCell.value = COMPANY.name;
        companyNameCell.font = { bold: true, size: 18, color: { argb: "FF" + COLORS.primary600 } };
        companyNameCell.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(currentRow).height = 28;
        currentRow++;

        // Company Address (Row 2)
        worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
        const addressCell = worksheet.getCell(`A${currentRow}`);
        addressCell.value = COMPANY.address;
        addressCell.font = { size: 10, color: { argb: "FF" + COLORS.surface700 } };
        addressCell.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(currentRow).height = 16;
        currentRow++;

        // Company Contact (Row 3)
        worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
        const contactCell = worksheet.getCell(`A${currentRow}`);
        contactCell.value = `${COMPANY.phone}  |  ${COMPANY.email}  |  ${COMPANY.website}`;
        contactCell.font = { size: 9, color: { argb: "FF" + COLORS.surface700 } };
        contactCell.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(currentRow).height = 16;
        currentRow++;

        // Empty row
        worksheet.getRow(currentRow).height = 8;
        currentRow++;

        // Log Sheet Title (Row 5)
        worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
        const titleCell = worksheet.getCell(`A${currentRow}`);
        titleCell.value = "Driver Log Sheet";
        titleCell.font = { bold: true, size: 14, color: { argb: "FF" + COLORS.white } };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        titleCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF" + COLORS.primary600 },
        };
        worksheet.getRow(currentRow).height = 26;
        currentRow++;

        // Empty row
        worksheet.getRow(currentRow).height = 8;
        currentRow++;

        // ===== TOUR INFO SECTION =====

        // Determine guest name and travel agent
        let guestName = tour.client_name || "";
        let travelAgent = "";
        let paxInfo = `${tour.pax_adults || 0} Adults`;
        if (tour.pax_children > 0) {
            paxInfo += `, ${tour.pax_children} Children`;
        }

        if (inquiry) {
            guestName = `${inquiry.first_name || ""} ${inquiry.last_name || ""}`.trim() || tour.client_name;
            travelAgent = inquiry.country ? `Direct-${inquiry.country}` : "Direct";
        } else if (groupInquiry) {
            guestName = groupInquiry.group_name || tour.client_name;
            travelAgent = groupInquiry.travel_agent || groupInquiry.country || "Direct";
        }

        const driverName = tour.drivers?.name || "Not Assigned";
        const driverVehicle = tour.drivers?.vehicle_type
            ? `${tour.drivers.vehicle_type}${tour.drivers.vehicle_number ? ` (${tour.drivers.vehicle_number})` : ""}`
            : "";

        // Row: Guest Name
        worksheet.getCell(`A${currentRow}`).value = "Guest Name";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        worksheet.getCell(`B${currentRow}`).value = guestName;
        Object.assign(worksheet.getCell(`B${currentRow}`), cellStyle);
        worksheet.getCell(`B${currentRow}`).font = { bold: true, size: 11 };
        currentRow++;

        // Row: Travel Agent | Driver Name
        worksheet.getCell(`A${currentRow}`).value = "Travel Agent";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.getCell(`B${currentRow}`).value = travelAgent;
        Object.assign(worksheet.getCell(`B${currentRow}`), cellStyle);
        worksheet.getCell(`C${currentRow}`).value = "Driver Name";
        Object.assign(worksheet.getCell(`C${currentRow}`), labelStyle);
        worksheet.getCell(`D${currentRow}`).value = driverName;
        Object.assign(worksheet.getCell(`D${currentRow}`), cellStyle);
        currentRow++;

        // Row: Pax | Vehicle
        worksheet.getCell(`A${currentRow}`).value = "Pax";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.getCell(`B${currentRow}`).value = paxInfo;
        Object.assign(worksheet.getCell(`B${currentRow}`), cellStyle);
        worksheet.getCell(`C${currentRow}`).value = "Vehicle";
        Object.assign(worksheet.getCell(`C${currentRow}`), labelStyle);
        worksheet.getCell(`D${currentRow}`).value = driverVehicle;
        Object.assign(worksheet.getCell(`D${currentRow}`), cellStyle);
        currentRow++;

        // Row: Arrival Date | Departure Date
        const arrivalDate = tour.start_date ? format(parseISO(tour.start_date), "dd MMM yyyy") : "";
        const departureDate = tour.end_date ? format(parseISO(tour.end_date), "dd MMM yyyy") : "";

        worksheet.getCell(`A${currentRow}`).value = "Arrival Date";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.getCell(`B${currentRow}`).value = arrivalDate;
        Object.assign(worksheet.getCell(`B${currentRow}`), cellStyle);
        worksheet.getCell(`C${currentRow}`).value = "Dep. Date";
        Object.assign(worksheet.getCell(`C${currentRow}`), labelStyle);
        worksheet.getCell(`D${currentRow}`).value = departureDate;
        Object.assign(worksheet.getCell(`D${currentRow}`), cellStyle);
        currentRow++;

        // Row: Arrival Flight | Departure Flight (empty for manual entry)
        worksheet.getCell(`A${currentRow}`).value = "Arrival Flight";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.getCell(`B${currentRow}`).value = "";
        Object.assign(worksheet.getCell(`B${currentRow}`), cellStyle);
        worksheet.getCell(`C${currentRow}`).value = "Dep. Flight";
        Object.assign(worksheet.getCell(`C${currentRow}`), labelStyle);
        worksheet.getCell(`D${currentRow}`).value = "";
        Object.assign(worksheet.getCell(`D${currentRow}`), cellStyle);
        currentRow++;

        // Empty row
        worksheet.getRow(currentRow).height = 10;
        currentRow++;

        // ===== DAILY LOG TABLE =====

        // Header row
        worksheet.getCell(`A${currentRow}`).value = "Date";
        worksheet.getCell(`B${currentRow}`).value = "Itinerary";
        worksheet.getCell(`C${currentRow}`).value = "Mileage";
        worksheet.getCell(`D${currentRow}`).value = "Actual";
        ["A", "B", "C", "D"].forEach((col) => {
            Object.assign(worksheet.getCell(`${col}${currentRow}`), tableHeaderStyle);
        });
        worksheet.getRow(currentRow).height = 22;
        currentRow++;

        // Generate daily entries with mileage from itinerary
        const logStartRow = currentRow;
        let tourDays: Array<{ date: Date; location: string; mileage: number }> = [];

        if (itineraryContent?.days && itineraryContent.days.length > 0) {
            // Use itinerary days and extract mileage
            tourDays = itineraryContent.days.map((day) => {
                // Build itinerary description: use title or combine overnight location with activities
                let itineraryDescription = day.title || "";
                if (day.overnight_location && day.title !== day.overnight_location) {
                    itineraryDescription = `${day.title || day.overnight_location} - ${day.overnight_location}`;
                } else if (!itineraryDescription && day.overnight_location) {
                    itineraryDescription = day.overnight_location;
                }
                
                return {
                    date: day.date ? parseISO(day.date) : parseISO(tour.start_date),
                    location: itineraryDescription || day.overnight_location || "",
                    mileage: extractMileageFromDay(day),
                };
            });
        } else if (tour.start_date && tour.end_date) {
            // Generate days from tour dates (no mileage data available)
            const dates = eachDayOfInterval({
                start: parseISO(tour.start_date),
                end: parseISO(tour.end_date),
            });
            tourDays = dates.map((date, index) => ({
                date,
                location: index === 0 ? "Airport / Hotel" : index === dates.length - 1 ? "Hotel / Airport" : "",
                mileage: 0,
            }));
        }

        // Add daily entries
        tourDays.forEach((day, index) => {
            const isEvenRow = index % 2 === 0;
            const rowFill: Partial<ExcelJS.Fill> = isEvenRow
                ? { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + COLORS.white } }
                : { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + COLORS.primary50 } };

            worksheet.getCell(`A${currentRow}`).value = format(day.date, "dd-MMM");
            Object.assign(worksheet.getCell(`A${currentRow}`), cellStyle);
            worksheet.getCell(`A${currentRow}`).alignment = { horizontal: "center", vertical: "middle" };
            worksheet.getCell(`A${currentRow}`).fill = rowFill;

            worksheet.getCell(`B${currentRow}`).value = day.location;
            Object.assign(worksheet.getCell(`B${currentRow}`), cellStyle);
            worksheet.getCell(`B${currentRow}`).fill = rowFill;

            // Mileage from itinerary (or 0 if not available)
            worksheet.getCell(`C${currentRow}`).value = day.mileage;
            Object.assign(worksheet.getCell(`C${currentRow}`), numberCellStyle);
            worksheet.getCell(`C${currentRow}`).fill = rowFill;

            // Actual - editable, leave empty (not 0)
            worksheet.getCell(`D${currentRow}`).value = "";
            Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
            worksheet.getCell(`D${currentRow}`).fill = rowFill;

            currentRow++;
        });

        const logEndRow = currentRow - 1;

        // Total row
        worksheet.getCell(`A${currentRow}`).value = "";
        Object.assign(worksheet.getCell(`A${currentRow}`), totalRowStyle);
        worksheet.getCell(`B${currentRow}`).value = "Total";
        Object.assign(worksheet.getCell(`B${currentRow}`), totalRowStyle);
        worksheet.getCell(`B${currentRow}`).alignment = { horizontal: "right", vertical: "middle" };

        worksheet.getCell(`C${currentRow}`).value = {
            formula: `SUM(C${logStartRow}:C${logEndRow})`,
        };
        Object.assign(worksheet.getCell(`C${currentRow}`), totalRowStyle);
        worksheet.getCell(`C${currentRow}`).alignment = { horizontal: "center", vertical: "middle" };

        worksheet.getCell(`D${currentRow}`).value = {
            formula: `SUM(D${logStartRow}:D${logEndRow})`,
        };
        Object.assign(worksheet.getCell(`D${currentRow}`), totalRowStyle);
        worksheet.getCell(`D${currentRow}`).alignment = { horizontal: "center", vertical: "middle" };

        const totalMileageRow = currentRow;
        currentRow++;

        // Empty row
        worksheet.getRow(currentRow).height = 10;
        currentRow++;

        // ===== COST CALCULATION SECTION =====

        const numberOfDays = tourDays.length || 1;

        // Row: Total Mileage Cost
        worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = "Total Mileage Cost";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.getCell(`C${currentRow}`).value = 0; // Rate per km (editable, default 0)
        Object.assign(worksheet.getCell(`C${currentRow}`), numberCellStyle);
        worksheet.getCell(`D${currentRow}`).value = 0; // Driver will fill this manually
        Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        const mileageCostRow = currentRow;
        currentRow++;

        // Row: Batta (daily allowance) - 2000 per day when there's mileage
        worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
        const daysWithMileage = tourDays.filter(day => day.mileage > 0).length;
        worksheet.getCell(`A${currentRow}`).value = `Batta (${numberOfDays} days)`;
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        // Set batta to 2000 per day when there's mileage, otherwise 0
        const battaPerDay = daysWithMileage > 0 ? 2000 : 0;
        worksheet.getCell(`C${currentRow}`).value = battaPerDay; // Constant 2000 per day when mileage exists
        Object.assign(worksheet.getCell(`C${currentRow}`), numberCellStyle);
        worksheet.getCell(`D${currentRow}`).value = {
            formula: `${numberOfDays}*C${currentRow}`,
        };
        Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        const battaRow = currentRow;
        currentRow++;

        // Row: Parking
        worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = "Parking";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.getCell(`C${currentRow}`).value = "";
        Object.assign(worksheet.getCell(`C${currentRow}`), cellStyle);
        worksheet.getCell(`D${currentRow}`).value = 0; // Driver will fill this manually, default 0
        Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        const parkingRow = currentRow;
        currentRow++;

        // Row: Highway
        worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = "Highway";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.getCell(`C${currentRow}`).value = "";
        Object.assign(worksheet.getCell(`C${currentRow}`), cellStyle);
        worksheet.getCell(`D${currentRow}`).value = 0; // Driver will fill this manually, default 0
        Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        const highwayRow = currentRow;
        currentRow++;

        // Row: Total
        worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = "Total";
        Object.assign(worksheet.getCell(`A${currentRow}`), totalRowStyle);
        worksheet.getCell(`D${currentRow}`).value = {
            formula: `SUM(D${mileageCostRow}:D${highwayRow})`,
        };
        Object.assign(worksheet.getCell(`D${currentRow}`), totalRowStyle);
        worksheet.getCell(`D${currentRow}`).alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        const totalRow = currentRow;
        currentRow++;

        // Row: Tour Advance
        worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = "Tour Advance";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.getCell(`D${currentRow}`).value = 0; // Editable, default 0
        Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        const advanceRow = currentRow;
        currentRow++;

        // Row: Balance to Pay
        worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = "Balance to Pay";
        Object.assign(worksheet.getCell(`A${currentRow}`), balanceRowStyle);
        worksheet.getCell(`A${currentRow}`).alignment = { horizontal: "left", vertical: "middle" };
        worksheet.getCell(`D${currentRow}`).value = {
            formula: `D${totalRow}-D${advanceRow}`,
        };
        Object.assign(worksheet.getCell(`D${currentRow}`), balanceRowStyle);
        worksheet.getCell(`D${currentRow}`).alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        worksheet.getRow(currentRow).height = 24;

        // Generate Excel buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Create filename
        const safeName = (guestName || "Tour").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
        const dateStr = format(new Date(), "yyyyMMdd");
        const filename = `LogSheet_${safeName}_${dateStr}.xlsx`;

        // Return Excel file
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (err) {
        console.error("Error generating log sheet:", err);
        return NextResponse.json(
            { error: "Failed to generate log sheet" },
            { status: 500 }
        );
    }
}
