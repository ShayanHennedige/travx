import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as ExcelJS from "exceljs";
import { format, parseISO, eachDayOfInterval } from "date-fns";

interface CostingSheetItem {
    description?: string;
    vehicle_type?: string;
    mileage?: number;
    total?: number;
    rate?: number;
}

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

// TravX Company Details
const COMPANY = {
    name: "TravX Travel Management",
    address: "63A, Old Road, Pannipitiya, Sri Lanka",
    email: "info@serendiaholidays.com",
    phone: "+94 77 346 9998",
    website: "www.serendiaholidays.com",
};

// Theme colors - TravX Branding
const COLORS = {
    primary600: "E04344", // TravX primary
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
    const url = new URL(request.url);
    const formatQuery = url.searchParams.get("format");
    const supabase = await createClient();

    console.log("=== Driver Log Sheet API Called ===");
    console.log("Tour ID:", tourId);

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

        console.log("Tour query result:", { tour: tour?.id, error: tourError });

        if (tourError || !tour) {
            console.error("Error fetching tour:", tourError);
            return NextResponse.json(
                { error: "Tour not found" },
                { status: 404 }
            );
        }

        // Fetch costing sheet via itinerary_id (costing sheets link to itineraries, not tours)
        let extraKm = 0;
        let battaLimit = 0;
        let totalMileageLimit = 0;
        let parkingLimit = 0;
        let pagingLimit = 0;
        let highwayLimit = 0;
        let mileageRate = 0;
        let baseTransportCost = 0;
        
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
                let extraKmItem = costingSheet.transport_data.find((item: CostingSheetItem) =>
                    item.description?.toLowerCase() === 'extra km' ||
                    item.description?.toLowerCase() === 'extra kms'
                );

                // Fallback: search for any row containing "extra"
                if (!extraKmItem) {
                    extraKmItem = costingSheet.transport_data.find((item: CostingSheetItem) =>
                        item.description?.toLowerCase().includes('extra')
                    );
                }

                if (extraKmItem && extraKmItem.mileage) {
                    extraKm = extraKmItem.mileage;
                    console.log("Extra KM found:", extraKm, "from row:", extraKmItem.description);
                }

                // Find Batta
                const battaItem = costingSheet.transport_data.find((item: CostingSheetItem) => 
                   item.description?.toLowerCase().includes('batta')
                );
                if (battaItem) {
                   battaLimit = battaItem.total || 0;
                }
                
                // Find Parking
                const parkingItem = costingSheet.transport_data.find((item: CostingSheetItem) => 
                   item.description?.toLowerCase().includes('parking')
                );
                if (parkingItem) {
                   parkingLimit = parkingItem.total || 0;
                }

                // Find Paging Fee
                const pagingItem = costingSheet.transport_data.find((item: CostingSheetItem) => 
                   item.description?.toLowerCase().includes('paging')
                );
                if (pagingItem) {
                   pagingLimit = pagingItem.total || 0;
                }

                // Find Highway
                const highwayItem = costingSheet.transport_data.find((item: CostingSheetItem) => 
                   item.description?.toLowerCase().includes('highway')
                );
                if (highwayItem) {
                   highwayLimit = highwayItem.total || 0;
                }

                // Calculate Total Mileage Limit (Sum of mileage column in costing or specific item)
                // Assuming the costing sheet has a breakdown, but usually we just want the total
                // transport limit. Let's look for a "Transport" item or sum up.
                // For now, let's sum up items that look like mileage charges (excluding extra km)
                const mainTransport = costingSheet.transport_data.find((item: CostingSheetItem) => 
                     item.description?.toLowerCase().includes('transport') || item.vehicle_type
                );
                if (mainTransport) {
                    totalMileageLimit = mainTransport.mileage || 0;
                    mileageRate = mainTransport.rate || 0;
                    baseTransportCost = mainTransport.total || 0;
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

        // Parse itinerary content
        let itineraryContent: ItineraryContent | null = null;
        let resolvedInquiryId: string | null = (tour.inquiry_id as string | null) || (tour.itineraries?.inquiry_id as string | null) || null;
        let resolvedGroupInquiryId: string | null = (tour.group_inquiry_id as string | null) || (tour.itineraries?.group_inquiry_id as string | null) || null;
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
                resolvedInquiryId = resolvedInquiryId || directItinerary.inquiry_id || null;
                resolvedGroupInquiryId = resolvedGroupInquiryId || directItinerary.group_inquiry_id || null;
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
        if (resolvedInquiryId) {
            const { data: inquiryData } = await supabase
                .from("inquiries")
                .select("first_name, last_name, country, no_of_pax, no_of_children, agent_name, agent_company, arrival_flight_no, arrival_time, departure_flight_no, departure_time")
                .eq("id", resolvedInquiryId)
                .single();
            inquiry = inquiryData;
        }

        // Fetch group inquiry data if available
        let groupInquiry = null;
        if (resolvedGroupInquiryId) {
            const { data: groupInquiryData } = await supabase
                .from("group_inquiries")
                .select("head_first_name, head_last_name, country, no_of_adults, no_of_children, agent_name, agent_company, arrival_flight_no, arrival_time, departure_flight_no, departure_time")
                .eq("id", resolvedGroupInquiryId)
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

        const tableHeaderStyle: Partial<ExcelJS.Style> = {
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
        let paxAdults = tour.pax_adults || 0;
        let paxChildren = tour.pax_children || 0;

        if (inquiry) {
            paxAdults = inquiry.no_of_pax || paxAdults;
            paxChildren = inquiry.no_of_children || paxChildren;
        } else if (groupInquiry) {
            paxAdults = groupInquiry.no_of_adults || paxAdults;
            paxChildren = groupInquiry.no_of_children || paxChildren;
        }

        let paxInfo = `${paxAdults} Adults`;
        if (paxChildren > 0) {
            paxInfo += `, ${paxChildren} Children`;
        }

        if (inquiry) {
            guestName = `${inquiry.first_name || ""} ${inquiry.last_name || ""}`.trim() || tour.client_name;
            travelAgent = inquiry.agent_company
                ? `${inquiry.agent_company}${inquiry.agent_name ? ` (${inquiry.agent_name})` : ""}`
                : (inquiry.country ? `Direct-${inquiry.country}` : "Direct");
        } else if (groupInquiry) {
            const headName = `${groupInquiry.head_first_name || ""} ${groupInquiry.head_last_name || ""}`.trim();
            guestName = headName || tour.client_name;
            travelAgent = groupInquiry.agent_company
                ? `${groupInquiry.agent_company}${groupInquiry.agent_name ? ` (${groupInquiry.agent_name})` : ""}`
                : (groupInquiry.country ? `Direct-${groupInquiry.country}` : "Direct");
        }

        const arrivalFlightNo = tour.arrival_flight_no || inquiry?.arrival_flight_no || groupInquiry?.arrival_flight_no || "";
        const arrivalTime = tour.arrival_time || inquiry?.arrival_time || groupInquiry?.arrival_time || "";
        const departureFlightNo = tour.departure_flight_no || inquiry?.departure_flight_no || groupInquiry?.departure_flight_no || "";
        const departureTime = tour.departure_time || inquiry?.departure_time || groupInquiry?.departure_time || "";

        const arrivalFlight = arrivalFlightNo
            ? `${arrivalFlightNo}${arrivalTime ? ` (${arrivalTime})` : ""}`
            : "N/A";
        const departureFlight = departureFlightNo
            ? `${departureFlightNo}${departureTime ? ` (${departureTime})` : ""}`
            : "N/A";

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

        // Row: Arrival Flight | Departure Flight
        worksheet.getCell(`A${currentRow}`).value = "Arrival Flight";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.getCell(`B${currentRow}`).value = arrivalFlight;
        Object.assign(worksheet.getCell(`B${currentRow}`), cellStyle);
        worksheet.getCell(`C${currentRow}`).value = "Dep. Flight";
        Object.assign(worksheet.getCell(`C${currentRow}`), labelStyle);
        worksheet.getCell(`D${currentRow}`).value = departureFlight;
        Object.assign(worksheet.getCell(`D${currentRow}`), cellStyle);
        currentRow++;

        // Row: Total Package Mileage Limit
        if (totalMileageLimit > 0) {
            worksheet.getCell(`A${currentRow}`).value = "Package KM";
            Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
            worksheet.getCell(`B${currentRow}`).value = `${totalMileageLimit} KM`;
            Object.assign(worksheet.getCell(`B${currentRow}`), cellStyle);
            worksheet.getCell(`B${currentRow}`).font = { bold: true };
            
            worksheet.getCell(`C${currentRow}`).value = "Batta Total";
            Object.assign(worksheet.getCell(`C${currentRow}`), labelStyle);
            worksheet.getCell(`D${currentRow}`).value = battaLimit > 0 ? battaLimit : "N/A";
            Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
            worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
            
            currentRow++;
        }

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
            tourDays = itineraryContent.days.map((day) => {
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
            
            // Add Garage -> Airport (Fixed)
            if (tourDays.length > 0) {
                 tourDays.unshift({
                    date: tourDays[0].date,
                    location: "Garage to Airport (Fixed)",
                    mileage: 0
                 });
            }

            // Modify Last Day to include Departure info and append Airport -> Garage
            if (tourDays.length > 0) {
                 const lastDayIndex = tourDays.length - 1;
                 const lastDate = tourDays[lastDayIndex].date;
                 
                 // If the last day description is vague, clarify it
                 if (tourDays[lastDayIndex].location === "Departure") {
                     tourDays[lastDayIndex].location = "Hotel to Airport";
                 }

                 tourDays.push({
                    date: lastDate,
                    location: "Airport to Garage",
                    mileage: 0
                 });
            }

        } else if (tour.start_date && tour.end_date) {
            const dates = eachDayOfInterval({
                start: parseISO(tour.start_date),
                end: parseISO(tour.end_date),
            });
            tourDays = dates.map((date, index) => ({
                date,
                location: index === 0 ? "Airport / Hotel" : index === dates.length - 1 ? "Hotel / Airport" : "",
                mileage: 0,
            }));
            
            // Add fixed runs for fallback itinerary too
            if (tourDays.length > 0) {
                 tourDays.unshift({
                    date: tourDays[0].date,
                    location: "Garage to Airport (Fixed)",
                    mileage: 0
                 });
                 
                 tourDays.push({
                    date: tourDays[tourDays.length - 1].date,
                    location: "Airport to Garage",
                    mileage: 0
                 });
            }
        }
        
        // Remove duplicates if any (e.g. if extractMileageFromDay returns first day as Garage) - unlikely but good to be safe if logic changes
        
        // If JSON format is requested, return the structured data
        if (formatQuery === "json") {
            return NextResponse.json({
                company: COMPANY,
                tour: {
                    guestName,
                    travelAgent,
                    driverName,
                    paxInfo,
                    driverVehicle,
                    arrivalDate,
                    departureDate,
                    arrivalFlight,
                    departureFlight,
                },
                limits: {
                    totalMileageLimit,
                    battaLimit,
                    parkingLimit,
                    pagingLimit,
                    highwayLimit,
                    mileageRate,
                    baseTransportCost,
                },
                days: tourDays.map((td, index) => ({
                    day: index + 1,
                    date: td.date.toISOString(),
                    route: td.location,
                    estimatedKm: td.mileage,
                    actualKm: 0,
                    parking: 0,
                    highway: 0,
                    batta: 0,
                    otherExpenses: 0,
                }))
            });
        }
        
        // Add daily entries
        tourDays.forEach((day, index) => {
            const isEvenRow = index % 2 === 0;
            const rowFill: ExcelJS.Fill = isEvenRow
                ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } }
                : { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + COLORS.primary50 } };

            worksheet.getCell(`A${currentRow}`).value = format(day.date, "dd-MMM");
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

        worksheet.getCell(`B${currentRow}`).value = "Total KM (Driver vs Actual)";
        Object.assign(worksheet.getCell(`B${currentRow}`), totalRowStyle);
        worksheet.getCell(`B${currentRow}`).alignment = { horizontal: "right", vertical: "middle" };
        worksheet.getCell(`B${currentRow}`).protection = { locked: true };

        worksheet.getCell(`C${currentRow}`).value = {
            formula: `SUM(C${logStartRow}:C${logEndRow})`,
        };
        Object.assign(worksheet.getCell(`C${currentRow}`), totalRowStyle);
        worksheet.getCell(`C${currentRow}`).alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getCell(`C${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`C${currentRow}`).protection = { locked: true };

        worksheet.getCell(`D${currentRow}`).value = {
            formula: `SUM(D${logStartRow}:D${logEndRow})`,
        };
        Object.assign(worksheet.getCell(`D${currentRow}`), totalRowStyle);
        worksheet.getCell(`D${currentRow}`).alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`D${currentRow}`).protection = { locked: true };

        const totalMileageRow = currentRow;
        currentRow++;

        // Extra KM Rate Display
        worksheet.getCell(`A${currentRow}`).value = "";
        Object.assign(worksheet.getCell(`A${currentRow}`), cellStyle);
        worksheet.getCell(`A${currentRow}`).protection = { locked: true };

        worksheet.getCell(`B${currentRow}`).value = "Excess Rate / KM";
        Object.assign(worksheet.getCell(`B${currentRow}`), labelStyle);
        worksheet.getCell(`B${currentRow}`).alignment = { horizontal: "right", vertical: "middle" };
        worksheet.getCell(`B${currentRow}`).protection = { locked: true };

        worksheet.getCell(`C${currentRow}`).value = mileageRate;
        Object.assign(worksheet.getCell(`C${currentRow}`), numberCellStyle);
        worksheet.getCell(`C${currentRow}`).numFmt = "#,##0.00"; 
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

        // Col C: Budgeted/Base Cost (from costing sheet)
        worksheet.getCell(`C${currentRow}`).value = baseTransportCost;
        Object.assign(worksheet.getCell(`C${currentRow}`), numberCellStyle);
        worksheet.getCell(`C${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`C${currentRow}`).protection = { locked: true };

        // Col D: Calculated Cost (Base + Excess)
        // Formula: IF(ActualKM > Limit, Base + (Actual - Limit)*Rate, Base)
        // Note: Using MAX(0, ...) helps avoid negative if Actual < Limit 
        const mileageCostFormula = `IF(D${totalMileageRow} > ${totalMileageLimit}, ${baseTransportCost} + (D${totalMileageRow} - ${totalMileageLimit}) * ${mileageRate}, ${baseTransportCost})`;
        
        worksheet.getCell(`D${currentRow}`).value = { formula: mileageCostFormula };
        Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`D${currentRow}`).protection = { locked: true }; // Calculated, so locked
        const mileageCostRow = currentRow;
        currentRow++;


        // Row: Paging Fee
        worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = "Paging Fee";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.getCell(`A${currentRow}`).protection = { locked: true };

        worksheet.getCell(`C${currentRow}`).value = pagingLimit;
        Object.assign(worksheet.getCell(`C${currentRow}`), numberCellStyle);
        worksheet.getCell(`C${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`C${currentRow}`).protection = { locked: true };

        worksheet.getCell(`D${currentRow}`).value = "";
        Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`D${currentRow}`).protection = { locked: false };
        const pagingRow = currentRow;
        currentRow++;

        // Row: Highway Cost
        worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = "Highway Cost";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.getCell(`A${currentRow}`).protection = { locked: true };

        worksheet.getCell(`C${currentRow}`).value = highwayLimit;
        Object.assign(worksheet.getCell(`C${currentRow}`), numberCellStyle);
        worksheet.getCell(`C${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`C${currentRow}`).protection = { locked: true };

        worksheet.getCell(`D${currentRow}`).value = "";
        Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`D${currentRow}`).protection = { locked: false };
        const highwayRow = currentRow;
        currentRow++;

        // Row: Batta
        worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = "Batta";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.getCell(`A${currentRow}`).protection = { locked: true };

        worksheet.getCell(`C${currentRow}`).value = battaLimit;
        Object.assign(worksheet.getCell(`C${currentRow}`), numberCellStyle);
        worksheet.getCell(`C${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`C${currentRow}`).protection = { locked: true };

        worksheet.getCell(`D${currentRow}`).value = "";
        Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`D${currentRow}`).protection = { locked: false };
        const battaRow = currentRow;
        currentRow++;
        
        // Row: Tickets / Entry Fees (New)
        worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = "Tickets / Entry Fees";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.getCell(`A${currentRow}`).protection = { locked: true };

        worksheet.getCell(`C${currentRow}`).value = ""; // No budget usually
        Object.assign(worksheet.getCell(`C${currentRow}`), numberCellStyle);
        worksheet.getCell(`C${currentRow}`).protection = { locked: true };

        worksheet.getCell(`D${currentRow}`).value = "";
        Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`D${currentRow}`).protection = { locked: false }; // Editable
        const ticketsRow = currentRow;
        currentRow++;

        // Row: Other Expenses (New)
        worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = "Other Expenses";
        Object.assign(worksheet.getCell(`A${currentRow}`), labelStyle);
        worksheet.getCell(`A${currentRow}`).protection = { locked: true };

        worksheet.getCell(`C${currentRow}`).value = ""; 
        Object.assign(worksheet.getCell(`C${currentRow}`), numberCellStyle);
        worksheet.getCell(`C${currentRow}`).protection = { locked: true };

        worksheet.getCell(`D${currentRow}`).value = "";
        Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`D${currentRow}`).protection = { locked: false }; // Editable
        const otherRow = currentRow;
        currentRow++;

        // Row: Total
        worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = "TOTAL PRICE";
        Object.assign(worksheet.getCell(`A${currentRow}`), totalRowStyle);
        worksheet.getCell(`A${currentRow}`).protection = { locked: true };

        // Sum all costs in Col D
        worksheet.getCell(`D${currentRow}`).value = {
            formula: `SUM(D${mileageCostRow}, D${pagingRow}, D${highwayRow}, D${battaRow}, D${ticketsRow}, D${otherRow})`,
        };
        Object.assign(worksheet.getCell(`D${currentRow}`), totalRowStyle);
        worksheet.getCell(`D${currentRow}`).alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`D${currentRow}`).protection = { locked: true };
        const totalRow = currentRow;
        currentRow++;

        // Row: Tour Advance
        worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = "Tour Advance";
        Object.assign(worksheet.getCell(`A${currentRow}`), {
            ...labelStyle,
            alignment: { horizontal: "right", vertical: "middle" }
        });
        worksheet.getCell(`A${currentRow}`).protection = { locked: true };

        worksheet.getCell(`D${currentRow}`).value = ""; // editable
        Object.assign(worksheet.getCell(`D${currentRow}`), numberCellStyle);
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`D${currentRow}`).protection = { locked: false };
        const advanceRow = currentRow;
        currentRow++;

        // Row: Balance Due
        worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = "Balance Due";
        Object.assign(worksheet.getCell(`A${currentRow}`), totalRowStyle);
        worksheet.getCell(`A${currentRow}`).protection = { locked: true };

        worksheet.getCell(`D${currentRow}`).value = {
            formula: `D${totalRow}-D${advanceRow}`,
        };
        Object.assign(worksheet.getCell(`D${currentRow}`), totalRowStyle);
        worksheet.getCell(`D${currentRow}`).alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getCell(`D${currentRow}`).numFmt = "#,##0";
        worksheet.getCell(`D${currentRow}`).protection = { locked: true };
        currentRow++;

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
    } catch (err) {
        console.error("Error generating log sheet:", err);
        return NextResponse.json(
            { error: "Failed to generate log sheet" },
            { status: 500 }
        );
    }
}
