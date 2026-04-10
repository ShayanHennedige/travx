
import { createClient } from "@/lib/supabase/server";

/**
 * Ensures that a tour record exists for a given itinerary/inquiry.
 * If not, it creates one based on the inquiry data.
 * Also updates the inquiry status to 'confirmed'.
 */
export async function ensureTourExists(params: {
    inquiry_id?: string | null;
    group_inquiry_id?: string | null;
    itinerary_id: string;
}) {
    const supabase = await createClient();
    const { inquiry_id, group_inquiry_id, itinerary_id } = params;

    // Check if tour already exists
    const { data: existingTour } = await supabase
        .from("tours")
        .select("id")
        .eq("itinerary_id", itinerary_id)
        .maybeSingle();

    if (existingTour) {
        // Even if tour exists, update inquiry status to confirmed if not already
        if (inquiry_id) {
            await supabase.from("inquiries").update({ status: "confirmed" }).eq("id", inquiry_id);
        } else if (group_inquiry_id) {
            await supabase.from("group_inquiries").update({ status: "confirmed" }).eq("id", group_inquiry_id);
        }
        return existingTour;
    }

    // Fetch inquiry data to populate tour
    let tourData: any = {
        itinerary_id,
        inquiry_id: inquiry_id || null,
        group_inquiry_id: group_inquiry_id || null,
        status: "upcoming",
    };

    if (inquiry_id) {
        const { data: inquiry } = await supabase
            .from("inquiries")
            .select("first_name, last_name, arriving_date, departure_date, no_of_pax, no_of_children")
            .eq("id", inquiry_id)
            .single();

        if (inquiry) {
            tourData.client_name = `${inquiry.first_name} ${inquiry.last_name}`;
            tourData.start_date = inquiry.arriving_date;
            tourData.end_date = inquiry.departure_date;
            tourData.pax_adults = inquiry.no_of_pax || 0;
            tourData.pax_children = inquiry.no_of_children || 0;
        }

        // Update inquiry status to confirmed
        await supabase.from("inquiries").update({ status: "confirmed" }).eq("id", inquiry_id);
    } else if (group_inquiry_id) {
        const { data: groupInquiry } = await supabase
            .from("group_inquiries")
            .select("head_first_name, head_last_name, arriving_date, departure_date, no_of_adults, no_of_children")
            .eq("id", group_inquiry_id)
            .single();

        if (groupInquiry) {
            tourData.client_name = `${groupInquiry.head_first_name} ${groupInquiry.head_last_name}`;
            tourData.start_date = groupInquiry.arriving_date;
            tourData.end_date = groupInquiry.departure_date;
            tourData.pax_adults = groupInquiry.no_of_adults || 0;
            tourData.pax_children = groupInquiry.no_of_children || 0;
        }

        // Update group_inquiry status to confirmed
        await supabase.from("group_inquiries").update({ status: "confirmed" }).eq("id", group_inquiry_id);
    }

    // Create tour record
    const { data: tour, error } = await supabase
        .from("tours")
        .insert(tourData)
        .select()
        .maybeSingle();

    if (error) {
        console.error("Error auto-creating tour:", error);
    }

    return tour;
}
