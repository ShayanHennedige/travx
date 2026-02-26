import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { StatusBadge, Button } from "@/components/ui";
import Link from "next/link";
import { format } from "date-fns";
import { InquiryStatus } from "@/types/database";
import { ItineraryQuickActions } from "./ItineraryQuickActions";
import { GenerateFeedbackLinkButton } from "./GenerateFeedbackLinkButton";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InquiryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: inquiry, error } = await supabase
    .from("inquiries")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !inquiry) {
    notFound();
  }

  // Fetch activity log
  const { data: activities } = await supabase
    .from("inquiry_activities")
    .select("*, profiles(full_name, email)")
    .eq("inquiry_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch existing itinerary if any
  const { data: existingItinerary } = await supabase
    .from("itineraries")
    .select("id, content, created_at")
    .eq("inquiry_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch tour if exists
  const { data: tour } = await supabase
    .from("tours")
    .select("id")
    .eq("inquiry_id", id)
    .single();

  return (
    <AppLayout>
      <Header
        title={inquiry.inquiry_number}
        subtitle={`Submitted on ${format(new Date(inquiry.created_at), "MMMM d, yyyy 'at' h:mm a")}`}
        action={
          <div className="flex items-center gap-3">
            <GenerateFeedbackLinkButton
              inquiryId={inquiry.id}
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
              <StatusBadge status={inquiry.status as InquiryStatus} />
            </div>
          </div>

          {/* Client Information */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-surface-100 light:text-surface-900 mb-4">
              Client Information
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoItem label="First Name" value={inquiry.first_name} />
              <InfoItem label="Last Name" value={inquiry.last_name} />
              <InfoItem label="Passport No" value={inquiry.passport_no || "Not provided"} />
              <InfoItem label="Contact Number" value={inquiry.contact_number || "Not provided"} />
              <InfoItem label="Email" value={inquiry.client_email} />
              <InfoItem label="Country" value={inquiry.country || "Not specified"} />
            </div>
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
              <div />
              <InfoItem
                label="No. of Pax (Adults)"
                value={inquiry.no_of_pax?.toString() || "0"}
              />
              <InfoItem
                label="No. of Children"
                value={inquiry.no_of_children?.toString() || "0"}
              />
              <InfoItem
                label="Total Travelers"
                value={((inquiry.no_of_pax || 0) + (inquiry.no_of_children || 0)).toString()}
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

          {/* AI Itinerary Quick Actions */}
          <ItineraryQuickActions
            inquiryId={inquiry.id}
            existingItinerary={existingItinerary ? {
              id: existingItinerary.id,
              title: (existingItinerary.content as { title: string }).title,
              days: ((existingItinerary.content as { days: { day: number }[] }).days || []).length,
              created_at: existingItinerary.created_at,
            } : null}
          />

          {/* Notes */}
          {inquiry.notes && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-surface-100 light:text-surface-900 mb-4">
                Internal Notes
              </h2>
              <p className="text-surface-300 light:text-surface-700 whitespace-pre-wrap">
                {inquiry.notes}
              </p>
            </div>
          )}
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
                <span className="text-surface-400 light:text-surface-500">Source</span>
                <span className="text-surface-100 light:text-surface-900 capitalize">
                  {inquiry.source?.replace("_", " ") || "Web Form"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400 light:text-surface-500">Total Travelers</span>
                <span className="text-surface-100 light:text-surface-900">
                  {(inquiry.no_of_pax || 0) + (inquiry.no_of_children || 0)}
                </span>
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

          {/* Activity Log */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-surface-100 light:text-surface-900 mb-4">
              Recent Activity
            </h3>
            {activities && activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex gap-3 text-sm"
                  >
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                    <div>
                      <p className="text-surface-300 light:text-surface-700">
                        <span className="font-medium capitalize">
                          {activity.action.replace("_", " ")}
                        </span>
                        {activity.profiles && (
                          <span className="text-surface-400 light:text-surface-500">
                            {" "}
                            by {(activity.profiles as { full_name?: string; email?: string }).full_name || (activity.profiles as { full_name?: string; email?: string }).email}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-surface-400">
                        {format(new Date(activity.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-surface-400 light:text-surface-500">No activity recorded</p>
            )}
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
