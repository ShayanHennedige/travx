import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { StatusBadge, Button, Badge } from "@/components/ui";
import Link from "next/link";
import { format } from "date-fns";
import { InquiryStatus } from "@/types/database";
import { GroupItineraryQuickActions } from "./GroupItineraryQuickActions";
import { RoomingListManager } from "./RoomingListManager";
import { GenerateFeedbackLinkButton } from "../../inquiries/[id]/GenerateFeedbackLinkButton";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GroupInquiryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch group inquiry
  const { data: inquiry, error } = await supabase
    .from("group_inquiries")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !inquiry) {
    notFound();
  }

  // Fetch group members
  const { data: members } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_inquiry_id", id)
    .order("member_type", { ascending: true })
    .order("created_at", { ascending: true });

  const adultMembers = members?.filter(m => m.member_type === "adult") || [];
  const childMembers = members?.filter(m => m.member_type === "child") || [];

  // Fetch existing itinerary if any
  const { data: existingItinerary } = await supabase
    .from("itineraries")
    .select("id, content, created_at")
    .eq("group_inquiry_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch tour if exists
  const { data: tour } = await supabase
    .from("tours")
    .select("id")
    .eq("group_inquiry_id", id)
    .single();

  const totalPax = (inquiry.no_of_adults || 0) + (inquiry.no_of_children || 0);

  return (
    <AppLayout>
      <Header
        title={inquiry.inquiry_number}
        subtitle={`Group inquiry submitted on ${format(new Date(inquiry.created_at), "MMMM d, yyyy 'at' h:mm a")}`}
        action={
          <div className="flex items-center gap-3">
            <GenerateFeedbackLinkButton
              inquiryId=""
              groupInquiryId={inquiry.id}
              itineraryId={existingItinerary?.id}
              tourId={tour?.id}
            />
            <Link href="/inquiries">
              <Button variant="secondary">Back to List</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status */}
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <Badge variant="purple">Group Booking</Badge>
              <StatusBadge status={inquiry.status as InquiryStatus} />
            </div>
          </div>

          {/* Group Leader Information */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary-900/50 light:bg-primary-100 flex items-center justify-center border border-primary-700/50 light:border-transparent">
                <svg className="w-4 h-4 text-primary-300 light:text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-surface-100 light:text-surface-900">
                Group Leader / Contact Person
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoItem label="First Name" value={inquiry.head_first_name} />
              <InfoItem label="Last Name" value={inquiry.head_last_name} />
              <InfoItem label="Passport No" value={inquiry.head_passport_no || "Not provided"} />
              <InfoItem label="Contact Number" value={inquiry.contact_number || "Not provided"} />
              <InfoItem label="Email" value={inquiry.client_email} />
              <InfoItem label="Country" value={inquiry.country || "Not specified"} />
            </div>
          </div>

          {/* Group Members */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-900/50 light:bg-blue-100 flex items-center justify-center border border-primary-700/50 light:border-transparent">
                  <svg className="w-4 h-4 text-primary-300 light:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-surface-100 light:text-surface-900">
                  Group Members
                </h2>
              </div>
              <Badge variant="primary">{totalPax} Total Pax</Badge>
            </div>

            {/* Adults */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-surface-300 light:text-surface-700 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary-900/50 light:bg-blue-100 text-primary-300 light:text-blue-700 text-xs flex items-center justify-center font-bold border border-primary-700/50 light:border-transparent">
                  {adultMembers.length}
                </span>
                Adults
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {adultMembers.map((member, index) => (
                  <div key={member.id} className="px-3 py-2 bg-surface-800 light:bg-surface-50 rounded-lg border border-surface-700 light:border-transparent">
                    <span className="text-xs text-surface-400 light:text-surface-500 mr-2">{index + 1}.</span>
                    <span className="text-sm text-surface-100 light:text-surface-900">{member.full_name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Children */}
            {childMembers.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-surface-300 light:text-surface-700 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-900/50 light:bg-amber-100 text-amber-300 light:text-amber-700 text-xs flex items-center justify-center font-bold border border-amber-700/50 light:border-transparent">
                    {childMembers.length}
                  </span>
                  Children
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {childMembers.map((member, index) => (
                    <div key={member.id} className="px-3 py-2 bg-amber-900/30 light:bg-amber-50 rounded-lg border border-amber-700/50 light:border-transparent">
                      <span className="text-xs text-amber-400 light:text-amber-600 mr-2">{index + 1}.</span>
                      <span className="text-sm text-surface-100 light:text-surface-900">{member.full_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Travel Details */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-surface-100 light:text-surface-900 mb-4">
              Travel Details
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoItem
                label="Arriving Date"
                value={inquiry.arriving_date 
                  ? format(new Date(inquiry.arriving_date), "MMM d, yyyy") 
                  : "Not specified"
                }
              />
              <InfoItem
                label="Departure Date"
                value={inquiry.departure_date 
                  ? format(new Date(inquiry.departure_date), "MMM d, yyyy") 
                  : "Not specified"
                }
              />
              <InfoItem
                label="No. of Nights"
                value={inquiry.no_of_nights?.toString() || "N/A"}
              />
              <InfoItem
                label="Total Travelers"
                value={`${totalPax} pax`}
              />
            </div>
          </div>

          {/* Accommodation */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-surface-100 light:text-surface-900 mb-4">
              Accommodation Preferences
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <InfoItem label="Hotel Type" value={inquiry.hotel_type || "Not specified"} />
              <InfoItem label="Room Category" value={inquiry.room_category || "Not specified"} />
            </div>
            
            {/* Room Quantities */}
            <div className="border-t border-surface-600 light:border-surface-200 pt-4">
              <h3 className="text-sm font-medium text-surface-300 light:text-surface-700 mb-3">Room Selection</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-surface-800 light:bg-surface-50 rounded-lg p-3 text-center border border-surface-700 light:border-transparent">
                  <div className="text-xl font-bold text-surface-100 light:text-surface-900">{inquiry.rooms_dbl || 0}</div>
                  <div className="text-xs text-surface-400 light:text-surface-500">Double (DBL)</div>
                </div>
                <div className="bg-surface-800 light:bg-surface-50 rounded-lg p-3 text-center border border-surface-700 light:border-transparent">
                  <div className="text-xl font-bold text-surface-100 light:text-surface-900">{inquiry.rooms_sgl || 0}</div>
                  <div className="text-xs text-surface-400 light:text-surface-500">Single (SGL)</div>
                </div>
                <div className="bg-surface-800 light:bg-surface-50 rounded-lg p-3 text-center border border-surface-700 light:border-transparent">
                  <div className="text-xl font-bold text-surface-100 light:text-surface-900">{inquiry.rooms_tpl || 0}</div>
                  <div className="text-xs text-surface-400 light:text-surface-500">Triple (TPL)</div>
                </div>
                <div className="bg-surface-800 light:bg-surface-50 rounded-lg p-3 text-center border border-surface-700 light:border-transparent">
                  <div className="text-xl font-bold text-surface-100 light:text-surface-900">{inquiry.rooms_qtpl || 0}</div>
                  <div className="text-xs text-surface-400 light:text-surface-500">Quad (QTPL)</div>
                </div>
              </div>
              <p className="text-sm text-surface-400 light:text-surface-500 mt-2">
                Total: {(inquiry.rooms_dbl || 0) + (inquiry.rooms_sgl || 0) + (inquiry.rooms_tpl || 0) + (inquiry.rooms_qtpl || 0)} rooms
              </p>
            </div>
          </div>

          {/* Activities */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-surface-100 light:text-surface-900 mb-4">
              Selected Activities
            </h2>
            {inquiry.activities && (inquiry.activities as string[]).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(inquiry.activities as string[]).map((activity: string) => (
                  <span
                    key={activity}
                    className="px-3 py-1.5 bg-primary-900/50 light:bg-primary-50 text-primary-300 light:text-primary-700 rounded-full text-sm font-medium border border-primary-700/50 light:border-transparent"
                  >
                    {activity}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-surface-400 light:text-surface-500">No activities selected</p>
            )}
          </div>

          {/* Rooming List Manager */}
          <RoomingListManager
            groupInquiryId={inquiry.id}
            inquiryNumber={inquiry.inquiry_number}
            initialMembers={(members || []).map((m) => ({
              id: m.id,
              full_name: m.full_name,
              member_type: m.member_type as "adult" | "child",
              room_number: m.room_number || null,
              room_category: m.room_category || null,
              age_label: m.age_label || null,
              remarks: m.remarks || null,
              date_of_birth: m.date_of_birth || null,
            }))}
            totalRooms={{
              dbl: inquiry.rooms_dbl || 0,
              sgl: inquiry.rooms_sgl || 0,
              tpl: inquiry.rooms_tpl || 0,
              qtpl: inquiry.rooms_qtpl || 0,
            }}
          />

          {/* AI Itinerary Quick Actions */}
          <GroupItineraryQuickActions
            inquiryId={inquiry.id}
            existingItinerary={existingItinerary ? {
              id: existingItinerary.id,
              title: (existingItinerary.content as { title: string }).title,
              days: ((existingItinerary.content as { days: { day: number }[] }).days || []).length,
              created_at: existingItinerary.created_at,
            } : null}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-surface-100 light:text-surface-900 mb-4">
              Quick Info
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-surface-400 light:text-surface-500">Type</span>
                <Badge variant="purple">Group</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400 light:text-surface-500">Source</span>
                <span className="text-surface-100 light:text-surface-900 capitalize">
                  {inquiry.source?.replace("_", " ") || "Web Form"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400 light:text-surface-500">Total Travelers</span>
                <span className="text-surface-100 light:text-surface-900 font-medium">{totalPax}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400 light:text-surface-500">Adults</span>
                <span className="text-surface-100 light:text-surface-900">{inquiry.no_of_adults}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400 light:text-surface-500">Children</span>
                <span className="text-surface-100 light:text-surface-900">{inquiry.no_of_children || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400 light:text-surface-500">Duration</span>
                <span className="text-surface-100 light:text-surface-900">
                  {inquiry.no_of_nights ? `${inquiry.no_of_nights} nights` : "N/A"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400 light:text-surface-500">Last Updated</span>
                <span className="text-surface-100 light:text-surface-900">
                  {format(new Date(inquiry.updated_at), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

interface InfoItemProps {
  label: string;
  value: React.ReactNode;
}

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div>
      <dt className="text-xs font-medium text-surface-400 light:text-surface-500 uppercase tracking-wider mb-1">
        {label}
      </dt>
      <dd className="text-sm text-surface-100 light:text-surface-900">{value}</dd>
    </div>
  );
}
