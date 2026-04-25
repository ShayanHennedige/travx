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
import { getEffectiveStatus } from "@/lib/utils/status";
import { GroupInquiryStatusUpdate } from "./GroupInquiryStatusUpdate";

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
      <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
        <Header
          title={inquiry.inquiry_number}
          subtitle={`Group Operational Record · Initiated ${format(new Date(inquiry.created_at), "MMM d, yyyy")}`}
          action={
            <div className="flex items-center gap-3">
              <GenerateFeedbackLinkButton
                inquiryId=""
                groupInquiryId={inquiry.id}
                itineraryId={existingItinerary?.id}
                tourId={tour?.id}
              />
              <Link href="/inquiries">
                <Button variant="secondary" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back
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
          <div className="relative overflow-hidden bg-[#0f172a] rounded-[2rem] p-8 shadow-2xl border border-white/10 group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-inner transition-transform duration-500 group-hover:scale-110">
                  <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white text-xl font-bold tracking-tight mb-1">Workflow Status</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Group Pipeline</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="purple" className="px-4 py-1.5 text-xs font-black uppercase tracking-widest border border-purple-500/30">Group Booking</Badge>
                <StatusBadge status={getEffectiveStatus(inquiry.status, inquiry.arriving_date, inquiry.departure_date) as InquiryStatus} />
                <GroupInquiryStatusUpdate inquiryId={inquiry.id} currentStatus={inquiry.status as InquiryStatus} />
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

            {/* Leader Intelligence */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:border-primary-100 transition-all duration-500 group">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Group Leadership
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <InfoItem label="Leader Name" value={inquiry.head_first_name ? `${inquiry.head_first_name} ${inquiry.head_last_name}` : "Valued Guest (Name Not Provided)"} />
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Passport No" value={inquiry.head_passport_no || "Not Logged"} />
                </div>
              </div>
            </div>

            {/* Group Logistics */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-100 transition-all duration-500 group">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Group Logistics
                </h2>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Arrival</p>
                    <p className="text-sm font-bold text-slate-800">{inquiry.arriving_date ? format(new Date(inquiry.arriving_date), "MMM d, yyyy") : "TBD"}</p>
                    {inquiry.arrival_flight_no && (
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {inquiry.arrival_flight_no}{inquiry.arrival_time ? ` @ ${inquiry.arrival_time}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Departure</p>
                    <p className="text-sm font-bold text-slate-800">{inquiry.departure_date ? format(new Date(inquiry.departure_date), "MMM d, yyyy") : "TBD"}</p>
                    {inquiry.departure_flight_no && (
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {inquiry.departure_flight_no}{inquiry.departure_time ? ` @ ${inquiry.departure_time}` : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Group Capacity" value={`${totalPax} Members`} />
                  <InfoItem label="Active Duration" value={`${inquiry.no_of_nights || 0} Nights`} />
                </div>
              </div>
            </div>
          </div>

          {/* Group Capacity & Manifest */}
          <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Group Configuration & Inventory
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10">
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Accommodation Standards</p>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem label="Category" value={(Array.isArray(inquiry.hotel_type) ? inquiry.hotel_type.join(", ") : inquiry.hotel_type) || "Premium Selection"} />
                      <InfoItem label="Class" value={(Array.isArray(inquiry.room_category) ? inquiry.room_category.join(", ") : inquiry.room_category) || "Standardized"} />
                    </div>
                    <InfoItem label="Meal Plan" value={(Array.isArray(inquiry.meal_plan) ? inquiry.meal_plan.join(", ") : inquiry.meal_plan) || "Not Specified"} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pax Breakdown</p>
                  <div className="flex gap-3">
                    <span className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">{inquiry.no_of_adults} Adults</span>
                    <span className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">{inquiry.no_of_children || 0} Children</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Inventory Allocation</p>
                <div className="grid grid-cols-2 gap-3">
                  {inquiry.rooms_dbl > 0 && <RoomChip label="Double" count={inquiry.rooms_dbl} />}
                  {inquiry.rooms_sgl > 0 && <RoomChip label="Single" count={inquiry.rooms_sgl} />}
                  {inquiry.rooms_tpl > 0 && <RoomChip label="Triple" count={inquiry.rooms_tpl} />}
                  {inquiry.rooms_qtpl > 0 && <RoomChip label="Quad" count={inquiry.rooms_qtpl} />}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Inventory</span>
                  <span className="text-sm font-black text-slate-900">{(inquiry.rooms_dbl || 0) + (inquiry.rooms_sgl || 0) + (inquiry.rooms_tpl || 0) + (inquiry.rooms_qtpl || 0)} UNITS</span>
                </div>
              </div>
            </div>

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
                passport_no: m.passport_no || null,
              }))}
              totalRooms={{
                dbl: inquiry.rooms_dbl || 0,
                sgl: inquiry.rooms_sgl || 0,
                tpl: inquiry.rooms_tpl || 0,
                qtpl: inquiry.rooms_qtpl || 0,
              }}
            />
          </div>

          <GroupItineraryQuickActions
            inquiryId={inquiry.id}
            existingItinerary={existingItinerary ? {
              id: existingItinerary.id,
              title: (existingItinerary.content as { title: string }).title,
              days: ((existingItinerary.content as { days: { day: number }[] }).days || []).length,
              created_at: existingItinerary.created_at,
            } : null}
          />

          {/* Activities */}
          {inquiry.activities && (inquiry.activities as string[]).length > 0 && (
            <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Experience Preferences</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {(inquiry.activities as string[]).map((activity: string) => (
                  <span key={activity} className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-100 transition-all cursor-default">
                    {activity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Adult Members Manifest */}
          {adultMembers.length > 0 && (
            <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Adult Members <span className="text-slate-400 font-medium text-base">({adultMembers.length})</span>
                </h2>
              </div>
              <div className="space-y-3">
                {adultMembers.map((member, i) => (
                  <div key={member.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black text-slate-600 flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{member.full_name}</p>
                      {member.passport_no && <p className="text-xs text-slate-500 font-medium">PP: {member.passport_no}</p>}
                    </div>
                    {member.special_requirements && (
                      <span className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg font-medium truncate max-w-[140px]">{member.special_requirements}</span>
                    )}
                  </div>
                ))}
              </div>

              {childMembers.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                    Children ({childMembers.length})
                  </h3>
                  <div className="space-y-3">
                    {childMembers.map((member, i) => (
                      <div key={member.id} className="flex items-center gap-4 p-4 bg-amber-50/30 rounded-2xl border border-amber-100">
                        <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-black text-amber-600 flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{member.full_name}</p>
                          {member.passport_no && <p className="text-xs text-slate-500 font-medium">PP: {member.passport_no}</p>}
                        </div>
                        {member.special_requirements && (
                          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg font-medium truncate max-w-[140px]">{member.special_requirements}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {inquiry.client_desires && (
            <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 italic">Client Desires & Preferred Places</h3>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 italic text-slate-700 text-sm leading-relaxed">
                &ldquo;{inquiry.client_desires}&rdquo;
              </div>
            </div>
          )}
        </div>

        {/* Intelligence Sidebar */}
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-6 pb-4 border-b border-slate-100">
              Operational Specs
            </h3>
            <div className="space-y-5">
              <SidebarItem label="Source" value={inquiry.source?.replace("_", " ") || "Portal"} />
              <SidebarItem label="Type" value="Group Manifest" />
              <SidebarItem label="Load" value={`${totalPax} Members`} />
              <SidebarItem label="Mix" value={`${inquiry.no_of_adults}A / ${inquiry.no_of_children}C`} />
              <div className="pt-4 mt-4 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Synchronized</p>
                <p className="text-xs font-bold text-slate-600">{format(new Date(inquiry.updated_at), "MMM d, yyyy · HH:mm")}</p>
              </div>
            </div>
          </div>

          {inquiry.notes && (
            <div className="bg-[#fffbeb] rounded-[2rem] p-8 border border-amber-100">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <h2 className="text-xs font-black text-amber-900 uppercase tracking-widest">
                  Operational Notes
                </h2>
              </div>
              <p className="text-amber-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                {inquiry.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function RoomChip({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-primary-200 transition-colors">
      <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
      <span className="text-sm font-black text-slate-900">{count}</span>
    </div>
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
