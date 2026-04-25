import { notFound } from "next/navigation";
import { ClientQuoteView } from "./ClientQuoteView";

export default async function PublicQuotePage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;

  // Ideally fetched via a local fetch call to the absolute URL or direct DB call since it's a server component.
  // We'll fetch it locally referencing the API we just created.
  // Note: Since this is app router, if we are deployed, we need an absolute URL.
  // For simplicity and safety in Server Components, it's often better to query the DB directly here, 
  // but to reuse the sanitation logic from the API, we can just fetch it with a relative URL bypass if running locally
  // Here we will do a direct DB lookup to avoid fetch URL issues in Vercel.
  
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data: proposal, error: propError } = await supabase
      .from("proposals")
      .select("*, itinerary_versions(*, itineraries(content), tour_costing_sheets(*))")
      .eq("id", uuid)
      .single();

  if (propError || !proposal) {
      notFound();
  }

  // Sanitize down to what the client should see (this mirrors your GET api route for SSR)
  const safeVersions = proposal.itinerary_versions?.map((v: any) => {
      const costing = v.tour_costing_sheets && v.tour_costing_sheets.length > 0 ? v.tour_costing_sheets[0] : null;
      const perPersonUsd = costing?.per_person_usd || 0;
      
      return {
         id: v.id,
         version_label: v.version_label,
         itinerary_summary: v.itineraries?.content?.summary || "No summary available",
         itinerary_days: v.itineraries?.content?.days?.map((d: any) => ({
            day: d.day,
            title: d.title,
            hotel_tier: d.hotel_tier,
            meal_plan: d.meal_plan
         })),
         per_person_usd: perPersonUsd,
         is_accepted: v.is_accepted
      };
  });

  const quoteData = {
     id: proposal.id,
     title: proposal.title,
     status: proposal.status,
     versions: safeVersions
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-primary-200">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10 w-full p-4 md:px-8">
         <div className="max-w-6xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">TripSuite Quotation</h1>
            {quoteData.status === 'accepted' && (
               <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase rounded-full border border-green-200">Quote Accepted</span>
            )}
         </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:px-8 py-10">
         <ClientQuoteView quote={quoteData} />
      </main>
    </div>
  );
}
