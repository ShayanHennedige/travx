import { createClient } from "@/lib/supabase/server";
import { format, parseISO, eachDayOfInterval } from "date-fns";

export interface LogSheetDay {
    day: number;
    date: string;
    route: string;
    estimatedKm: number;
    actualKm: number;
    parking: number;
    highway: number;
    batta: number;
    otherExpenses: number;
}

export interface LogSheetBaseline {
    company: any;
    tour: {
        guestName: string;
        travelAgent: string;
        driverName: string;
        paxInfo: string;
        driverVehicle: string;
        arrivalDate: string;
        departureDate: string;
        arrivalFlight: string;
        departureFlight: string;
    };
    limits: {
        totalMileageLimit: number;
        battaLimit: number;
        parkingLimit: number;
        pagingLimit: number;
        highwayLimit: number;
        mileageRate: number;
        baseTransportCost: number;
    };
    days: LogSheetDay[];
}

const COMPANY = {
    name: "TravX",
    address: "63A, Old Road, Pannipitiya, Sri Lanka",
    phone: "+94 77 346 9998",
    email: "info@serendiaholidays.com",
    website: "www.serendiaholidays.com",
};

export async function getLogSheetBaseline(tourId: string): Promise<LogSheetBaseline> {
    const supabase = await createClient();

    // Fetch tour with related data
    const { data: tour, error: tourError } = await supabase
        .from("tours")
        .select(`
            *,
            drivers (id, name, vehicle_type, vehicle_number),
            itineraries (id, content, inquiry_id, group_inquiry_id)
        `)
        .eq("id", tourId)
        .single();

    if (tourError || !tour) {
        throw new Error("Tour not found");
    }

    let extraKm = 0;
    let battaLimit = 0;
    let totalMileageLimit = 0;
    let parkingLimit = 0;
    let pagingLimit = 0;
    let highwayLimit = 0;
    let mileageRate = 0;
    let baseTransportCost = 0;

    if (tour.itinerary_id) {
        const { data: costingSheet } = await supabase
            .from("tour_costing_sheets")
            .select("transport_data")
            .eq("itinerary_id", tour.itinerary_id)
            .single();

        if (costingSheet?.transport_data && Array.isArray(costingSheet.transport_data)) {
            const extraKmItem = costingSheet.transport_data.find((item: any) =>
                item.description?.toLowerCase().includes('extra')
            );
            if (extraKmItem?.mileage) extraKm = extraKmItem.mileage;

            const battaItem = costingSheet.transport_data.find((item: any) => 
               item.description?.toLowerCase().includes('batta')
            );
            if (battaItem) battaLimit = battaItem.total || 0;

            const pagingItem = costingSheet.transport_data.find((item: any) => 
               item.description?.toLowerCase().includes('paging')
            );
            if (pagingItem) pagingLimit = pagingItem.total || 0;

            const highwayItem = costingSheet.transport_data.find((item: any) => 
               item.description?.toLowerCase().includes('highway')
            );
            if (highwayItem) highwayLimit = highwayItem.total || 0;

            const mainTransport = costingSheet.transport_data.find((item: any) => 
                 item.description?.toLowerCase().includes('transport') || item.vehicle_type
            );
            if (mainTransport) {
                totalMileageLimit = mainTransport.mileage || 0;
                mileageRate = mainTransport.rate || 0;
                baseTransportCost = mainTransport.total || 0;
            }
        }
    }

    let itineraryContent: any = null;
    if (tour.itineraries?.content) {
        itineraryContent = typeof tour.itineraries.content === "string"
            ? JSON.parse(tour.itineraries.content)
            : tour.itineraries.content;
    }

    // Resolve Guest/Pax
    let inquiry = null;
    if (tour.itineraries?.inquiry_id) {
        const { data } = await supabase.from("inquiries").select("*").eq("id", tour.itineraries.inquiry_id).single();
        inquiry = data;
    }
    let groupInquiry = null;
    if (tour.itineraries?.group_inquiry_id) {
        const { data } = await supabase.from("group_inquiries").select("*").eq("id", tour.itineraries.group_inquiry_id).single();
        groupInquiry = data;
    }

    let guestName = tour.client_name || "";
    let travelAgent = "";
    let paxAdults = tour.pax_adults || 0;
    let paxChildren = tour.pax_children || 0;

    if (inquiry) {
        guestName = `${inquiry.first_name || ""} ${inquiry.last_name || ""}`.trim() || guestName;
        paxAdults = inquiry.no_of_pax || paxAdults;
        paxChildren = inquiry.no_of_children || paxChildren;
        travelAgent = inquiry.agent_company || (inquiry.country ? `Direct-${inquiry.country}` : "Direct");
    } else if (groupInquiry) {
        guestName = `${groupInquiry.head_first_name || ""} ${groupInquiry.head_last_name || ""}`.trim() || guestName;
        paxAdults = groupInquiry.no_of_adults || paxAdults;
        paxChildren = groupInquiry.no_of_children || paxChildren;
        travelAgent = groupInquiry.agent_company || (groupInquiry.country ? `Direct-${groupInquiry.country}` : "Direct");
    }

    const paxInfo = `${paxAdults} Adults${paxChildren > 0 ? `, ${paxChildren} Children` : ""}`;
    const arrivalFlight = `${tour.arrival_flight_no || inquiry?.arrival_flight_no || ""} (${tour.arrival_time || inquiry?.arrival_time || ""})`.trim();
    const departureFlight = `${tour.departure_flight_no || inquiry?.departure_flight_no || ""} (${tour.departure_time || inquiry?.departure_time || ""})`.trim();

    // Map Days
    let tourDays: any[] = [];
    if (itineraryContent?.days) {
        tourDays = itineraryContent.days.map((day: any) => ({
            date: day.date,
            location: day.title || day.overnight_location || "",
            mileage: (day.transport_data?.find((t: any) => t.type === 'mileage')?.value) || 0,
        }));
        
        // Add Garage runs
        tourDays.unshift({ date: tourDays[0].date, location: "Garage to Airport (Fixed)", mileage: 0 });
        tourDays.push({ date: tourDays[tourDays.length-1].date, location: "Airport to Garage", mileage: 0 });
    }

    return {
        company: COMPANY,
        tour: {
            guestName,
            travelAgent,
            driverName: tour.drivers?.name || "Not Assigned",
            paxInfo,
            driverVehicle: tour.drivers?.vehicle_type ? `${tour.drivers.vehicle_type} (${tour.drivers.vehicle_number || ""})` : "",
            arrivalDate: tour.start_date ? format(parseISO(tour.start_date), "dd MMM yyyy") : "",
            departureDate: tour.end_date ? format(parseISO(tour.end_date), "dd MMM yyyy") : "",
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
            date: td.date,
            route: td.location,
            estimatedKm: td.mileage,
            actualKm: 0,
            parking: 0,
            highway: 0,
            batta: 0,
            otherExpenses: 0,
        }))
    };
}
