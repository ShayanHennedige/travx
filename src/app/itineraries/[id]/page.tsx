import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { Button } from "@/components/ui";
import Link from "next/link";
import { format, addDays } from "date-fns";
import { ItineraryEditor } from "./ItineraryEditor";
import { DownloadPDFButton } from "./DownloadPDFButton";
import { GenerateVouchersButton } from "./GenerateVouchersButton";
import { FinalizeTourButton } from "./FinalizeTourButton";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ItineraryContent {
  title: string;
  summary: string;
  days: {
    day: number;
    date: string;
    title: string;
    overnight_location: string;
    hotel_suggestion: string;
    activities: {
      time: string;
      activity: string;
      location: string;
      duration: string;
      driving_time?: string;
    }[];
    meals: {
      breakfast: string;
      lunch: string;
      dinner: string;
    };
    notes?: string;
  }[];
  practical_notes: string[];
  total_driving_hours: string;
}

export default async function ItineraryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch itinerary with individual inquiry
  const { data: itinerary, error } = await supabase
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
        country,
        arriving_date,
        departure_date,
        no_of_nights,
        no_of_pax,
        no_of_children,
        hotel_type,
        activities
      ),
      group_inquiries (
        id,
        inquiry_number,
        head_first_name,
        head_last_name,
        client_email,
        country,
        arriving_date,
        departure_date,
        no_of_nights,
        no_of_adults,
        no_of_children,
        hotel_type,
        activities
      )
    `)
    .eq("id", id)
    .single();

  if (error || !itinerary) {
    notFound();
  }

  // Count existing vouchers
  const { count: vouchersCount } = await supabase
    .from("hotel_vouchers")
    .select("id", { count: "exact" })
    .eq("itinerary_id", id);

  // Check if tour already exists for this itinerary
  const { data: existingTour } = await supabase
    .from("tours")
    .select("id")
    .eq("itinerary_id", id)
    .single();

  const content = itinerary.content as ItineraryContent;
  
  // Handle both individual and group inquiries
  const individualInquiry = itinerary.inquiries as unknown as {
    id: string;
    inquiry_number: string;
    first_name: string;
    last_name: string;
    client_email: string;
    country: string;
    arriving_date: string;
    departure_date: string;
    no_of_nights: number;
    no_of_pax: number;
    no_of_children: number;
    hotel_type: string;
    activities: string[];
  } | null;

  const groupInquiry = itinerary.group_inquiries as unknown as {
    id: string;
    inquiry_number: string;
    head_first_name: string;
    head_last_name: string;
    client_email: string;
    country: string;
    arriving_date: string;
    departure_date: string;
    no_of_nights: number;
    no_of_adults: number;
    no_of_children: number;
    hotel_type: string;
    activities: string[];
  } | null;

  const isGroup = !!groupInquiry;
  const inquiry = individualInquiry || groupInquiry;
  const guestName = individualInquiry 
    ? `${individualInquiry.first_name} ${individualInquiry.last_name}`
    : groupInquiry 
      ? `${groupInquiry.head_first_name} ${groupInquiry.head_last_name}`
      : "Guest";
  const paxAdults = individualInquiry?.no_of_pax || groupInquiry?.no_of_adults || 1;
  const paxChildren = inquiry?.no_of_children || 0;
  const inquiryLink = isGroup 
    ? `/group-inquiries/${groupInquiry?.id}`
    : `/inquiries/${individualInquiry?.id}`;

  // Extract hotels from itinerary with dates
  // Exclude last day (departure day) as there's no overnight stay
  const extractHotelsFromItinerary = () => {
    const hotelsMap: { [key: string]: { hotel_name: string; location: string; nights: number; firstDay: number } } = {};
    
    // Exclude the last day (departure day) - no overnight stay
    const daysWithOvernight = content.days.slice(0, -1);
    
    daysWithOvernight.forEach((day) => {
      if (day.hotel_suggestion && day.overnight_location) {
        const key = day.hotel_suggestion;
        if (!hotelsMap[key]) {
          hotelsMap[key] = {
            hotel_name: day.hotel_suggestion,
            location: day.overnight_location,
            nights: 1,
            firstDay: day.day,
          };
        } else {
          hotelsMap[key].nights++;
        }
      }
    });

    const arrivalDate = inquiry?.arriving_date ? new Date(inquiry.arriving_date) : new Date();
    
    // Convert to array with check-in/check-out dates
    return Object.values(hotelsMap).map((hotel) => {
      const checkInDate = addDays(arrivalDate, hotel.firstDay - 1);
      const checkOutDate = addDays(checkInDate, hotel.nights);
      
      return {
        hotel_name: hotel.hotel_name,
        location: hotel.location,
        check_in_date: format(checkInDate, "yyyy-MM-dd"),
        check_out_date: format(checkOutDate, "yyyy-MM-dd"),
        no_of_nights: hotel.nights,
      };
    });
  };

  const hotels = extractHotelsFromItinerary();

  return (
    <AppLayout>
      <Header
        title={content.title}
        subtitle={`Generated on ${format(new Date(itinerary.created_at), "MMMM d, yyyy 'at' h:mm a")}`}
        action={
          <div className="flex items-center gap-3">
            {inquiry && (
              <FinalizeTourButton
                itineraryId={itinerary.id}
                inquiryId={itinerary.inquiry_id}
                groupInquiryId={itinerary.group_inquiry_id}
                clientName={guestName}
                startDate={inquiry.arriving_date}
                endDate={inquiry.departure_date}
                paxAdults={paxAdults}
                paxChildren={paxChildren}
                existingTourId={existingTour?.id}
              />
            )}
            {hotels.length > 0 && (
              <GenerateVouchersButton
                itineraryId={itinerary.id}
                inquiryId={itinerary.inquiry_id}
                groupInquiryId={itinerary.group_inquiry_id}
                guestName={guestName}
                nationality={inquiry?.country}
                paxAdults={paxAdults}
                paxChildren={paxChildren}
                hotels={hotels}
                existingVouchersCount={vouchersCount || 0}
              />
            )}
            <DownloadPDFButton 
              itineraryId={itinerary.id}
              inquiryNumber={inquiry?.inquiry_number}
            />
            <Link href="/itineraries">
              <Button variant="secondary">Back to List</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <ItineraryEditor
            itineraryId={itinerary.id}
            initialContent={content}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Linked Inquiry Info */}
          {inquiry && (
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-surface-900 mb-4 flex items-center gap-2">
                Linked Inquiry
                {isGroup && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">Group</span>
                )}
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wider">Client</p>
                  <p className="text-sm font-medium text-surface-900">{guestName}</p>
                  <p className="text-xs text-surface-500">{inquiry.client_email}</p>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Inquiry #</span>
                  <Link href={inquiryLink} className="text-primary-600 hover:text-primary-700 font-medium">
                    {inquiry.inquiry_number}
                  </Link>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Travel Dates</span>
                  <span className="text-surface-900">
                    {format(new Date(inquiry.arriving_date), "MMM d")} - {format(new Date(inquiry.departure_date), "MMM d")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Duration</span>
                  <span className="text-surface-900">{inquiry.no_of_nights} nights</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Travelers</span>
                  <span className="text-surface-900">
                    {paxAdults} adults{paxChildren > 0 && `, ${paxChildren} children`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Hotel Type</span>
                  <span className="text-surface-900">{inquiry.hotel_type || "Not specified"}</span>
                </div>
              </div>

              {/* Activities */}
              {inquiry.activities && inquiry.activities.length > 0 && (
                <div className="mt-4 pt-4 border-t border-surface-200">
                  <p className="text-xs text-surface-500 uppercase tracking-wider mb-2">Requested Activities</p>
                  <div className="flex flex-wrap gap-1">
                    {inquiry.activities.map((activity: string) => (
                      <span
                        key={activity}
                        className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs"
                      >
                        {activity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hotels in Itinerary */}
          {hotels.length > 0 && (
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-surface-900 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Hotels ({hotels.length})
              </h3>
              <div className="space-y-3">
                {hotels.map((hotel, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-surface-50 rounded-lg">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-900 truncate">{hotel.hotel_name}</p>
                      <p className="text-xs text-surface-500">{hotel.no_of_nights} nights • {hotel.location}</p>
                    </div>
                  </div>
                ))}
              </div>
              {(vouchersCount || 0) > 0 && (
                <div className="mt-4 pt-4 border-t border-surface-200">
                  <Link href={`/vouchers?itinerary_id=${itinerary.id}`} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                    View {vouchersCount} existing voucher{vouchersCount !== 1 ? "s" : ""} →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Quick Stats */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-surface-900 mb-4">
              Itinerary Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Total Days</span>
                <span className="text-surface-900 font-medium">{content.days.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Total Driving</span>
                <span className="text-surface-900 font-medium">{content.total_driving_hours}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Last Updated</span>
                <span className="text-surface-900">
                  {format(new Date(itinerary.updated_at), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>

          {/* Practical Tips */}
          {content.practical_notes && content.practical_notes.length > 0 && (
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-surface-900 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Practical Tips
              </h3>
              <ul className="space-y-2">
                {content.practical_notes.map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-surface-700">
                    <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
