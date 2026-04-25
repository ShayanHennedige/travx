import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { StatusBadge, Button } from "@/components/ui";
import Link from "next/link";
import { format } from "date-fns";
import { InquiryStatus } from "@/types/database";
import { ProposalQuickActions } from "./ProposalQuickActions";
import { GenerateFeedbackLinkButton } from "./GenerateFeedbackLinkButton";
import { getEffectiveStatus } from "@/lib/utils/status";
import { InquiryStatusUpdate } from "./InquiryStatusUpdate";
import { InquiryQuickEdit } from "./InquiryQuickEdit";

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

  // Fetch proposals alongside their itinerary versions
  const { data: proposals } = await supabase
    .from("proposals")
    .select("*, itinerary_versions(*)")
    .eq("inquiry_id", id)
    .order("created_at", { ascending: false });

  // For the GenerateFeedbackLinkButton backwards compatibility:
  let existingItinerary = null;
  if (proposals && proposals.length > 0) {
     const earliestProposal = proposals[proposals.length - 1]; // or the accepted one
     if (earliestProposal.itinerary_versions && earliestProposal.itinerary_versions.length > 0) {
        existingItinerary = { id: earliestProposal.itinerary_versions[0].itinerary_id };
     }
  }

  // Fetch tour if exists
  const { data: tour } = await supabase
    .from("tours")
    .select("id")
    .eq("inquiry_id", id)
    .single();

  return (
    <AppLayout>
      <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
        <Header
          title={inquiry.inquiry_number}
          subtitle={`Operational Record · Created ${format(new Date(inquiry.created_at), "MMM d, yyyy")}`}
          action={
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <GenerateFeedbackLinkButton
                inquiryId={inquiry.id}
                itineraryId={existingItinerary?.id}
                tourId={tour?.id}
              />
              <Link href="/inquiries" className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full sm:w-auto bg-surface-800 text-surface-100 border-surface-700 hover:bg-surface-700 shadow-sm light:bg-white light:text-surface-700 light:border-surface-200 light:hover:bg-surface-50">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="xs:hidden sm:inline">Back</span>
                  <span className="hidden xs:inline sm:hidden">Back to Inquiries</span>
                  <span className="hidden sm:inline"></span>
                </Button>
              </Link>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Operational Data */}
        <div className="lg:col-span-3 space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">

          {/* Status Dash */}
          <div className="relative overflow-hidden bg-surface-900 rounded-[2rem] p-8 shadow-2xl border border-white/10 group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-inner transition-transform duration-500 group-hover:scale-110">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white text-lg sm:text-xl font-bold tracking-tight mb-0.5 sm:mb-1">Workflow Status</h3>
                  <p className="text-surface-400 text-[10px] font-bold uppercase tracking-[0.2em]">Inquiry Pipeline</p>
                </div>
              </div>
              <div className="flex items-center gap-4 md:gap-8">
                <div className="h-10 w-px bg-white/10 hidden md:block" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <StatusBadge status={getEffectiveStatus(inquiry.status, inquiry.arriving_date, inquiry.departure_date) as InquiryStatus} />
                  <InquiryStatusUpdate inquiryId={inquiry.id} currentStatus={inquiry.status as InquiryStatus} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Travel Agent Intelligence */}
            {inquiry.agent_email && (
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:border-primary-100 transition-all duration-500 group">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    Travel Agent Details
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <InfoItem label="Agent Name" value={inquiry.agent_name || "Not Logged"} />
                  <InfoItem label="Agent Email" value={inquiry.agent_email} />
                  <InfoItem label="Agent Company" value={inquiry.agent_company || "Not Specified"} />
                </div>
              </div>
            )}

            {/* Traveler Intelligence */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:border-primary-100 transition-all duration-500 group">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Traveler Profile
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <InfoItem label="Full Legal Name" value={inquiry.first_name ? `${inquiry.first_name} ${inquiry.last_name}` : "Valued Guest (Name Not Provided)"} />
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Region" value={inquiry.country || "Not Specified"} />
                </div>
                <InfoItem label="Identification" value={inquiry.passport_no || "Awaiting Document"} />
              </div>
            </div>

            {/* Logistics Intelligence */}
            <div className={`bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-100 transition-all duration-500 group ${!inquiry.agent_email ? 'md:col-span-2' : ''}`}>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Logistics & Schedule
                </h2>
              </div>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4 sm:gap-2">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Arrival Window</p>
                    <p className="text-sm font-bold text-slate-800">{inquiry.arriving_date ? format(new Date(inquiry.arriving_date), "MMM d, yyyy") : "TBD"}</p>
                    {inquiry.arrival_flight_no && (
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        {inquiry.arrival_flight_no} {inquiry.arrival_time ? `@ ${inquiry.arrival_time}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="hidden sm:flex w-8 h-8 rounded-full bg-white items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Departure</p>
                    <p className="text-sm font-bold text-slate-800">{inquiry.departure_date ? format(new Date(inquiry.departure_date), "MMM d, yyyy") : "TBD"}</p>
                    {inquiry.departure_flight_no && (
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        {inquiry.departure_flight_no} {inquiry.departure_time ? `@ ${inquiry.departure_time}` : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Group Capacity" value={`${(inquiry.no_of_pax || 0) + (inquiry.no_of_children || 0)} Members`} />
                  <InfoItem label="Active Duration" value={`${inquiry.no_of_nights || 0} Nights Total`} />
                </div>
              </div>
            </div>
          </div>

          {/* Configuration & Preferences */}
          <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Accommodation & Hospitality
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 sm:gap-10 mb-10">
              <InfoItem label="Service Category" value={
                Array.isArray(inquiry.hotel_type) && inquiry.hotel_type.length > 0
                  ? <div className="flex flex-wrap gap-1">{inquiry.hotel_type.map((t: string) => <span key={t} className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded-lg text-[10px] font-bold border border-primary-100">{t}</span>)}</div>
                  : "Premium Selection"
              } />
              <InfoItem label="Room Class" value={
                Array.isArray(inquiry.room_category) && inquiry.room_category.length > 0
                  ? <div className="flex flex-wrap gap-1">{inquiry.room_category.map((r: string) => <span key={r} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-100">{r}</span>)}</div>
                  : "Standardized"
              } />
              <InfoItem label="Meal Plan" value={
                Array.isArray(inquiry.meal_plan) && inquiry.meal_plan.length > 0
                  ? <div className="flex flex-wrap gap-1">{inquiry.meal_plan.map((m: string) => <span key={m} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-100">{m}</span>)}</div>
                  : "Not Specified"
              } />
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Inventory Mix</p>
                <div className="flex flex-wrap gap-2">
                  {inquiry.rooms_dbl > 0 && <span className="px-2 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold">DBL: {inquiry.rooms_dbl}</span>}
                  {inquiry.rooms_sgl > 0 && <span className="px-2 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold">SGL: {inquiry.rooms_sgl}</span>}
                  {inquiry.rooms_tpl > 0 && <span className="px-2 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold">TPL: {inquiry.rooms_tpl}</span>}
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 italic">Experience Preferences</h3>
              {inquiry.activities && (inquiry.activities as string[]).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(inquiry.activities as string[]).map((activity: string) => (
                    <span
                      key={activity}
                      className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-100 transition-all cursor-default"
                    >
                      {activity}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm font-medium">Standard Experience Package</p>
              )}
            </div>

            <div className="pt-8 mt-8 border-t border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 italic">Client Desires & Preferred Places</h3>
              <InquiryQuickEdit
                inquiryId={inquiry.id}
                field="client_desires"
                label="Client Desires"
                initialValue={inquiry.client_desires || null}
              />
            </div>
          </div>

          <ProposalQuickActions
            inquiryId={inquiry.id}
            existingProposals={proposals || []}
          />

          <div className="bg-accent-50 rounded-[2rem] p-8 border border-accent-200">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-5 h-5 text-accent-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <h2 className="text-sm font-black text-accent-900 uppercase tracking-widest">
                Strategic Intelligence Notes
              </h2>
            </div>
            <InquiryQuickEdit
              inquiryId={inquiry.id}
              field="notes"
              label="Notes"
              initialValue={inquiry.notes || null}
            />
          </div>
        </div>

        {/* Intelligence Sidebar */}
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12" />
            <h3 className="relative text-sm font-bold text-slate-900 mb-6 pb-4 border-b border-slate-100">
              System Indicators
            </h3>
            <div className="space-y-5 relative">
              <SidebarItem label="Acquisition" value={inquiry.source?.replace("_", " ") || "Web Portal"} />
              <SidebarItem label="Pax Count" value={((inquiry.no_of_pax || 0) + (inquiry.no_of_children || 0)).toString()} />
              <SidebarItem label="Cycle Time" value={`${inquiry.no_of_nights || 0} D/N`} />
              <div className="pt-4 mt-4 border-t border-slate-50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Synchronized</p>
                <p className="text-xs font-bold text-slate-600">{format(new Date(inquiry.updated_at), "MMM d, yyyy · HH:mm")}</p>
              </div>
            </div>
          </div>

          {activities && activities.length > 0 && (
            <div className="bg-surface-900 rounded-[2rem] p-8 shadow-2xl overflow-hidden mt-8">
              <h3 className="text-sm font-bold text-white mb-6 pb-4 border-b border-white/10">
                Operational Logs
              </h3>
              <div className="space-y-6">
                {activities.map((activity, index) => (
                  <div key={activity.id} className="relative pl-6">
                    {index !== activities.length - 1 && (
                      <div className="absolute left-[3px] top-4 bottom-[-24px] w-0.5 bg-white/5" />
                    )}
                    <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <div>
                      <p className="text-surface-200 text-xs font-bold capitalize mb-1">
                        {activity.action.replace("_", " ")}
                      </p>
                      <p className="text-surface-500 text-[10px] font-medium">
                        {activity.profiles ? (activity.profiles as any).full_name : "System"} · {format(new Date(activity.created_at), "MMM d, HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function SidebarItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center group">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-xs font-bold text-slate-900 px-2 py-1 bg-slate-50 rounded-lg group-hover:bg-primary-50 group-hover:text-primary-700 transition-colors uppercase">
        {value}
      </span>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
      <div className="text-sm font-bold text-slate-900 break-words leading-snug">
        {value}
      </div>
    </div>
  );
}
