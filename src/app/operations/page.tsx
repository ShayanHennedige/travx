import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { OperationsList } from "@/app/operations/OperationsList";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
    const supabase = await createClient();

    // Fetch all itineraries (core columns only — no embedded joins, FK not defined in schema)
    const { data: itineraries, error } = await supabase
        .from("itineraries")
        .select("id, content, created_at, updated_at, status, inquiry_id, group_inquiry_id")
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) {
        console.error("Error fetching itineraries:", error.message, error.code, error.details);
    }

    // Fetch costing sheets for all itineraries
    const itineraryIds = itineraries?.map(itinerary => itinerary.id) || [];

    // Collect inquiry IDs for separate fetches
    const inquiryIds = (itineraries || []).map(i => i.inquiry_id).filter(Boolean) as string[];
    const groupInquiryIds = (itineraries || []).map(i => i.group_inquiry_id).filter(Boolean) as string[];

    // Fetch individual inquiries
    const { data: inquiriesData } = inquiryIds.length > 0
        ? await supabase
            .from("inquiries")
            .select("id, inquiry_number, first_name, last_name, client_name, client_email, passport_no, country, arriving_date, departure_date, no_of_nights, no_of_pax, no_of_children, agent_name, agent_company, hotel_type, meal_plan, room_category, rooms_sgl, rooms_dbl, rooms_tpl, rooms_qtpl")
            .in("id", inquiryIds)
        : { data: [] as any[] };

    // Fetch group inquiries
    const { data: groupInquiriesData } = groupInquiryIds.length > 0
        ? await supabase
            .from("group_inquiries")
            .select("id, inquiry_number, head_first_name, head_last_name, head_passport_no, country, agent_name, agent_company, arriving_date, departure_date, no_of_nights, no_of_adults, no_of_children, hotel_type, meal_plan, room_category, rooms_sgl, rooms_dbl, rooms_tpl, rooms_qtpl")
            .in("id", groupInquiryIds)
        : { data: [] as any[] };

    // Build lookup maps for inquiries
    const inquiryMap = new Map((inquiriesData || []).map((i: any) => [i.id, i]));
    const groupInquiryMap = new Map((groupInquiriesData || []).map((i: any) => [i.id, i]));
    const { data: costingSheets } = await supabase
        .from("tour_costing_sheets")
        .select("*")
        .in("itinerary_id", itineraryIds);

    // Fetch tours for all itineraries
    const { data: tours } = await supabase
        .from("tours")
        .select("id, itinerary_id")
        .in("itinerary_id", itineraryIds);

    // Fetch data for count maps
    const { data: vouchers } = await supabase
        .from("hotel_vouchers")
        .select("id, itinerary_id")
        .in("itinerary_id", itineraryIds);

    const { data: invoicesByItinerary } = await supabase
        .from("customer_invoices")
        .select("id, itinerary_id, tour_id")
        .in("itinerary_id", itineraryIds);

    // Fetch payment vouchers via tours
    const tourIds = tours?.map(t => t.id) || [];
    const { data: invoicesByTour } = tourIds.length > 0
        ? await supabase
            .from("customer_invoices")
            .select("id, itinerary_id, tour_id")
            .in("tour_id", tourIds)
        : { data: [] as any[] };

    const { data: paymentVouchers } = await supabase
        .from("payment_vouchers")
        .select("id, tour_id")
        .in("tour_id", tourIds);

    const invoices = Array.from(
        new Map(
            [...(invoicesByItinerary || []), ...(invoicesByTour || [])].map((invoice: any) => [invoice.id, invoice])
        ).values()
    );


    // Create lookup maps
    const costingMap = new Map(costingSheets?.map(c => [c.itinerary_id, c]) || []);
    const tourMap = new Map(tours?.map(t => [t.itinerary_id, t]) || []);
    const itineraryIdByTourId = new Map(tours?.map(t => [t.id, t.itinerary_id]) || []);

    // Create count maps
    const voucherCountMap = new Map<string, number>();
    vouchers?.forEach(v => {
        voucherCountMap.set(v.itinerary_id, (voucherCountMap.get(v.itinerary_id) || 0) + 1);
    });

    const invoiceCountMap = new Map<string, number>();
    invoices?.forEach(i => {
        const targetItineraryId = i.itinerary_id || (i.tour_id ? itineraryIdByTourId.get(i.tour_id) : undefined);
        if (!targetItineraryId) return;
        invoiceCountMap.set(targetItineraryId, (invoiceCountMap.get(targetItineraryId) || 0) + 1);
    });

    // Create payment voucher count map (keyed by tour_id)
    const paymentVoucherCountMap = new Map<string, number>();
    paymentVouchers?.forEach(pv => {
        paymentVoucherCountMap.set(pv.tour_id, (paymentVoucherCountMap.get(pv.tour_id) || 0) + 1);
    });


    // Combine data
    const operationsData = (itineraries || []).map(itinerary => {
        const individualInquiry = itinerary.inquiry_id ? inquiryMap.get(itinerary.inquiry_id) : null;
        const groupInquiry = itinerary.group_inquiry_id ? groupInquiryMap.get(itinerary.group_inquiry_id) : null;

        const isGroup = !!groupInquiry;
        const inquirySource = isGroup ? groupInquiry : individualInquiry;
        const costingSheet = costingMap.get(itinerary.id);
        const tour = tourMap.get(itinerary.id);
        const content = (itinerary.content as any) || {};

        // Extract hotels for vouchers
        const hotels: any[] = [];
        if (content.days && inquirySource?.arriving_date) {
            let currentDate = new Date(inquirySource.arriving_date);
            content.days.slice(0, -1).forEach((day: any) => {
                const nextDate = new Date(currentDate);
                nextDate.setDate(currentDate.getDate() + 1);

                if (day.hotel_suggestion) {
                    hotels.push({
                        hotel_name: day.hotel_suggestion,
                        location: day.overnight_location,
                        check_in_date: currentDate.toISOString().split("T")[0],
                        check_out_date: nextDate.toISOString().split("T")[0],
                        no_of_nights: 1
                    });
                }
                currentDate = nextDate;
            });
        }

        return {
            id: itinerary.id,
            inquiryId: itinerary.inquiry_id,
            groupInquiryId: itinerary.group_inquiry_id,
            inquiryNumber: inquirySource?.inquiry_number || "N/A",
            clientName: costingSheet?.client_name || (isGroup
                ? (groupInquiry?.agent_name || `${groupInquiry?.head_first_name || ""} ${groupInquiry?.head_last_name || ""}`.trim() || "Group")
                : (individualInquiry?.client_name || `${individualInquiry?.first_name || ""} ${individualInquiry?.last_name || ""}`.trim() || "Guest")),
            agentName: isGroup ? groupInquiry?.agent_name : (individualInquiry?.agent_name || ""),
            passportNo: costingSheet?.passport_no || (isGroup ? groupInquiry?.head_passport_no : (individualInquiry?.passport_no || "")),
            country: costingSheet?.country || (inquirySource as any)?.country || "Not specified",
            isGroup,
            arrivalDate: inquirySource?.arriving_date,
            departureDate: inquirySource?.departure_date,
            noOfNights: inquirySource?.no_of_nights || 0,
            paxAdults: isGroup ? (groupInquiry?.no_of_adults || 1) : (individualInquiry?.no_of_pax || 1),
            paxChildren: inquirySource?.no_of_children || 0,
            nationality: (inquirySource as any)?.country || "Not specified",
            agentCompany: inquirySource?.agent_company || "N/A",
            mealPlan: inquirySource?.meal_plan || "BB",
            roomCategory: inquirySource?.room_category || "Standard",
            title: content.title || "Untitled Itinerary",
            createdAt: itinerary.created_at,
            status: itinerary.status,
            costingSheet: costingSheet || null,
            tour: tour ? { id: tour.id } : null,
            vouchersCount: voucherCountMap.get(itinerary.id) || 0,
            invoicesCount: invoiceCountMap.get(itinerary.id) || 0,
            itineraryDays: content.days || [],
            totalDistance: content.total_distance_km,
            hotelType: inquirySource?.hotel_type || "Standard",
            hotels: hotels,
            roomsSgl: inquirySource?.rooms_sgl || 0,
            roomsDbl: inquirySource?.rooms_dbl || 0,
            roomsTpl: inquirySource?.rooms_tpl || 0,
            roomsQtpl: inquirySource?.rooms_qtpl || 0,
            paymentVouchersCount: tour ? (paymentVoucherCountMap.get(tour.id) || 0) : 0,
        };
    });

    return (
        <AppLayout>
            <Header
                title="Operations"
                subtitle="Track and manage all tour operations and workflows from initial costing to final hotel vouchers in one place."
            />
            <OperationsList operations={operationsData} />
        </AppLayout>
    );
}
