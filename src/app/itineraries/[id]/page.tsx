import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { Button } from "@/components/ui";
import Link from "next/link";
import { format, addDays } from "date-fns";
import { ItineraryEditor } from "./ItineraryEditor";
import { DownloadPDFButton } from "./DownloadPDFButton";

interface PageProps {
  params: Promise<{ id: string }>;
}

import { ItineraryContent } from "@/lib/itinerary-utils";

export default async function ItineraryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch itinerary first
  const { data: itinerary, error: itineraryError } = await supabase
    .from("itineraries")
    .select(`
      id,
      content,
      created_at,
      updated_at,
      inquiry_id,
      group_inquiry_id,
      status,
      proposal_id
    `)
    .eq("id", id)
    .single();

  if (itineraryError || !itinerary) {
    console.error("Itinerary not found:", itineraryError);
    notFound();
  }

  // Fetch individual inquiry if exists
  const { data: individualInquiry } = itinerary.inquiry_id
    ? await supabase
      .from("inquiries")
      .select(`
          id,
          inquiry_number,
          first_name,
          last_name,
          passport_no,
          client_email,
          country,
          arriving_date,
          departure_date,
          no_of_nights,
          no_of_pax,
          no_of_children,
          hotel_type,
          agent_name,
          agent_company,
          meal_plan,
          room_category,
          rooms_dbl,
          rooms_sgl,
          rooms_tpl,
          rooms_qtpl,
          activities,
          arrival_flight_no,
          arrival_time,
          departure_flight_no,
          departure_time
        `)
      .eq("id", itinerary.inquiry_id)
      .single()
    : { data: null };

  // Fetch group inquiry if exists
  const { data: groupInquiry } = itinerary.group_inquiry_id
    ? await supabase
      .from("group_inquiries")
      .select(`
          id,
          inquiry_number,
          head_first_name,
          head_last_name,
          head_passport_no,
          client_email,
          country,
          agent_name,
          agent_email,
          agent_company,
          arriving_date,
          departure_date,
          no_of_nights,
          no_of_adults,
          no_of_children,
          hotel_type,
          room_category,
          meal_plan,
          rooms_dbl,
          rooms_sgl,
          rooms_tpl,
          rooms_qtpl,
          activities,
          arrival_flight_no,
          arrival_time,
          departure_flight_no,
          departure_time
        `)
      .eq("id", itinerary.group_inquiry_id)
      .single()
    : { data: null };

  // Count existing vouchers
  const { count: vouchersCount } = await supabase
    .from("hotel_vouchers")
    .select("id", { count: "exact" })
    .eq("itinerary_id", id);

  // Fetch invoices count for this itinerary
  const { count: invoicesCount } = await supabase
    .from("customer_invoices")
    .select("id", { count: "exact" })
    .eq("itinerary_id", id);

  // Check if tour already exists for this itinerary
  const { data: existingTour } = await supabase
    .from("tours")
    .select("id")
    .eq("itinerary_id", id)
    .single();

  // Fetch costing sheet
  const { data: costingSheet } = await supabase
    .from("tour_costing_sheets")
    .select("*")
    .eq("itinerary_id", id)
    .single();

  const content = itinerary.content as ItineraryContent;

  const isGroup = !!groupInquiry;
  const inquiry = groupInquiry || individualInquiry;

  // Always use traveler name for guest/main contact; keep agent details separate.
  const guestName = individualInquiry
    ? `${individualInquiry.first_name} ${individualInquiry.last_name}`.trim()
    : groupInquiry?.head_first_name
      ? `${groupInquiry.head_first_name} ${groupInquiry.head_last_name}`.trim()
      : "Guest";

  const contactEmail = groupInquiry?.agent_email || inquiry?.client_email;
  const paxAdults = (isGroup ? groupInquiry?.no_of_adults : individualInquiry?.no_of_pax) || 1;
  const paxChildren = (isGroup ? groupInquiry?.no_of_children : individualInquiry?.no_of_children) || 0;

  // Safe date formatting helper
  const safeFormat = (dateStr: string | undefined | null, formatStr: string, fallback: string = "N/A") => {
    if (!dateStr) return fallback;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return fallback;
      return format(d, formatStr);
    } catch (e) {
      return fallback;
    }
  };

  const inquiryLink = isGroup
    ? `/group-inquiries/${groupInquiry?.id}`
    : individualInquiry
      ? `/inquiries/${individualInquiry?.id}`
      : "#";

  // Type-safe property access helpers
  const getHotelType = () => groupInquiry?.hotel_type || individualInquiry?.hotel_type || "Standard";
  const getRoomCategory = () => groupInquiry?.room_category || individualInquiry?.room_category || "Standard";
  const getMealPlan = () => groupInquiry?.meal_plan || individualInquiry?.meal_plan || "Not Specified";
  const getCountry = () => groupInquiry?.country || individualInquiry?.country || "Not specified";
  const getActivities = () => groupInquiry?.activities || individualInquiry?.activities || [];

  // Extract hotels from itinerary with dates.
  // The departure day (last day) is always excluded — no overnight stay occurs there.
  const extractHotelsFromItinerary = () => {
    if (!content?.days) return [];

    const hotelsMap: { [key: string]: { hotel_name: string; location: string; nights: number; firstDay: number } } = {};

    const daysWithOvernight = content.days.filter((_day, idx) =>
      idx < content.days.length - 1
    );

    daysWithOvernight.forEach((day) => {
      const hotelName = day.hotel_suggestion?.trim();
      if (hotelName) {
        const key = hotelName;
        if (!hotelsMap[key]) {
          hotelsMap[key] = {
            hotel_name: hotelName,
            location: day.overnight_location?.trim() || "Not specified",
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
        check_in_date: isNaN(checkInDate.getTime()) ? "" : format(checkInDate, "yyyy-MM-dd"),
        check_out_date: isNaN(checkOutDate.getTime()) ? "" : format(checkOutDate, "yyyy-MM-dd"),
        no_of_nights: hotel.nights,
      };
    });
  };

  const hotels = extractHotelsFromItinerary();

  return (
    <AppLayout>
      <Header
        title={content?.title || "Itinerary Details"}
        subtitle={`Generated on ${safeFormat(itinerary.created_at, "MMMM d, yyyy 'at' h:mm a")}`}
        action={
          <div className="flex items-center gap-3">
            {/* Primary Actions - Itinerary */}
            <DownloadPDFButton
              itineraryId={itinerary.id}
              inquiryNumber={inquiry?.inquiry_number}
              size="sm"
              costingSheetStatus={costingSheet?.status || null}
            />

            {/* Web View Button */}
            {itinerary.proposal_id && (
              <a
                href={`/quote/${itinerary.proposal_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="secondary" size="sm" className="hidden sm:flex rounded-xl gap-2 font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 border-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Client Web Portal
                </Button>
              </a>
            )}

            {/* Link to Back */}
            <Link href="/itineraries">
              <Button variant="secondary" size="sm" className="rounded-xl">Back to List</Button>
            </Link>
          </div>
        }
      />


      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {content ? (
            <ItineraryEditor
              itineraryId={itinerary.id}
              initialContent={content}
              itineraryStatus={itinerary.status}
              flightDetails={{
                arrival_flight_no: inquiry?.arrival_flight_no,
                arrival_time: inquiry?.arrival_time,
                departure_flight_no: inquiry?.departure_flight_no,
                departure_time: inquiry?.departure_time,
              }}
            />
          ) : (
            <div className="card p-12 text-center">
              <p className="text-surface-500">No itinerary content found.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Workflow Actions */}


          {/* Inquiry Summary */}
          {inquiry && (
            <div className="card p-6 border border-surface-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Inquiry Summary
                </h3>
                {isGroup && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold uppercase tracking-wider">Group</span>
                )}
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-surface-50 rounded-lg border border-surface-100">
                  <p className="text-[10px] text-surface-400 uppercase font-bold tracking-widest mb-1">Main Contact</p>
                  <p className="text-sm font-bold text-surface-900 mb-0.5">{guestName}</p>

                  {(individualInquiry?.passport_no || groupInquiry?.head_passport_no) && (
                    <p className="text-[10px] text-surface-400 font-mono tracking-tighter mt-1">
                      Passport: {individualInquiry?.passport_no || groupInquiry?.head_passport_no}
                    </p>
                  )}
                  {groupInquiry?.agent_company && groupInquiry.agent_name && (
                    <p className="text-[10px] text-primary-600 font-medium mt-1">{groupInquiry.agent_company}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-y-3 px-1 border-t border-surface-100 pt-4">
                  <span className="text-xs text-surface-500">Inquiry #</span>
                  <Link href={inquiryLink} className="text-xs text-primary-600 hover:text-primary-700 font-bold text-right">
                    {inquiry.inquiry_number}
                  </Link>

                  <span className="text-xs text-surface-500">Travel Dates</span>
                  <span className="text-xs text-surface-900 font-medium text-right">
                    {safeFormat(inquiry.arriving_date, "MMM d")} - {safeFormat(inquiry.departure_date, "MMM d")}
                  </span>

                  <span className="text-xs text-surface-500">Duration</span>
                  <span className="text-xs text-surface-900 font-medium text-right">{inquiry.no_of_nights} nights</span>

                  <span className="text-xs text-surface-500">Travelers</span>
                  <span className="text-xs text-surface-900 font-medium text-right">
                    {paxAdults} adults{paxChildren > 0 && `, ${paxChildren} children`}
                  </span>

                  <span className="text-xs text-surface-500">Hotel Type</span>
                  <span className="text-xs text-surface-900 font-medium text-right">{getHotelType()}</span>
                </div>

                {/* Accommodation Summary - New Section */}
                {(inquiry?.meal_plan || inquiry?.room_category || (paxAdults + paxChildren) > 0) && (
                  <div className="border-t border-surface-100 pt-3 mt-1">
                    <p className="text-[10px] text-surface-400 uppercase font-bold tracking-widest mb-2">Accommodation Details</p>
                    <div className="grid grid-cols-2 gap-y-2">
                      <span className="text-xs text-surface-500">Meal Plan</span>
                      <span className="text-xs text-surface-900 font-medium text-right">{getMealPlan()}</span>

                      <span className="text-xs text-surface-500">Room Class</span>
                      <span className="text-xs text-surface-900 font-medium text-right">{getRoomCategory()}</span>

                      {((inquiry as any)?.rooms_dbl || (inquiry as any)?.rooms_sgl || (inquiry as any)?.rooms_tpl || (inquiry as any)?.rooms_qtpl) > 0 ? (
                        <>
                          <span className="text-xs text-surface-500">Rooms</span>
                          <span className="text-xs text-surface-900 font-medium text-right">
                            {[(inquiry as any)?.rooms_dbl && `${(inquiry as any).rooms_dbl} DBL`,
                            (inquiry as any)?.rooms_sgl && `${(inquiry as any).rooms_sgl} SGL`,
                            (inquiry as any)?.rooms_tpl && `${(inquiry as any).rooms_tpl} TPL`,
                            (inquiry as any)?.rooms_qtpl && `${(inquiry as any).rooms_qtpl} QUAD`
                            ].filter(Boolean).join(", ")}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-surface-500">Rooms</span>
                          <span className="text-xs text-surface-900 font-medium text-right">Not Specified</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Activities */}
              {getActivities().length > 0 && (
                <div className="mt-4 pt-4 border-t border-surface-100">
                  <p className="text-[10px] text-surface-400 uppercase font-bold tracking-widest mb-2">Interests</p>
                  <div className="flex flex-wrap gap-1">
                    {getActivities().map((activity: string) => (
                      <span
                        key={activity}
                        className="px-2 py-0.5 bg-white border border-primary-100 text-primary-700 rounded text-[10px] font-medium"
                      >
                        {activity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tour Logistics */}
          <div className="card p-6 border border-surface-200">
            <h3 className="text-sm font-bold text-surface-900 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tour Logistics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-surface-50 last:border-0">
                <span className="text-xs text-surface-500">Total Duration</span>
                <span className="text-xs text-surface-900 font-bold">{(content?.days?.length || 0)} Days</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-surface-50 last:border-0">
                <span className="text-xs text-surface-500">Est. Driving</span>
                <span className="text-xs text-surface-900 font-bold">{content.total_driving_hours}</span>
              </div>
              {content.total_distance_km && (
                <div className="flex justify-between items-center py-2 border-b border-surface-50 last:border-0">
                  <span className="text-xs text-surface-500">Est. Distance</span>
                  <span className="text-xs text-surface-900 font-bold">{content.total_distance_km}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-surface-50 last:border-0">
                <span className="text-xs text-surface-500">Last Revised</span>
                <span className="text-xs text-surface-600">
                  {safeFormat(itinerary.updated_at, "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>

          {/* Hotels in Itinerary */}
          {hotels.length > 0 && (
            <div className="card p-6 border border-surface-200">
              <h3 className="text-sm font-bold text-surface-900 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Accommodation List
              </h3>
              <div className="space-y-3">
                {hotels.map((hotel, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 hover:bg-surface-50 rounded-lg transition-colors border border-transparent hover:border-surface-100">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-bold">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-surface-900 truncate">{hotel.hotel_name}</p>
                      <p className="text-[10px] text-surface-500 font-medium">{hotel.no_of_nights} {hotel.no_of_nights === 1 ? "Night" : "Nights"} • {hotel.location}</p>
                    </div>
                  </div>
                ))}
              </div>
              {(vouchersCount || 0) > 0 && (
                <div className="mt-4 pt-4 border-t border-surface-100">
                  <Link href={`/vouchers?itinerary_id=${itinerary.id}`} className="text-xs text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1">
                    Managed Vouchers ({vouchersCount})
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Operations Link */}
          <div className="card p-4 border border-surface-200 bg-linear-to-br from-primary-50 to-surface-50">
            <Link href="/operations" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-surface-900 group-hover:text-primary-600 transition-colors">Tour Operations</p>
                <p className="text-xs text-surface-500">Costing, Invoice, Finalize & Vouchers</p>
              </div>
              <svg className="w-5 h-5 text-surface-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

