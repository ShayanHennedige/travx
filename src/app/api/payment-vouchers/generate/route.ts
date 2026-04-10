import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST - Generate payment vouchers for a tour from confirmed hotel vouchers
export async function POST(request: Request) {
    const supabase = await createClient();

    try {
        const body = await request.json();
        const { tour_id } = body;

        if (!tour_id) {
            return NextResponse.json(
                { error: "tour_id is required" },
                { status: 400 }
            );
        }

        // Get tour details (flat query — no FK constraints defined in schema)
        const { data: tour, error: tourError } = await supabase
            .from("tours")
            .select("id, itinerary_id")
            .eq("id", tour_id)
            .single();

        if (tourError || !tour) {
            console.error("Tour lookup error:", tourError);
            return NextResponse.json(
                { error: "Tour not found" },
                { status: 404 }
            );
        }

        // Check if tour has an itinerary_id
        if (!tour.itinerary_id) {
            return NextResponse.json(
                { error: "Tour does not have an associated itinerary. Please link an itinerary first." },
                { status: 400 }
            );
        }

        console.log("Payment voucher generation - Tour ID:", tour_id, "Itinerary ID:", tour.itinerary_id);

        // Fetch itinerary separately
        const { data: itinerary } = await supabase
            .from("itineraries")
            .select("id, inquiry_id, group_inquiry_id")
            .eq("id", tour.itinerary_id)
            .single();

        // Fetch inquiry number separately
        let tourReference = `TOUR-${tour.id.slice(0, 8)}`;
        if (itinerary?.inquiry_id) {
            const { data: inq } = await supabase
                .from("inquiries")
                .select("inquiry_number")
                .eq("id", itinerary.inquiry_id)
                .single();
            if (inq?.inquiry_number) tourReference = inq.inquiry_number;
        } else if (itinerary?.group_inquiry_id) {
            const { data: grpInq } = await supabase
                .from("group_inquiries")
                .select("inquiry_number")
                .eq("id", itinerary.group_inquiry_id)
                .single();
            if (grpInq?.inquiry_number) tourReference = grpInq.inquiry_number;
        }

        // Get costing sheet for rates
        const { data: costingSheet } = await supabase
            .from("tour_costing_sheets")
            .select("*")
            .eq("itinerary_id", tour.itinerary_id)
            .single();

        // Get all hotel vouchers for this tour's itinerary
        const { data: hotelVouchers, error: vouchersError } = await supabase
            .from("hotel_vouchers")
            .select("*")
            .eq("itinerary_id", tour.itinerary_id);

        console.log("Hotel vouchers query - Itinerary ID:", tour.itinerary_id, "Found:", hotelVouchers?.length || 0);

        if (vouchersError) {
            console.error("Voucher query error:", vouchersError);
            return NextResponse.json(
                { error: vouchersError.message },
                { status: 500 }
            );
        }

        if (!hotelVouchers || hotelVouchers.length === 0) {
            // Try to find if there are any vouchers linked by inquiry instead
            const inquiryId = itinerary?.inquiry_id;
            const groupInquiryId = itinerary?.group_inquiry_id;
            const orFilter = [
                inquiryId ? `inquiry_id.eq.${inquiryId}` : null,
                groupInquiryId ? `group_inquiry_id.eq.${groupInquiryId}` : null,
            ].filter(Boolean).join(",");

            let altVouchers = null;
            if (orFilter) {
                const { data } = await supabase
                    .from("hotel_vouchers")
                    .select("id, itinerary_id")
                    .or(orFilter)
                    .limit(5);
                altVouchers = data;
            }

            console.log("Alternative voucher check:", altVouchers);

            return NextResponse.json(
                { error: `No hotel vouchers found for itinerary_id: ${tour.itinerary_id}. Generate hotel vouchers first from the Operations workflow.` },
                { status: 400 }
            );
        }

        // Check for existing payment vouchers for this tour
        const { data: existingPaymentVouchers } = await supabase
            .from("payment_vouchers")
            .select("id, payee_name")
            .eq("tour_id", tour_id);

        const existingPayees = new Set(
            existingPaymentVouchers?.map(pv => pv.payee_name?.toLowerCase()) || []
        );

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        // Parse costing data to extract accommodation rates
        const costingData = costingSheet?.costing_data as any;
        const accommodationRows = costingData?.accommodationRows || [];

        // Sort hotel vouchers by check-in date
        const sortedHotelVouchers = [...hotelVouchers].sort((a, b) => {
            const dateA = a.check_in_date ? new Date(a.check_in_date).getTime() : 0;
            const dateB = b.check_in_date ? new Date(b.check_in_date).getTime() : 0;
            return dateA - dateB;
        });

        // Merge consecutive stays at the same hotel
        interface MergedHotel {
            hotelName: string;
            checkIn: string | null;
            checkOut: string | null;
            totalNights: number;
            vouchers: typeof hotelVouchers;
        }

        const mergedHotels: MergedHotel[] = [];

        for (const voucher of sortedHotelVouchers) {
            const lastMerged = mergedHotels[mergedHotels.length - 1];

            // Check if this is a consecutive stay at the same hotel
            if (lastMerged &&
                lastMerged.hotelName?.toLowerCase() === voucher.hotel_name?.toLowerCase() &&
                lastMerged.checkOut === voucher.check_in_date) {
                // Merge with existing
                lastMerged.checkOut = voucher.check_out_date;
                lastMerged.totalNights += voucher.no_of_nights || 1;
                lastMerged.vouchers.push(voucher);
            } else {
                // Create new merged hotel entry
                mergedHotels.push({
                    hotelName: voucher.hotel_name,
                    checkIn: voucher.check_in_date,
                    checkOut: voucher.check_out_date,
                    totalNights: voucher.no_of_nights || 1,
                    vouchers: [voucher]
                });
            }
        }

        // Create payment vouchers for each merged hotel entry
        const createdVouchers = [];
        const skippedHotels = [];

        for (const mergedHotel of mergedHotels) {
            const hotelName = mergedHotel.hotelName;

            // Skip if payment voucher already exists for this hotel
            if (existingPayees.has(hotelName?.toLowerCase())) {
                skippedHotels.push(hotelName);
                continue;
            }

            // Find accommodation rate from costing sheet
            let ratePerNight = 0;
            const matchingAccRow = accommodationRows.find(
                (row: any) => row.hotel?.toLowerCase() === hotelName?.toLowerCase()
            );
            if (matchingAccRow) {
                // Calculate average rate per night
                const totalRate =
                    (matchingAccRow.sglRate || 0) +
                    (matchingAccRow.dblRate || 0) +
                    (matchingAccRow.tplRate || 0) +
                    (matchingAccRow.qtplRate || 0);
                const numRates = [
                    matchingAccRow.sglRate,
                    matchingAccRow.dblRate,
                    matchingAccRow.tplRate,
                    matchingAccRow.qtplRate,
                ].filter(Boolean).length;
                ratePerNight = numRates > 0 ? totalRate / numRates : 0;
            }

            const nightsCount = mergedHotel.totalNights;
            const totalUsd = ratePerNight * nightsCount;

            // Format description with date range
            let description = `${nightsCount} night${nightsCount > 1 ? 's' : ''} accommodation`;
            if (mergedHotel.checkIn && mergedHotel.checkOut) {
                description += ` (${mergedHotel.checkIn} to ${mergedHotel.checkOut})`;
            }

            // Generate voucher number to avoid broken SQL trigger
            const year = new Date().getFullYear();
            const timestamp = Date.now().toString().slice(-6);
            const hotelIndex = mergedHotels.indexOf(mergedHotel) + 1;
            const voucherNo = `PV-${year}-${timestamp}-${hotelIndex.toString().padStart(2, '0')}`;

            const { data: newVoucher, error: createError } = await supabase
                .from("payment_vouchers")
                .insert({
                    voucher_no: voucherNo,
                    tour_id,
                    costing_sheet_id: costingSheet?.id,
                    tour_reference: tourReference,
                    payee_type: "Hotel",
                    payee_name: hotelName,
                    description: description,
                    nights_count: nightsCount,
                    rate_usd: ratePerNight,
                    total_usd: totalUsd,
                    exchange_rate: 300, // Default exchange rate
                    total_lkr: totalUsd * 300,
                    status: "draft",
                    created_by: user?.id,
                    voucher_date: mergedHotel.checkIn || new Date().toISOString().split('T')[0],
                })
                .select()
                .single();

            if (createError) {
                console.error(`Error creating payment voucher for ${hotelName}:`, createError);
            } else if (newVoucher) {
                createdVouchers.push(newVoucher);
            }
        }

        return NextResponse.json({
            success: true,
            message: createdVouchers.length > 0
                ? `Successfully created ${createdVouchers.length} payment voucher(s) for ${createdVouchers.length} hotel(s)`
                : "No new payment vouchers created",
            created: createdVouchers,
            skipped: skippedHotels.length > 0
                ? `Skipped ${skippedHotels.length} hotel(s) - vouchers already exist: ${skippedHotels.join(", ")}`
                : null,
        });

    } catch (err: any) {
        console.error("Server error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
