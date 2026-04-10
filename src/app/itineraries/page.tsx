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

  // Fetch all itineraries (core columns only — no embedded joins, FK not defined in schema)
  const { data: rawItineraries, error: itinError } = await supabase
    .from("itineraries")
    .select("id, content, created_at, updated_at, inquiry_id, group_inquiry_id, status")
    .order("created_at", { ascending: false });

  if (itinError) {
    console.error("Error fetching itineraries:", itinError.message, itinError.code);
  }

  // Collect IDs for related lookups
  const inquiryIds = (rawItineraries || []).map(i => i.inquiry_id).filter(Boolean) as string[];
  const groupInquiryIds = (rawItineraries || []).map(i => i.group_inquiry_id).filter(Boolean) as string[];

  // Fetch individual inquiries
  const { data: inquiriesData, error: indError } = inquiryIds.length > 0
    ? await supabase
        .from("inquiries")
        .select("id, inquiry_number, first_name, last_name, client_email, arriving_date, departure_date, no_of_nights, no_of_pax, no_of_children")
        .in("id", inquiryIds)
    : { data: [] as any[], error: null };

  if (indError) {
    console.error("Error fetching individual inquiries:", indError.message, indError.code);
  }

  // Fetch group inquiries
  const { data: groupInquiriesData, error: grpError } = groupInquiryIds.length > 0
    ? await supabase
        .from("group_inquiries")
        .select("id, inquiry_number, head_first_name, head_last_name, client_email, arriving_date, departure_date, no_of_nights, no_of_adults, no_of_children")
        .in("id", groupInquiryIds)
    : { data: [] as any[], error: null };

  if (grpError) {
    console.error("Error fetching group inquiries:", grpError.message, grpError.code);
  }

  // Build lookup maps
  const inquiryMap = new Map((inquiriesData || []).map((i: any) => [i.id, i]));
  const groupInquiryMap = new Map((groupInquiriesData || []).map((i: any) => [i.id, i]));

  // Split into individual vs group itineraries
  const individualItineraries = (rawItineraries || []).filter(i => i.inquiry_id);
  const groupItineraries = (rawItineraries || []).filter(i => i.group_inquiry_id);

  // Transform the data for the client component
  const transformedIndividual = individualItineraries.map((itinerary) => {
    const inquiryData = itinerary.inquiry_id ? (inquiryMap.get(itinerary.inquiry_id) as {
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
    } | undefined) : null;

    return {
      id: itinerary.id as string,
      content: itinerary.content as ItineraryContent,
      created_at: itinerary.created_at as string,
      updated_at: itinerary.updated_at as string,
      inquiry_id: itinerary.inquiry_id as string | null,
      group_inquiry_id: itinerary.group_inquiry_id as string | null,
      status: (itinerary.status as "new" | "in_progress" | "completed" | null) || null,
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

  const transformedGroup = groupItineraries.map((itinerary) => {
    const inquiryData = itinerary.group_inquiry_id ? (groupInquiryMap.get(itinerary.group_inquiry_id) as {
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
    } | undefined) : null;

    return {
      id: itinerary.id as string,
      content: itinerary.content as ItineraryContent,
      created_at: itinerary.created_at as string,
      updated_at: itinerary.updated_at as string,
      inquiry_id: itinerary.inquiry_id as string | null,
      group_inquiry_id: itinerary.group_inquiry_id as string | null,
      status: (itinerary.status as "new" | "in_progress" | "completed" | null) || null,
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
        title="Travel Itineraries"
        subtitle={`Monitoring ${allItineraries.length} handcrafted travel plans`}
      />
      <ItinerariesList itineraries={allItineraries} />
    </AppLayout>
  );
}
