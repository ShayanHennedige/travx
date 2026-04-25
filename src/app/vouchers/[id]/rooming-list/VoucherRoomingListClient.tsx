"use client";

import { useState, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { AppLayout, Header } from "@/components/layout";
import { Button, Input } from "@/components/ui";
import { format } from "date-fns";
import Link from "next/link";

interface GroupMember {
  id: string;
  full_name: string;
  member_type: "adult" | "child";
  date_of_birth: string | null;
  passport_no: string | null;
  age_label: string | null;
  room_number: number | null;
  room_category: string;
  remarks: string;
}

interface TourGuide {
  name: string;
  room_category: string;
  remarks: string;
}

interface Props {
  voucherId: string;
  hotelName: string;
  inquiryNumber: string;
  groupInquiryId: string;
  initialMembers: GroupMember[];
  initialTourGuide: TourGuide | null;
  travelDates: {
    in: string;
    out: string;
  };
  totalPax: number;
}

export default function VoucherRoomingListClient({
  voucherId,
  hotelName,
  inquiryNumber,
  groupInquiryId,
  initialMembers,
  initialTourGuide,
  travelDates,
  totalPax
}: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<GroupMember[]>(initialMembers);
  const [tourGuide, setTourGuide] = useState<TourGuide | null>(initialTourGuide || null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Sync state changes back to properties
  const updateMember = (id: string, field: "room_category" | "remarks", value: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  // Group members by room_number to visually separate them like the PDF
  const groupedMembers = useMemo(() => {
    const groups: { room_number: number | 'unassigned', members: GroupMember[] }[] = [];
    const roomMap = new Map<number | 'unassigned', GroupMember[]>();

    members.forEach(m => {
      const key = m.room_number || 'unassigned';
      if (!roomMap.has(key)) roomMap.set(key, []);
      roomMap.get(key)!.push(m);
    });

    // Sort room numbers
    const sortedKeys = Array.from(roomMap.keys()).sort((a, b) => {
      if (a === 'unassigned') return 1;
      if (b === 'unassigned') return -1;
      return (a as number) - (b as number);
    });

    sortedKeys.forEach(k => {
      groups.push({ room_number: k, members: roomMap.get(k)! });
    });

    return groups;
  }, [members]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const assignments = members.map(m => ({
        member_id: m.id,
        room_number: m.room_number,
        room_category: m.room_category,
        remarks: m.remarks,
      }));

      const response = await fetch(`/api/vouchers/${voucherId}/rooming-list`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments,
          interconnections: [], // Not supported in this simplified table mode yet, or handled manually in remarks
          tourGuide,
        }),
      });

      if (!response.ok) throw new Error("Failed to save rooming list");
      
      alert("Saved successfully!");
      router.push("/vouchers");
    } catch (e) {
      console.error(e);
      alert("Failed to save rooming list");
    } finally {
      setSaving(false);
    }
  };

  const handlePDF = async () => {
    setGenerating(true);
    // save any latent changes
    await handleSave();
    try {
      const response = await fetch(`/api/rooming-list/${groupInquiryId}/pdf?voucher_id=${voucherId}`);
      if (!response.ok) throw new Error("Failed to generate rooming list PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch(e) {
      console.error(e);
      alert("Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  }

  const inDate = travelDates.in ? format(new Date(travelDates.in), "dd MMM yyyy") : "-";
  const outDate = travelDates.out ? format(new Date(travelDates.out), "dd MMM yyyy") : "-";

  return (
    <AppLayout>
      <Header
        title={`Rooming List - ${hotelName}`}
        subtitle="Manage the room allocations for this specific hotel"
        action={
          <div className="flex items-center gap-3">
            <Link href="/vouchers">
              <Button variant="secondary">Back to Vouchers</Button>
            </Link>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Selection"}
            </Button>
            <Button onClick={handlePDF} disabled={generating} className="bg-slate-800 hover:bg-slate-900 border-none">
               {generating ? "Generating..." : "Generate PDF"}
            </Button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto py-8">
        {/* Info Grid */}
        <div className="grid grid-cols-4 gap-0 border-t border-l border-surface-200 mb-8 bg-white shadow-sm rounded-tr-lg rounded-tl-lg overflow-hidden">
          <div className="p-4 border-b border-r border-surface-200">
             <div className="text-[10px] font-black tracking-widest text-surface-400 mb-1 uppercase">Reference</div>
             <div className="text-sm font-bold text-surface-900">{inquiryNumber}</div>
          </div>
          <div className="p-4 border-b border-r border-surface-200">
             <div className="text-[10px] font-black tracking-widest text-surface-400 mb-1 uppercase">Hotel</div>
             <div className="text-sm font-bold text-surface-900">{hotelName}</div>
          </div>
          <div className="p-4 border-b border-r border-surface-200">
             <div className="text-[10px] font-black tracking-widest text-surface-400 mb-1 uppercase">Total Pax</div>
             <div className="text-sm font-bold text-surface-900">{members.length}</div>
          </div>
          <div className="p-4 border-b border-r border-surface-200">
             <div className="text-[10px] font-black tracking-widest text-surface-400 mb-1 uppercase">Travel Dates</div>
             <div className="text-sm font-bold text-surface-900">{inDate} - {outDate}</div>
          </div>
        </div>

        {/* Master Table */}
        <div className="bg-white border text-sm border-surface-200 rounded-xl overflow-hidden shadow-sm">
           <table className="w-full text-left border-collapse">
             <thead>
               <tr className="bg-surface-50 border-b border-surface-200 text-surface-500 uppercase text-[10px] font-bold tracking-widest">
                 <th className="px-4 py-3 w-16 text-center">No</th>
                 <th className="px-4 py-3">Name</th>
                 <th className="px-4 py-3 w-32">Passport No</th>
                 <th className="px-4 py-3 w-24">Age</th>
                 <th className="px-4 py-3 w-56">Room Category</th>
                 <th className="px-4 py-3 w-64">Remarks</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-surface-100">
                {(() => {
                  let globalRowCounter = 0;
                  return groupedMembers.map((group, groupIdx) => {
                  return (
                    <Fragment key={group.room_number}>
                      {groupIdx > 0 && (
                        <tr className="bg-surface-100/30">
                          <td colSpan={6} className="h-4 border-t border-b border-surface-200"></td>
                        </tr>
                      )}
                      {group.members.map((member, localIdx) => {
                         globalRowCounter++;
                         return (
                           <tr key={member.id} className="hover:bg-surface-50/50 transition-colors">
                             <td className="px-4 py-3 text-center font-medium text-surface-500">{globalRowCounter}</td>
                           <td className="px-4 py-3 font-medium text-surface-900">{member.full_name}</td>
                           <td className="px-4 py-3 text-surface-500 font-mono tracking-tighter text-xs">{member.passport_no || "-"}</td>
                           <td className="px-4 py-3 text-surface-500">{member.age_label || (member.member_type === "adult" ? "Adult" : "Child")}</td>
                           <td className="px-4 py-2">
                              <Input 
                                 value={member.room_category} 
                                 onChange={(e) => updateMember(member.id, "room_category", e.target.value)} 
                                 placeholder="Double Room..." 
                                 className="h-8 text-xs py-1"
                              />
                           </td>
                           <td className="px-4 py-2">
                              <Input 
                                 value={member.remarks} 
                                 onChange={(e) => updateMember(member.id, "remarks", e.target.value)} 
                                 placeholder="Interconnected..." 
                                 className="h-8 text-xs py-1"
                              />
                           </td>
                          </tr>
                         );
                      })}
                    </Fragment>
                  );
                })
                })()}
             </tbody>
           </table>
        </div>

        {/* Tour Guide Addition */}
        <div className="mt-8 bg-white border border-surface-200 rounded-xl p-6 shadow-sm">
           <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-surface-900 mb-0">Tour Guide Accomodation</h3>
              {!tourGuide && (
                 <Button variant="secondary" size="sm" onClick={() => setTourGuide({ name: "", room_category: "Single Room", remarks: "Tour Guide" })}>
                   + Add Tour Guide
                 </Button>
              )}
           </div>

           {tourGuide && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-surface-100 mb-4">
                 <div>
                    <label className="block text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">Guide Name</label>
                    <Input 
                       value={tourGuide.name}
                       onChange={(e) => setTourGuide({...tourGuide, name: e.target.value})}
                       placeholder="Enter name..."
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">Room Category</label>
                    <Input 
                       value={tourGuide.room_category}
                       onChange={(e) => setTourGuide({...tourGuide, room_category: e.target.value})}
                       placeholder="Single Room"
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">Remarks</label>
                    <Input 
                       value={tourGuide.remarks}
                       onChange={(e) => setTourGuide({...tourGuide, remarks: e.target.value})}
                       placeholder="Tour Guide / Driver"
                    />
                 </div>
             </div>
           )}

           {tourGuide && (
              <div className="flex justify-end">
                 <button onClick={() => setTourGuide(null)} className="text-red-600 text-xs font-bold hover:underline">Remove Tour Guide</button>
              </div>
           )}
        </div>
      </div>
    </AppLayout>
  );
}
