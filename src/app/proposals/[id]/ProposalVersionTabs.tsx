"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import Link from "next/link";
import { format } from "date-fns";

export function ProposalVersionTabs({ proposal, versions, inquiry }: { proposal: any, versions: any[], inquiry: any }) {
  const [activeTabId, setActiveTabId] = useState<string>(versions[0]?.id || "");
  const [isCloning, setIsCloning] = useState(false);
  const router = useRouter();

  const activeVersion = versions.find(v => v.id === activeTabId);

  const handleClone = async () => {
    if (!activeVersion) return;
    setIsCloning(true);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version_id: activeVersion.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      router.refresh();
      setActiveTabId(data.version.id);
    } catch (err) {
      console.error(err);
      alert("Failed to clone version");
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-slate-100 p-1 rounded-xl w-max">
        {versions.map(v => (
          <button
            key={v.id}
            onClick={() => setActiveTabId(v.id)}
            className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              activeTabId === v.id 
                ? "bg-white text-primary-700 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            }`}
          >
            {v.version_label}
            {v.is_accepted && <span className="ml-2 text-[10px] uppercase bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Accepted</span>}
          </button>
        ))}
      </div>

      <div className="card p-8 min-h-[400px]">
        {activeVersion ? (
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
               <div>
                  <h2 className="text-2xl font-bold text-slate-900">{activeVersion.version_label} Itinerary</h2>
                  <p className="text-sm text-slate-500 mt-1">Generated {format(new Date(activeVersion.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
               </div>
               <div className="flex items-center gap-3">
                 <Button variant="secondary" onClick={handleClone} disabled={isCloning}>
                    {isCloning ? "Cloning..." : "Clone Version"}
                 </Button>
               </div>
            </div>

            {activeVersion.itineraries ? (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                     <h3 className="text-lg font-bold text-slate-800 mb-2">Itinerary Route</h3>
                     <p className="font-medium text-slate-600 mb-4">{activeVersion.itineraries.content?.title || "Draft Itinerary"}</p>
                     <p className="text-sm text-slate-500 mb-6">{activeVersion.itineraries.content?.summary}</p>
                     
                     <Link href={`/itineraries/${activeVersion.itineraries.id}`}>
                        <Button className="w-full justify-center">Open Itinerary Editor</Button>
                     </Link>
                  </div>
                  
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                     <h3 className="text-lg font-bold text-slate-800 mb-2">Costing Sheet</h3>
                     <div className="mb-6">
                         {activeVersion.itineraries.status === 'finalized' ? (
                            <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">Ready for Quoting</span>
                         ) : (
                            <span className="text-sm font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">Requires Agent Review</span>
                         )}
                     </div>
                     <Link href={`/itineraries/${activeVersion.itineraries.id}`}>
                        <Button variant="secondary" className="w-full justify-center">Open Costing Sheet</Button>
                     </Link>
                  </div>
               </div>
            ) : (
               <p className="text-slate-500">Processing generated itinerary content...</p>
            )}
          </div>
        ) : (
           <p className="text-slate-500 text-center py-12">No active version selected.</p>
        )}
      </div>
    </div>
  );
}
