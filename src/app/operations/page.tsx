import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { OperationsList } from "@/app/operations/OperationsList";

export default async function OperationsPage() {
    const supabase = await createClient();

    // Fetch all itineraries with their related data
    const { data: itineraries, error } = await supabase
        .from("itineraries")
        .select(`
      id,
      content,
      created_at,
      updated_at,
      status,
      decline_reason,
      declined_at,
      inquiry_id,
      group_inquiry_id,
      inquiries (
        id,
        inquiry_number,
        first_name,
        last_name,
        client_name,
        client_email,
        passport_no,
        country,
        arriving_date,
        departure_date,
        no_of_pax,
        no_of_children,
        is_tour_agent,
        agent_name,
        agent_company,
        arrival_flight_no,
        arrival_time,
        departure_flight_no,
        departure_time,
        hotel_type,
        meal_plan,
        room_category,
        rooms_sgl,
        rooms_dbl,
        rooms_tpl,
        rooms_qtpl
      ),
      group_inquiries (
        id,
        inquiry_number,
        head_first_name,
        head_last_name,
        head_passport_no,
        country,
        agent_name,
        agent_company,
        arriving_date,
        departure_date,
        no_of_adults,
        no_of_children,
        hotel_type,
        meal_plan,
        room_category,
        rooms_sgl,
        rooms_dbl,
        rooms_tpl,
        rooms_qtpl
      )
    `)
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) {
        console.error("Error fetching itineraries:", error);
    }

    // Fetch costing sheets for all itineraries
    const itineraryIds = itineraries?.map(itinerary => itinerary.id) || [];
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

    const { data: invoices } = await supabase
        .from("customer_invoices")
        .select("id, itinerary_id")
        .in("itinerary_id", itineraryIds);

    // Fetch payment vouchers via tours
    const tourIds = tours?.map(t => t.id) || [];
    const { data: paymentVouchers } = await supabase
        .from("payment_vouchers")
        .select("id, tour_id")
        .in("tour_id", tourIds);


    // Create lookup maps
    const costingMap = new Map(costingSheets?.map(c => [c.itinerary_id, c]) || []);
    const tourMap = new Map(tours?.map(t => [t.itinerary_id, t]) || []);

    // Create count maps
    const voucherCountMap = new Map<string, number>();
    vouchers?.forEach(v => {
        voucherCountMap.set(v.itinerary_id, (voucherCountMap.get(v.itinerary_id) || 0) + 1);
    });

    const invoiceCountMap = new Map<string, number>();
    invoices?.forEach(i => {
        invoiceCountMap.set(i.itinerary_id, (invoiceCountMap.get(i.itinerary_id) || 0) + 1);
    });

    // Create payment voucher count map (keyed by tour_id)
    const paymentVoucherCountMap = new Map<string, number>();
    paymentVouchers?.forEach(pv => {
        paymentVoucherCountMap.set(pv.tour_id, (paymentVoucherCountMap.get(pv.tour_id) || 0) + 1);
    });



    // Helper to calculate nights
    const calculateNights = (start: string | null, end: string | null) => {
        if (!start || !end) return 0;
        const s = new Date(start);
        const e = new Date(end);
        return Math.max(0, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
    };

    // Combine data
    const operationsData = (itineraries || []).map(itinerary => {
        // Supabase returns joined data as objects for single relations, but handle arrays for robustness
        const individualInquiry = Array.isArray(itinerary.inquiries) ? itinerary.inquiries[0] : itinerary.inquiries as any;
        const groupInquiry = Array.isArray(itinerary.group_inquiries) ? itinerary.group_inquiries[0] : itinerary.group_inquiries as any;

        const isGroup = !!groupInquiry;
        const inquirySource = isGroup ? groupInquiry : individualInquiry;
        
        // Calculate nights if missing
        const noOfNights = inquirySource?.no_of_nights || calculateNights(inquirySource?.arriving_date, inquirySource?.departure_date);

        const costingSheet = costingMap.get(itinerary.id);
        const tour = tourMap.get(itinerary.id);
        const content = (itinerary.content as any) || {};

        // Extract hotels for vouchers, including departure-day day-use hotels.
        const hotels: any[] = [];
        if (content.days && inquirySource?.arriving_date) {
            let currentDate = new Date(inquirySource.arriving_date);
            content.days.forEach((day: any, index: number) => {
                const nextDate = new Date(currentDate);
                nextDate.setDate(currentDate.getDate() + 1);
                const isLastDay = index === content.days.length - 1;

                if (day.hotel_suggestion) {
                    const checkOutDate = isLastDay ? currentDate : nextDate;
                    hotels.push({
                        hotel_name: day.hotel_suggestion,
                        location: day.overnight_location,
                        check_in_date: currentDate.toISOString().split("T")[0],
                        check_out_date: checkOutDate.toISOString().split("T")[0],
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
                ? (`${groupInquiry?.head_first_name || ""} ${groupInquiry?.head_last_name || ""}`.trim() || "Group")
                : (individualInquiry?.client_name || `${individualInquiry?.first_name || ""} ${individualInquiry?.last_name || ""}`.trim() || "Guest")),
            agentName: isGroup ? groupInquiry?.agent_name : (individualInquiry?.agent_name || ""),
            passportNo: costingSheet?.passport_no || (isGroup ? groupInquiry?.head_passport_no : (individualInquiry?.passport_no || "")),
            country: costingSheet?.country || (inquirySource as any)?.country || "Not specified",
            isGroup,
            arrivalDate: inquirySource?.arriving_date,
            departureDate: inquirySource?.departure_date,
            noOfNights: noOfNights,
            paxAdults: isGroup ? (groupInquiry?.no_of_adults || 1) : (individualInquiry?.no_of_pax || 1),
            paxChildren: inquirySource?.no_of_children || 0,
            nationality: (inquirySource as any)?.country || "Not specified",
            agentCompany: inquirySource?.agent_company || "N/A",
            mealPlan: Array.isArray(inquirySource?.meal_plan) ? inquirySource.meal_plan.join(", ") : (inquirySource?.meal_plan || "BB"),
            roomCategory: Array.isArray(inquirySource?.room_category) ? inquirySource.room_category.join(", ") : (inquirySource?.room_category || "Standard"),
            title: content.title || "Untitled Itinerary",
            createdAt: itinerary.created_at,
            status: itinerary.status,
            costingSheet: costingSheet || null,
            tour: tour ? { id: tour.id } : null,
            vouchersCount: voucherCountMap.get(itinerary.id) || 0,
            invoicesCount: invoiceCountMap.get(itinerary.id) || 0,
            itineraryDays: content.days || [],
            totalDistance: content.total_distance_km,
            hotelType: Array.isArray(inquirySource?.hotel_type) ? inquirySource.hotel_type.join(", ") : (inquirySource?.hotel_type || "Standard"),
            hotels: hotels,
            roomsSgl: inquirySource?.rooms_sgl || 0,
            roomsDbl: inquirySource?.rooms_dbl || 0,
            roomsTpl: inquirySource?.rooms_tpl || 0,
            roomsQtpl: inquirySource?.rooms_qtpl || 0,
            paymentVouchersCount: tour ? (paymentVoucherCountMap.get(tour.id) || 0) : 0,
            arrivalFlightNo: inquirySource?.arrival_flight_no,
            arrivalTime: inquirySource?.arrival_time,
            departureFlightNo: inquirySource?.departure_flight_no,
            departureTime: inquirySource?.departure_time,
            isTourAgent: inquirySource?.is_tour_agent,
            isDeclined: itinerary.status === 'declined',
            declineReason: (itinerary as any).decline_reason || null,
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
