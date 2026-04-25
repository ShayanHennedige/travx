"use client";

import { useState } from "react";
import Image from "next/image";
import { IndividualInquiryForm } from "./IndividualInquiryForm";
import { GroupInquiryForm } from "./GroupInquiryForm";

type InquiryType = "individual" | "group";

export default function PublicInquiryPage() {
  const [inquiryType, setInquiryType] = useState<InquiryType>("individual");

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 transition-all duration-300">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="relative w-40 h-14">
            <Image
              src="/Serendia.png"
              alt="TravX"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              Official Inquiry Form
            </p>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10 text-center space-y-4">
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight">
            Plan Your Perfect Trip
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Tell us about your dream vacation, and our experts will craft a personalized itinerary just for you.
          </p>

          {/* Toggle Switch */}
          <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm mt-6">
            <button
              type="button"
              onClick={() => setInquiryType("individual")}
              className={`px-8 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${inquiryType === "individual"
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
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
              className={`px-8 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${inquiryType === "group"
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
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

          <p className="text-xs text-slate-500 font-medium">
            {inquiryType === "individual"
              ? "For solo travelers, couples, or families"
              : "For groups of 5 or more travelers"
            }
          </p>
        </div>

        {/* Render the appropriate form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-1">
          {inquiryType === "individual" ? (
            <IndividualInquiryForm />
          ) : (
            <GroupInquiryForm />
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center border-t border-slate-200 pt-8 pb-4">
          <p className="text-sm text-slate-500 mb-2">Need assistance?</p>
          <a href="mailto:info@serendiaholidays.com" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
            info@serendiaholidays.com
          </a>
          <p className="text-xs text-slate-400 mt-8">
            &copy; {new Date().getFullYear()} TravX Travel Management. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}
