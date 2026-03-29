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
    driving_distance_km?: string;
}

interface ItineraryDay {
    day: number;
    date: string;
    title: string;
    overnight_location: string;
    hotel_suggestion?: string;
    day_total_km?: string;
    activities?: ItineraryActivity[];
    notes?: string;
}

interface ItineraryContent {
    title: string;
    summary: string;
    days: ItineraryDay[];
    practical_notes?: string[];
    total_driving_hours?: string;
    total_distance_km?: string;
}

// TraveX Company Details
const COMPANY = {
    name: "TraveX",
    address: "63A, Old Road, Pannipitiya, Sri Lanka",
    email: "info@Travex.com",
    phone: "+94 77 346 9998",
    website: "www.serendiaholidays.com",
};

// Theme colors - TraveX Red/Black Branding
const COLORS = {
    primary600: "E04344", // TraveX Red
    primary100: "FDE8E8", // Light red
    primary50: "FEF2F2", // Very light red
    accent500: "1A1A1A", // Black
    surface100: "F1F5F9",
    surface200: "E2E8F0",
    surface700: "334155",
    white: "FFFFFF",
    warning: "FEF3C7",
};

// Helper to extract mileage from itinerary day
function extractMileageFromDay(day: ItineraryDay): number {
    if (day.day_total_km) {
        const kmMatch = day.day_total_km.match(/(\d+\.?\d*)\s*km/i);
        if (kmMatch) {
            const mileage = Math.round(parseFloat(kmMatch[1]));
            console.log(`Day ${day.day}: Using day_total_km = ${mileage} km (from: "${day.day_total_km}")`);
            return mileage;
        }
    }

    let totalKm = 0;
    if (day.activities) {
        for (const activity of day.activities) {
            if (activity.driving_distance_km) {
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

    console.log("=== Driver Log Sheet API Called ===");
    console.log("Tour ID:", tourId);

    try {
        // Fetch tour
        const { data: tour, error: tourError } = await supabase
            .from("tours")
            .select("*")
            .eq("id", tourId)
            .single();

        console.log("Tour query result:", { tour: tour?.id, error: tourError });

        if (tourError || !tour) {
            console.error("Error fetching tour:", tourError);
            return NextResponse.json(
                { error: "Tour not found" },
                { status: 404 }
            );
        }

        console.log("Tour data:", {
            id: tour.id,
            client_name: tour.client_name,
            start_date: tour.start_date,
            end_date: tour.end_date,
            itinerary_id: tour.itinerary_id,
            driver_id: tour.driver_id,
        });

        // Fetch driver if assigned
        let driver = null;
        if (tour.driver_id) {
            const { data: driverData } = await supabase
                .from("drivers")
                .select("id, name, vehicle_type, vehicle_number, contact_number")
                .eq("id", tour.driver_id)
                .single();
            driver = driverData;
        }

        // Fetch costing sheet via itinerary_id (costing sheets link to itineraries, not tours)
        let extraKm = 0;
        if (tour.itinerary_id) {
            const { data: costingSheet, error: costingError } = await supabase
                .from("tour_costing_sheets")
                .select("transport_data")
                .eq("itinerary_id", tour.itinerary_id)
                .single();

            console.log("Costing sheet query:", { found: !!costingSheet, error: costingError });

            // Extract extra km from transport_data JSONB
            // Look for row with "extra" in description (e.g., "Extra KM", "Extra Kms")
            if (costingSheet?.transport_data && Array.isArray(costingSheet.transport_data)) {
                // Try exact match first
                let extraKmItem = costingSheet.transport_data.find((item: any) =>
                    item.description?.toLowerCase() === 'extra km' ||
                    item.description?.toLowerCase() === 'extra kms'
                );

                // Fallback: search for any row containing "extra"
                if (!extraKmItem) {
                    extraKmItem = costingSheet.transport_data.find((item: any) =>
                        item.description?.toLowerCase().includes('extra')
                    );
                }

                if (extraKmItem && extraKmItem.mileage) {
                    extraKm = extraKmItem.mileage;
                    console.log("Extra KM found:", extraKm, "from row:", extraKmItem.description);
                }
            }
        }

        // Verify we have the correct itinerary linked to this tour
        if (!tour.itinerary_id) {
            console.error("Tour does not have an itinerary_id");
            return NextResponse.json(
                { error: "Tour is not linked to an itinerary" },
                { status: 400 }
            );
        }

        // Fetch itinerary content
        let itineraryContent: ItineraryContent | null = null;
        let itinerary = null;
        if (tour.itinerary_id) {
            const { data: itineraryData, error: itineraryError } = await supabase
                .from("itineraries")
                .select("id, content, inquiry_id, group_inquiry_id")
                .eq("id", tour.itinerary_id)
                .single();

            itinerary = itineraryData;

            if (!itineraryError && itineraryData?.content) {
                try {
                    itineraryContent = typeof itineraryData.content === "string"
                        ? JSON.parse(itineraryData.content)
                        : itineraryData.content;
                    console.log("Fetched itinerary directly using itinerary_id:", tour.itinerary_id);
                    console.log("Itinerary days:", itineraryContent?.days?.map(d => ({ day: d.day, date: d.date, title: d.title })));
                } catch (e) {
                    console.error("Error parsing itinerary content:", e);
                }
            } else {
                console.error("Error fetching itinerary:", itineraryError);
            }
        }

        // Fetch inquiry data if available (from itinerary, not tour)
        let inquiry = null;
        if (itinerary?.inquiry_id) {
            const { data: inquiryData } = await supabase
                .from("inquiries")
                .select("first_name, last_name, country, no_of_pax, no_of_children")
                .eq("id", itinerary.inquiry_id)
                .single();
            inquiry = inquiryData;
        }

        // Fetch group inquiry data if available (from itinerary, not tour)
        let groupInquiry = null;
        if (itinerary?.group_inquiry_id) {
            const { data: groupInquiryData } = await supabase
                .from("group_inquiries")
                .select("group_name, travel_agent, country, no_of_pax, no_of_children")
                .eq("id", itinerary.group_inquiry_id)
                .single();
            groupInquiry = groupInquiryData;
        }

        console.log("Tour ID:", tourId);
        console.log("Extra KM from costing:", extraKm);
        if (itineraryContent) {
            console.log("Itinerary days count:", itineraryContent.days?.length);
            console.log("Itinerary title:", itineraryContent.title);
        }

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "TraveX";
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

        const tableHeaderStyle: any = {
            font: { bold: true, size: 11, color: { argb: "FFFFFFFF" } },
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

        const driverName = driver?.name || "Not Assigned";
        const driverVehicle = driver?.vehicle_type
            ? `${driver.vehicle_type}${driver.vehicle_number ? ` (${driver.vehicle_number})` : ""}`
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
        let arrivalDate = "";
        let departureDate = "";
        
        try {
            arrivalDate = tour.start_date ? format(parseISO(tour.start_date), "dd MMM yyyy") : "";
        } catch (e) {
            console.error("Error parsing start_date:", tour.start_date, e);
            arrivalDate = tour.start_date || "";
        }
        
        try {
            departureDate = tour.end_date ? format(parseISO(tour.end_date), "dd MMM yyyy") : "";
        } catch (e) {
            console.error("Error parsing end_date:", tour.end_date, e);
            departureDate = tour.end_date || "";
        }

        worksheet.getCell(`A${currentRow}`).value = "Arrival Date";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.getCell(`B${currentRow}`).value = arrivalDate;
        Object.assign(worksheet.getCell(`B${currentRow}`), cellStyle);
        worksheet.getCell(`C${currentRow}`).value = "Dep. Date";
        Object.assign(worksheet.getCell(`C${currentRow}`), labelStyle);
        worksheet.getCell(`D${currentRow}`).value = departureDate;
        Object.assign(worksheet.getCell(`D${currentRow}`), cellStyle);
        currentRow++;

        // Row: Arrival Flight | Departure Flight
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

        // Generate daily entries
        const logStartRow = currentRow;
        let tourDays: Array<{ date: Date; location: string; mileage: number }> = [];

        if (itineraryContent?.days && itineraryContent.days.length > 0) {
            tourDays = itineraryContent.days.map((day, index) => {
                let itineraryDescription = day.title || "";
                if (day.overnight_location && day.title !== day.overnight_location) {
                    itineraryDescription = `${day.title || day.overnight_location} - ${day.overnight_location}`;
                } else if (!itineraryDescription && day.overnight_location) {
                    itineraryDescription = day.overnight_location;
                }

                // Parse date safely
                let dayDate: Date;
                try {
                    if (day.date) {
                        dayDate = parseISO(day.date);
                    } else if (tour.start_date) {
                        // Fallback: use tour start date + index days
                        const startDate = parseISO(tour.start_date);
                        dayDate = new Date(startDate);
                        dayDate.setDate(startDate.getDate() + index);
                    } else {
                        dayDate = new Date();
                    }
                } catch (e) {
                    console.error(`Error parsing date for day ${day.day}:`, day.date, e);
                    dayDate = new Date();
                }

                return {
                    date: dayDate,
                    location: itineraryDescription || day.overnight_location || "",
                    mileage: extractMileageFromDay(day),
                };
            });
        } else if (tour.start_date && tour.end_date) {
            try {
                const dates = eachDayOfInterval({
                    start: parseISO(tour.start_date),
                    end: parseISO(tour.end_date),
                });
                tourDays = dates.map((date, index) => ({
                    date,
                    location: index === 0 ? "Airport / Hotel" : index === dates.length - 1 ? "Hotel / Airport" : "",
                    mileage: 0,
                }));
            } catch (e) {
                console.error("Error generating date interval:", e);
                // Fallback: create at least one day
                tourDays = [{
                    date: new Date(),
                    location: "Tour",
                    mileage: 0,
                }];
            }
        }

        // Add daily entries
        tourDays.forEach((day, index) => {
            const isEvenRow = index % 2 === 0;
            const rowFill: any = isEvenRow
                ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } }
                : { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + COLORS.primary50 } };

            // Format date safely
            let dateStr = "";
            try {
                dateStr = format(day.date, "dd-MMM");
            } catch (e) {
                console.error("Error formatting date:", day.date, e);
                dateStr = "N/A";
            }

            worksheet.getCell(`A${currentRow}`).value = dateStr;
            Object.assign(worksheet.getCell(`A${currentRow}`), cellStyle);
            worksheet.getCell(`A${currentRow}`).alignment = { horizontal: "center", vertical: "middle" };
            worksheet.getCell(`A${currentRow}`).fill = rowFill;
            worksheet.getCell(`A${currentRow}`).protection = { locked: true };

            worksheet.getCell(`B${currentRow}`).value = day.location;
            Object.assign(worksheet.getCell(`B${currentRow}`), cellStyle);
            worksheet.getCell(`B${currentRow}`).fill = rowFill;
            worksheet.getCell(`B${currentRow}`).protection = { locked: true };

            worksheet.getCell(`C${currentRow}`).value = day.mileage;
            Object.assign(worksheet.getCell(`C${currentRow}`), numberCellStyle);
            worksheet.getCell(`C${currentRow}`).fill = rowFill;
            worksheet.getCell(`C${currentRow}`).protection = { locked: true };

            // Actual column - editable
            worksheet.getCell(`D${currentRow}`).value = "";
            Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
            worksheet.getCell(`D${currentRow}`).fill = rowFill;
            worksheet.getCell(`D${currentRow}`).protection = { locked: false };

            currentRow++;
        });

        const logEndRow = currentRow - 1;

        // Total row
        worksheet.getCell(`A${currentRow}`).value = "";
        Object.assign(worksheet.getCell(`A${currentRow}`), totalRowStyle);
        worksheet.getCell(`A${currentRow}`).protection = { locked: true };

        worksheet.getCell(`B${currentRow}`).value = "Total";
        Object.assign(worksheet.getCell(`B${currentRow}`), totalRowStyle);
        worksheet.getCell(`B${currentRow}`).alignment = { horizontal: "right", vertical: "middle" };
        worksheet.getCell(`B${currentRow}`).protection = { locked: true };

        worksheet.getCell(`C${currentRow}`).value = {
            formula: `SUM(C${logStartRow}:C${logEndRow})`,
        };
        Object.assign(worksheet.getCell(`C${currentRow}`), totalRowStyle);
        worksheet.getCell(`C${currentRow}`).alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getCell(`C${currentRow}`).protection = { locked: true };

        worksheet.getCell(`D${currentRow}`).value = {
            formula: `SUM(D${logStartRow}:D${logEndRow})`,
        };
        Object.assign(worksheet.getCell(`D${currentRow}`), totalRowStyle);
        worksheet.getCell(`D${currentRow}`).alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getCell(`D${currentRow}`).protection = { locked: true };

        const totalMileageRow = currentRow;
        currentRow++;

        // Extra KM row (from costing sheet)
        worksheet.getCell(`A${currentRow}`).value = "";
        Object.assign(worksheet.getCell(`A${currentRow}`), cellStyle);
        worksheet.getCell(`A${currentRow}`).protection = { locked: true };

        worksheet.getCell(`B${currentRow}`).value = "Extra KM";
        Object.assign(worksheet.getCell(`B${currentRow}`), labelStyle);
        worksheet.getCell(`B${currentRow}`).alignment = { horizontal: "right", vertical: "middle" };
        worksheet.getCell(`B${currentRow}`).protection = { locked: true };

        worksheet.getCell(`C${currentRow}`).value = extraKm;
        Object.assign(worksheet.getCell(`C${currentRow}`), numberCellStyle);
        worksheet.getCell(`C${currentRow}`).protection = { locked: true };

        worksheet.getCell(`D${currentRow}`).value = "";
        Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
        worksheet.getCell(`D${currentRow}`).protection = { locked: true };

        currentRow++;

        // Empty row
        worksheet.getRow(currentRow).height = 10;
        currentRow++;

        // ===== COST CALCULATION SECTION =====

        // Row: Total Mileage Cost
        worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = "Total Mileage Cost";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.getCell(`A${currentRow}`).protection = { locked: true };

        worksheet.getCell(`C${currentRow}`).value = 0;
        Object.assign(worksheet.getCell(`C${currentRow}`), numberCellStyle);
        worksheet.getCell(`C${currentRow}`).protection = { locked: true };

        worksheet.getCell(`D${currentRow}`).value = 0;
        Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`D${currentRow}`).protection = { locked: false };
        const mileageCostRow = currentRow;
        currentRow++;

        // Row: Parking Fee
        worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = "Parking Fee";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.getCell(`A${currentRow}`).protection = { locked: true };

        worksheet.getCell(`C${currentRow}`).value = "";
        Object.assign(worksheet.getCell(`C${currentRow}`), cellStyle);
        worksheet.getCell(`C${currentRow}`).protection = { locked: true };

        worksheet.getCell(`D${currentRow}`).value = 0;
        Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`D${currentRow}`).protection = { locked: false };
        const parkingRow = currentRow;
        currentRow++;

        // Row: Highway Cost
        worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = "Highway Cost";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.getCell(`A${currentRow}`).protection = { locked: true };

        worksheet.getCell(`C${currentRow}`).value = "";
        Object.assign(worksheet.getCell(`C${currentRow}`), cellStyle);
        worksheet.getCell(`C${currentRow}`).protection = { locked: true };

        worksheet.getCell(`D${currentRow}`).value = 0;
        Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`D${currentRow}`).protection = { locked: false };
        const highwayRow = currentRow;
        currentRow++;

        // Row: Total
        worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = "Total";
        Object.assign(worksheet.getCell(`A${currentRow}`), totalRowStyle);
        worksheet.getCell(`A${currentRow}`).protection = { locked: true };

        worksheet.getCell(`D${currentRow}`).value = {
            formula: `SUM(D${mileageCostRow}:D${highwayRow})`,
        };
        Object.assign(worksheet.getCell(`D${currentRow}`), totalRowStyle);
        worksheet.getCell(`D${currentRow}`).alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`D${currentRow}`).protection = { locked: true };

        // Enable worksheet protection - only Actual column cells are editable
        await worksheet.protect("", {
            selectLockedCells: true,
            selectUnlockedCells: true,
            formatCells: false,
            formatColumns: false,
            formatRows: false,
            insertColumns: false,
            insertRows: false,
            deleteColumns: false,
            deleteRows: false,
        });

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
    } catch (err: any) {
        console.error("=== Error generating log sheet ===");
        console.error("Error message:", err?.message);
        console.error("Error stack:", err?.stack);
        console.error("Full error:", err);
        return NextResponse.json(
            { error: err?.message || "Failed to generate log sheet", details: err?.toString() },
            { status: 500 }
        );
    }
}
