"use client";

import { useState } from "react";
import { IndividualInquiryForm } from "./IndividualInquiryForm";
import { GroupInquiryForm } from "./GroupInquiryForm";

type InquiryType = "individual" | "group";

export default function PublicInquiryPage() {
  const [inquiryType, setInquiryType] = useState<InquiryType>("individual");

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-surface-100">
      {/* Header */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold">TX</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-surface-900">TravX</h1>
              <p className="text-xs text-surface-500">Travel Inquiry Form</p>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-surface-900 mb-2">
            Plan Your Perfect Trip
          </h2>
          <p className="text-surface-600 mb-6">
            Fill out the form below and our travel experts will create a customized itinerary for you.
          </p>

          {/* Toggle Switch */}
          <div className="inline-flex items-center bg-surface-100 rounded-xl p-1.5">
            <button
              type="button"
              onClick={() => setInquiryType("individual")}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                inquiryType === "individual"
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-surface-600 hover:text-surface-900"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Individual
              </span>
            </button>
            <button
              type="button"
              onClick={() => setInquiryType("group")}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                inquiryType === "group"
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-surface-600 hover:text-surface-900"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Group
              </span>
            </button>
          </div>

          <p className="text-xs text-surface-500 mt-3">
            {inquiryType === "individual" 
              ? "For solo travelers, couples, or families"
              : "For groups of 5 or more travelers"
            }
          </p>
        </div>

        {/* Render the appropriate form */}
        {inquiryType === "individual" ? (
          <IndividualInquiryForm />
        ) : (
          <GroupInquiryForm />
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-surface-500">
          <p>Need help? Contact us at support@travx.com</p>
        </footer>
      </main>
    </div>
  );
}
