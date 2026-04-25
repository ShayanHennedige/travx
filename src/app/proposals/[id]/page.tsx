import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLayout, Header } from "@/components/layout";
import { ProposalVersionTabs } from "./ProposalVersionTabs";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: proposal, error: propError } = await supabase
    .from("proposals")
    .select("*, itinerary_versions(*, itineraries(*, tour_costing_sheets(*)))")
    .eq("id", id)
    .single();

  if (propError || !proposal) {
    notFound();
  }

  // Fetch the related inquiry
  let inquiry = null;
  if (proposal.inquiry_id) {
    const { data } = await supabase.from("inquiries").select("*").eq("id", proposal.inquiry_id).single();
    inquiry = data;
  } else if (proposal.group_inquiry_id) {
      const { data } = await supabase.from("group_inquiries").select("*").eq("id", proposal.group_inquiry_id).single();
      inquiry = data;
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <Header 
          title={proposal.title || "Proposal Details"}
          subtitle={`For Inquiry ${inquiry?.inquiry_number || "Unknown"}`}
        />
      </div>

      <ProposalVersionTabs 
         proposal={proposal} 
         versions={proposal.itinerary_versions || []} 
         inquiry={inquiry} 
      />
    </AppLayout>
  );
}
