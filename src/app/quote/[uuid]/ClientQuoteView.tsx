"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function ClientQuoteView({ quote }: { quote: any }) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passengers, setPassengers] = useState<any[]>([
     { first_name: "", last_name: "", passport_number: "", passport_expiry: "", nationality: "", date_of_birth: "", dietary_requirements: "", is_lead_passenger: true }
  ]);
  const [success, setSuccess] = useState(false);

  const acceptedVersion = quote.versions.find((v: any) => v.is_accepted);
  const isLockedAndAccepted = quote.status === 'accepted' || acceptedVersion;

  const handleAddPassenger = () => {
     setPassengers(prev => [...prev, { first_name: "", last_name: "", passport_number: "", passport_expiry: "", nationality: "", date_of_birth: "", dietary_requirements: "", is_lead_passenger: false }]);
  };

  const handlePassengerChange = (index: number, field: string, value: string) => {
     const newPax = [...passengers];
     newPax[index] = { ...newPax[index], [field]: value };
     setPassengers(newPax);
  };

  const submitAcceptance = async () => {
     setIsSubmitting(true);
     try {
        const res = await fetch(`/api/quote/${quote.id}/accept`, {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
              version_id: selectedVersionId,
              passengers
           })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to submit");
        setSuccess(true);
     } catch (err) {
        console.error(err);
        alert("Failed to submit acceptance. Please check all fields.");
     } finally {
        setIsSubmitting(false);
     }
  };

  if (success || isLockedAndAccepted) {
     return (
        <div className="bg-white rounded-3xl p-10 md:p-16 shadow-2xl text-center max-w-2xl mx-auto border border-emerald-100">
           <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <svg className="w-12 h-12 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
           </div>
           <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Booking Confirmed!</h2>
           <p className="text-slate-600 text-lg">
              Thank you for trusting TripSuite. We have received your passport details and locked in the {acceptedVersion?.version_label || "selected"} itinerary. Our operations team will reach out shortly with your final confirmations.
           </p>
        </div>
     );
  }

  return (
    <>
      <div className="mb-8 text-center max-w-3xl mx-auto">
         <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">{quote.title}</h2>
         <p className="text-slate-500">Please review the proposed itinerary variations below. Choose the one that best suits your style and proceed to accept to lock in the reservation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         {quote.versions.map((ver: any) => (
            <div key={ver.id} className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col justify-between hover:shadow-2xl hover:border-primary-200 transition-all">
               <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{ver.version_label}</h3>
                  <div className="text-3xl font-black text-slate-900 mb-6 pb-6 border-b border-slate-100">
                     ${ver.per_person_usd.toFixed(2)} <span className="text-sm font-medium text-slate-400">/ person</span>
                  </div>
                  
                  <p className="text-slate-600 text-sm mb-6 leading-relaxed italic">
                     {ver.itinerary_summary}
                  </p>

                  <div className="space-y-4 mb-8">
                     {ver.itinerary_days?.slice(0, 5).map((d: any) => (
                        <div key={d.day} className="flex gap-4">
                           <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                              <span className="text-xs font-bold text-slate-600">{d.day}</span>
                           </div>
                           <div>
                              <p className="text-sm font-bold text-slate-800">{d.title}</p>
                              <p className="text-xs text-slate-500 mt-1">{d.hotel_tier} · {d.meal_plan}</p>
                           </div>
                        </div>
                     ))}
                     {ver.itinerary_days?.length > 5 && (
                        <p className="text-xs text-center text-slate-400 font-bold tracking-widest uppercase mt-4">... {ver.itinerary_days.length - 5} more days</p>
                     )}
                  </div>
               </div>

               <Button 
                  className="w-full justify-center h-12 text-base font-bold shadow-md hover:shadow-lg transition-transform hover:-translate-y-1"
                  onClick={() => {
                     setSelectedVersionId(ver.id);
                     setIsModalOpen(true);
                  }}
               >
                  Accept {ver.version_label} Option
               </Button>
            </div>
         ))}
      </div>

      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-[2rem] w-full max-w-3xl p-8 md:p-10 shadow-2xl relative my-8">
               <button 
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-6 right-6 w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-500"
               >
                  ✕
               </button>
               
               <div className="mb-8 pr-12">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Final Passenger Details</h3>
                  <p className="text-slate-500">To lock in this quote and reserve your accommodations, please provide the passport details for all travelers.</p>
               </div>

               <div className="space-y-10 mb-10 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
                  {passengers.map((p, i) => (
                     <div key={i} className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                           <h4 className="font-bold text-slate-800 uppercase tracking-widest text-xs">
                              {p.is_lead_passenger ? "Lead Passenger" : `Traveler ${i + 1}`}
                           </h4>
                           {!p.is_lead_passenger && (
                              <button 
                                 className="text-xs text-red-500 font-bold hover:text-red-700"
                                 onClick={() => setPassengers(prev => prev.filter((_, idx) => idx !== i))}
                              >
                                 Remove
                              </button>
                           )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <input type="text" placeholder="First Name *" className="input-field" value={p.first_name} onChange={(e) => handlePassengerChange(i, "first_name", e.target.value)} />
                           <input type="text" placeholder="Last Name *" className="input-field" value={p.last_name} onChange={(e) => handlePassengerChange(i, "last_name", e.target.value)} />
                           <input type="text" placeholder="Passport Number *" className="input-field" value={p.passport_number} onChange={(e) => handlePassengerChange(i, "passport_number", e.target.value)} />
                           <input type="date" className="input-field" value={p.passport_expiry} onChange={(e) => handlePassengerChange(i, "passport_expiry", e.target.value)} />
                           <input type="text" placeholder="Nationality *" className="input-field" value={p.nationality} onChange={(e) => handlePassengerChange(i, "nationality", e.target.value)} />
                           <input type="date" className="input-field" value={p.date_of_birth} onChange={(e) => handlePassengerChange(i, "date_of_birth", e.target.value)} />
                           <input type="text" placeholder="Dietary Requirements (Optional)" className="input-field md:col-span-2" value={p.dietary_requirements} onChange={(e) => handlePassengerChange(i, "dietary_requirements", e.target.value)} />
                        </div>
                     </div>
                  ))}
               </div>

               <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
                  <Button variant="secondary" onClick={handleAddPassenger} type="button">
                     + Add Another Traveler
                  </Button>
                  <Button 
                     className="w-full sm:w-auto h-12 px-8 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                     onClick={submitAcceptance}
                     disabled={isSubmitting}
                  >
                     {isSubmitting ? "Processing..." : "Confirm Booking"}
                  </Button>
               </div>
            </div>
         </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .input-field {
           width: 100%;
           padding: 0.75rem 1rem;
           border-radius: 0.75rem;
           border: 1px solid #e2e8f0;
           background: white;
           font-size: 0.875rem;
        }
        .input-field:focus {
           outline: none;
           border-color: #fca5a5;
           box-shadow: 0 0 0 3px rgba(254, 202, 202, 0.5);
        }
      `}} />
    </>
  );
}
