"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import Link from "next/link";
import { format } from "date-fns";

interface ProposalQuickActionsProps {
  inquiryId: string;
  existingProposals: any[]; // Array of proposals with itinerary_versions
}

// Multi-select tiers for AI generation
type TierOption = "Budget" | "Standard" | "Luxury";
const AVAILABLE_TIERS: TierOption[] = ["Budget", "Standard", "Luxury"];

export function ProposalQuickActions({ inquiryId, existingProposals }: ProposalQuickActionsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTiers, setSelectedTiers] = useState<TierOption[]>(["Standard"]);
  const router = useRouter();

  const handleToggleTier = (tier: TierOption) => {
    setSelectedTiers(prev => 
      prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier]
    );
  };

  const generateProposal = async () => {
    if (selectedTiers.length === 0) {
      setError("Please select at least one tier.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // 1. Create Proposal stub
      const propRes = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          inquiry_id: inquiryId, 
          title: `Proposal - ${selectedTiers.join(", ")}` 
        }),
      });
      const propData = await propRes.json();
      if (!propRes.ok) throw new Error(propData.error || "Failed to create proposal stub");

      const newProposalId = propData.proposal.id;

      // 2. Trigger parallel generation
      const genRes = await fetch(`/api/proposals/${newProposalId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version_labels: selectedTiers }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || "Failed to generate versions");

      // Redirect to the new proposal detail page
      router.push(`/proposals/${newProposalId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsGenerating(false);
    }
  };

  if (existingProposals && existingProposals.length > 0) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-surface-900">
              Generated Proposals
            </h2>
          </div>
        </div>

        <div className="space-y-4">
          {existingProposals.map((proposal) => (
            <div key={proposal.id} className="bg-gradient-to-r from-slate-50 to-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-900">{proposal.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                    <span>{format(new Date(proposal.created_at), "MMM d, yyyy")}</span>
                    <span className="capitalize">{proposal.status}</span>
                  </div>
                </div>
                <Link href={`/proposals/${proposal.id}`}>
                  <Button variant="secondary" size="sm">
                    View Proposal
                  </Button>
                </Link>
              </div>
              {proposal.itinerary_versions && proposal.itinerary_versions.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {proposal.itinerary_versions.map((ver: any) => (
                    <span key={ver.id} className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded-md font-medium border border-primary-100">
                      {ver.version_label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Generate another proposal */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Create New Proposal Variation</h3>
          <div className="flex items-center gap-2 mb-4">
            {AVAILABLE_TIERS.map(tier => (
              <label key={tier} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedTiers.includes(tier)}
                  onChange={() => handleToggleTier(tier)}
                  disabled={isGenerating}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                 {tier}
              </label>
            ))}
          </div>
          <Button
            onClick={generateProposal}
            disabled={isGenerating || selectedTiers.length === 0}
          >
            {isGenerating ? "Generating..." : "Generate New Proposal"}
          </Button>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  // No proposals exist - show generate UI
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-surface-900">
            Create Proposal
          </h2>
          <p className="text-sm text-surface-500">
            Parallel generate multiple itinerary options
          </p>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <label className="text-sm font-medium text-slate-700">Select Tiers to Generate:</label>
        <div className="flex flex-wrap gap-4 p-4 border border-slate-100 rounded-lg bg-slate-50">
          {AVAILABLE_TIERS.map(tier => (
             <label key={tier} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
               <input 
                 type="checkbox" 
                 checked={selectedTiers.includes(tier)}
                 onChange={() => handleToggleTier(tier)}
                 disabled={isGenerating}
                 className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
               />
                <span className="font-medium">{tier}</span>
             </label>
          ))}
        </div>
      </div>

      <Button
        onClick={generateProposal}
        disabled={isGenerating || selectedTiers.length === 0}
        className="w-full sm:w-auto"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating Multi-Tier Proposal...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Proposal
          </>
        )}
      </Button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 text-center">{error}</p>
        </div>
      )}
    </div>
  );
}
