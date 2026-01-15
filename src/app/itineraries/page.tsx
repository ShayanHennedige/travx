import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { ItinerariesList } from "./ItinerariesList";

interface ItineraryContent {
  title: string;
  summary: string;
  days: { day: number }[];
  total_driving_hours: string;
}

export default async function ItinerariesPage() {
  const supabase = await createClient();

  // Fetch all itineraries with their linked inquiry info (individual)
  const { data: individualItineraries, error: indError } = await supabase
    .from("itineraries")
    .select(`
      id,
      content,
      created_at,
      updated_at,
      inquiry_id,
      group_inquiry_id,
      inquiries (
        id,
        inquiry_number,
        first_name,
        last_name,
        client_email,
        arriving_date,
        departure_date,
        no_of_nights,
        no_of_pax,
        no_of_children
      )
    `)
    .not("inquiry_id", "is", null)
    .order("created_at", { ascending: false });

  if (indError) {
    console.error("Error fetching individual itineraries:", indError);
  }

  // Fetch all itineraries with their linked group inquiry info
  const { data: groupItineraries, error: grpError } = await supabase
    .from("itineraries")
    .select(`
      id,
      content,
      created_at,
      updated_at,
      inquiry_id,
      group_inquiry_id,
      group_inquiries (
        id,
        inquiry_number,
        head_first_name,
        head_last_name,
        client_email,
        arriving_date,
        departure_date,
        no_of_nights,
        no_of_adults,
        no_of_children
      )
    `)
    .not("group_inquiry_id", "is", null)
    .order("created_at", { ascending: false });

  if (grpError) {
    console.error("Error fetching group itineraries:", grpError);
  }

  // Transform the data for the client component
  const transformedIndividual = (individualItineraries || []).map((itinerary) => {
    const inquiryData = itinerary.inquiries as unknown as {
      id: string;
      inquiry_number: string;
      first_name: string;
      last_name: string;
      client_email: string;
      arriving_date: string;
      departure_date: string;
      no_of_nights: number;
      no_of_pax: number;
      no_of_children: number;
    } | null;
    
    return {
      id: itinerary.id as string,
      content: itinerary.content as ItineraryContent,
      created_at: itinerary.created_at as string,
      updated_at: itinerary.updated_at as string,
      inquiry_id: itinerary.inquiry_id as string | null,
      group_inquiry_id: itinerary.group_inquiry_id as string | null,
      type: "individual" as const,
      inquiry: inquiryData ? {
        id: inquiryData.id,
        inquiry_number: inquiryData.inquiry_number,
        first_name: inquiryData.first_name,
        last_name: inquiryData.last_name,
        client_email: inquiryData.client_email,
        arriving_date: inquiryData.arriving_date,
        departure_date: inquiryData.departure_date,
        no_of_nights: inquiryData.no_of_nights,
        total_pax: (inquiryData.no_of_pax || 0) + (inquiryData.no_of_children || 0),
      } : null,
    };
  });

  const transformedGroup = (groupItineraries || []).map((itinerary) => {
    const inquiryData = itinerary.group_inquiries as unknown as {
      id: string;
      inquiry_number: string;
      head_first_name: string;
      head_last_name: string;
      client_email: string;
      arriving_date: string;
      departure_date: string;
      no_of_nights: number;
      no_of_adults: number;
      no_of_children: number;
    } | null;
    
    return {
      id: itinerary.id as string,
      content: itinerary.content as ItineraryContent,
      created_at: itinerary.created_at as string,
      updated_at: itinerary.updated_at as string,
      inquiry_id: itinerary.inquiry_id as string | null,
      group_inquiry_id: itinerary.group_inquiry_id as string | null,
      type: "group" as const,
      inquiry: inquiryData ? {
        id: inquiryData.id,
        inquiry_number: inquiryData.inquiry_number,
        first_name: inquiryData.head_first_name,
        last_name: inquiryData.head_last_name,
        client_email: inquiryData.client_email,
        arriving_date: inquiryData.arriving_date,
        departure_date: inquiryData.departure_date,
        no_of_nights: inquiryData.no_of_nights,
        total_pax: (inquiryData.no_of_adults || 0) + (inquiryData.no_of_children || 0),
      } : null,
    };
  });

  // Combine and sort by created_at
  const allItineraries = [...transformedIndividual, ...transformedGroup]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <AppLayout>
      <Header
        title="Itineraries"
        subtitle={`${allItineraries.length} AI-generated travel plans`}
      />
      <ItinerariesList itineraries={allItineraries} />
    </AppLayout>
  );
}
