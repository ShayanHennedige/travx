"use client";

import { useState, useEffect, Suspense } from "react";
import { Button, Input, Badge } from "@/components/ui";
import { feedbackSchema, getRatingLabel } from "@/lib/validations/feedback";
import { useRouter, useSearchParams } from "next/navigation";

const countries = [
  "Australia", "Canada", "France", "Germany", "India", "Japan", "Singapore",
  "South Korea", "Sri Lanka", "Thailand", "UK", "USA", "Other"
];

export default function FeedbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-surface-100 flex items-center justify-center">
        <div className="card p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-surface-600">Loading...</p>
        </div>
      </div>
    }>
      <FeedbackContent />
    </Suspense>
  );
}

function FeedbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingPrefill, setIsLoadingPrefill] = useState(false);
  const [tourReference, setTourReference] = useState("");  // Changed from email to tour reference
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);

  const [formData, setFormData] = useState({
    guest_name: "",
    guest_email: "",
    country: "",
    inquiry_id: "",
    itinerary_id: "",
    tour_id: "",
    group_inquiry_id: "",
    token_id: "",
    driver_id: "",
    airport_welcome_score: null as number | null,
    hotel_quality_scores: {} as Record<string, number>,
    driver_language_score: null as number | null,
    driver_appearance_score: null as number | null,
    driver_hospitality_score: null as number | null,
    driver_helpfulness_score: null as number | null,
    vehicle_quality_score: null as number | null,
    vehicle_cleanliness_score: null as number | null,
    vehicle_comfort_score: null as number | null,
    overall_experience_score: null as number | null,
    remarks: "",
  });
  const [isFromToken, setIsFromToken] = useState(false);
  const [driverInfo, setDriverInfo] = useState<{ name: string; vehicle_type: string | null; vehicle_number: string | null } | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<{ type: string | null; number: string | null } | null>(null);

  // Function to fetch data by tour reference
  const fetchDataByReference = async (refNumber: string) => {
    if (!refNumber || !refNumber.trim()) {
      return;
    }

    setIsLoadingLookup(true);
    setErrors({});

    try {
      const response = await fetch(`/api/feedback/prefill?reference=${encodeURIComponent(refNumber.trim())}`);

      if (!response.ok) {
        const error = await response.json();
        setErrors({ tourReference: error.error || "Could not find booking with this reference number" });
        setIsLoadingLookup(false);
        return;
      }

      const data = await response.json();
      console.log("Prefill data received:", data);

      if (!data || (!data.customer && !data.hotels)) {
        setErrors({ tourReference: "No active tours found for this reference number" });
        setIsLoadingLookup(false);
        return;
      }

      // Prepare hotel scores
      const hotelScores: Record<string, number> = {};
      if (data.hotels && Array.isArray(data.hotels) && data.hotels.length > 0) {
        data.hotels.forEach((hotel: string) => {
          if (hotel && hotel.trim()) {
            hotelScores[hotel.trim()] = 0;
          }
        });
      }

      // Set driver and vehicle info
      if (data.driver) {
        console.log("Setting driver info into state:", data.driver);
        setDriverInfo({
          name: data.driver.name || "",
          vehicle_type: data.driver.vehicle_type || null,
          vehicle_number: data.driver.vehicle_number || null,
        });
      } else {
        console.warn("API returned null for driver");
      }

      if (data.vehicle) {
        console.log("Setting vehicle info into state:", data.vehicle);
        setVehicleInfo({
          type: data.vehicle.type || null,
          number: data.vehicle.number || null,
        });
      }

      // Extract customer data - handle both individual and group inquiries
      let customerName = "";
      let customerEmail = "";
      let customerCountry = "";

      if (data.customer) {
        // Extract name
        if (data.customer.name) {
          customerName = data.customer.name;
        } else if (data.customer.first_name || data.customer.last_name) {
          customerName = `${data.customer.first_name || ""} ${data.customer.last_name || ""}`.trim();
        }

        // Extract email
        customerEmail = data.customer.email || data.customer.client_email || "";

        // Extract country
        customerCountry = data.customer.country || "";
      }

      console.log("Extracted customer data:", {
        customerName,
        customerEmail,
        customerCountry,
        hasCustomer: !!data.customer
      });

      // Update all form data
      setFormData((prev) => {
        const updated = {
          ...prev,
          inquiry_id: data.inquiry_id || data.customer?.inquiry_id || prev.inquiry_id || "",
          group_inquiry_id: data.group_inquiry_id || data.customer?.group_inquiry_id || prev.group_inquiry_id || "",
          itinerary_id: data.itinerary_id || prev.itinerary_id || "",
          tour_id: data.tour_id || prev.tour_id || "",
          token_id: data.token_id || prev.token_id || "",
          driver_id: data.driver_id || data.driver?.id || prev.driver_id || "",
          // Update customer fields if customer data exists
          guest_name: customerName || prev.guest_name,
          guest_email: customerEmail || prev.guest_email,
          country: customerCountry || prev.country,
          hotel_quality_scores: Object.keys(hotelScores).length > 0 ? hotelScores : prev.hotel_quality_scores,
        };
        return updated;
      });

      setIsFromToken(false); // Not from token, so fields are editable
      setDataLoaded(true);
    } catch (error: any) {
      console.error("Error loading prefill data:", error);
      setErrors({ tourReference: error.message || "Failed to load form data" });
      setDataLoaded(false);
    } finally {
      setIsLoadingLookup(false);
    }
  };

  // Handler for reference input change
  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTourReference(e.target.value);
    setErrors({ ...errors, tourReference: "" });
    setDataLoaded(false);
  };

  const handleLookupSubmit = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    await fetchDataByReference(tourReference);
  };

  const handleSliderChange = (field: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleHotelScoreChange = (hotelName: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      hotel_quality_scores: {
        ...prev.hotel_quality_scores,
        [hotelName]: value,
      },
    }));
  };

  const addHotelField = () => {
    const hotelName = prompt("Enter hotel name:");
    if (hotelName && hotelName.trim()) {
      setFormData((prev) => ({
        ...prev,
        hotel_quality_scores: {
          ...prev.hotel_quality_scores,
          [hotelName.trim()]: 0,
        },
      }));
    }
  };

  // Auto-load data from URL parameters on mount
  useEffect(() => {
    // Prevent multiple auto-loads
    if (hasAutoLoaded) {
      return;
    }

    // Try both searchParams and window.location as fallback
    const refParamFromSearch = searchParams.get("ref");
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const refParamFromUrl = urlParams?.get("ref");
    const refParam = refParamFromSearch || refParamFromUrl;

    console.log("URL params check - refParam from searchParams:", refParamFromSearch);
    console.log("URL params check - refParam from URL:", refParamFromUrl);
    console.log("Using refParam:", refParam);
    console.log("All searchParams:", typeof window !== "undefined" ? Object.fromEntries(new URLSearchParams(window.location.search).entries()) : "N/A");

    // Check for email parameter first (legacy ref param support removed or could be repurposed)
    const emailParam = searchParams.get("email");
    if (emailParam && emailParam.trim()) {
      console.log("Found email param, loading data for:", emailParam.trim());
      setHasAutoLoaded(true);
      setTourReference(emailParam.trim());
      setIsLoadingPrefill(true);

      // Use async IIFE to handle the async function
      (async () => {
        try {
          await fetchDataByReference(emailParam.trim());  // Still checking for 'email' param for backwards compatibility
        } catch (error) {
          console.error("Error loading data from email:", error);
        } finally {
          setIsLoadingPrefill(false);
        }
      })();
      return;
    }

    // Check for token or other prefill parameters
    const token = searchParams.get("token");
    const inquiryId = searchParams.get("inquiry_id");
    const groupInquiryId = searchParams.get("group_inquiry_id");
    const itineraryId = searchParams.get("itinerary_id");
    const tourId = searchParams.get("tour_id");

    if (token || inquiryId || groupInquiryId || itineraryId || tourId) {
      setIsLoadingPrefill(true);
      // Build query string for prefill API
      const params = new URLSearchParams();
      if (token) params.append("token", token);
      if (inquiryId) params.append("inquiry_id", inquiryId);
      if (groupInquiryId) params.append("group_inquiry_id", groupInquiryId);
      if (itineraryId) params.append("itinerary_id", itineraryId);
      if (tourId) params.append("tour_id", tourId);

      fetch(`/api/feedback/prefill?${params.toString()}`)
        .then(async (response) => {
          if (!response.ok) {
            setIsLoadingPrefill(false);
            return;
          }
          const data = await response.json();

          // Process the data similar to fetchDataByReference
          if (data && (data.customer || data.hotels)) {
            // Prepare hotel scores
            const hotelScores: Record<string, number> = {};
            if (data.hotels && Array.isArray(data.hotels) && data.hotels.length > 0) {
              data.hotels.forEach((hotel: string) => {
                if (hotel && hotel.trim()) {
                  hotelScores[hotel.trim()] = 0;
                }
              });
            }

            // Set driver and vehicle info
            if (data.driver) {
              console.log("Setting driver info:", data.driver);
              setDriverInfo({
                name: data.driver.name || "",
                vehicle_type: data.driver.vehicle_type || null,
                vehicle_number: data.driver.vehicle_number || null,
              });
            }
            if (data.vehicle) {
              console.log("Setting vehicle info:", data.vehicle);
              setVehicleInfo({
                type: data.vehicle.type || null,
                number: data.vehicle.number || null,
              });
            }

            // Extract customer data
            let customerName = "";
            let customerEmail = "";
            let customerCountry = "";

            if (data.customer) {
              if (data.customer.name) {
                customerName = data.customer.name;
              } else if (data.customer.first_name || data.customer.last_name) {
                customerName = `${data.customer.first_name || ""} ${data.customer.last_name || ""}`.trim();
              }

              customerEmail = data.customer.email || data.customer.client_email || "";
              customerCountry = data.customer.country || "";
            }

            // Update form data
            setFormData((prev) => ({
              ...prev,
              inquiry_id: data.inquiry_id || data.customer?.inquiry_id || prev.inquiry_id || "",
              group_inquiry_id: data.group_inquiry_id || data.customer?.group_inquiry_id || prev.group_inquiry_id || "",
              itinerary_id: data.itinerary_id || prev.itinerary_id || "",
              tour_id: data.tour_id || prev.tour_id || "",
              token_id: data.token_id || prev.token_id || "",
              driver_id: data.driver_id || data.driver?.id || prev.driver_id || "",
              guest_name: customerName || prev.guest_name,
              guest_email: customerEmail || prev.guest_email,
              country: customerCountry || prev.country,
              hotel_quality_scores: Object.keys(hotelScores).length > 0 ? hotelScores : prev.hotel_quality_scores,
            }));

            setIsFromToken(!!token);
            setDataLoaded(true);
          }
        })
        .catch((error) => {
          console.error("Error loading prefill data:", error);
        })
        .finally(() => {
          setIsLoadingPrefill(false);
        });
    } else {
      setIsLoadingPrefill(false);
    }
  }, [searchParams, hasAutoLoaded]); // Run when searchParams change, but only once

  // Debug: Log formData changes for guest info
  useEffect(() => {
    console.log("formData guest info changed:", {
      guest_name: formData.guest_name,
      guest_email: formData.guest_email,
      country: formData.country
    });
  }, [formData.guest_name, formData.guest_email, formData.country]);

  const removeHotel = (hotelName: string) => {
    setFormData((prev) => {
      const newScores = { ...prev.hotel_quality_scores };
      delete newScores[hotelName];
      return {
        ...prev,
        hotel_quality_scores: newScores,
      };
    });
  };

  const RatingSelector = ({
    label,
    value,
    onChange
  }: {
    label: string;
    value: number | null;
    onChange: (value: number) => void;
  }) => {
    const ratingOptions = [
      { label: "Poor", score: 25, color: "bg-accent-500/10 border-accent-500/40 text-accent-600 hover:bg-accent-500/20" },
      { label: "Average", score: 60, color: "bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100" },
      { label: "Good", score: 80, color: "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100" },
      { label: "Excellent", score: 100, color: "bg-green-50 border-green-300 text-green-700 hover:bg-green-100" },
    ];

    // Determine which option is selected based on value
    const getSelectedOption = () => {
      if (value === null || value === 0) return null;
      if (value < 50) return 25;
      if (value < 70) return 60;
      if (value < 90) return 80;
      return 100;
    };

    const selectedScore = getSelectedOption();

    return (
      <div className="space-y-4">
        {label && <label className="block text-sm font-semibold text-surface-900">{label}</label>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ratingOptions.map((option) => {
            const isSelected = selectedScore === option.score;

            return (
              <button
                key={option.score}
                type="button"
                onClick={() => onChange(option.score)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 gap-2 ${isSelected
                  ? `border-primary-500 bg-primary-50 text-primary-900 shadow-md transform scale-[1.02]`
                  : "border-surface-200 bg-white text-surface-600 hover:border-primary-200 hover:bg-surface-50"
                  }`}
              >
                <div className={`w-3 h-3 rounded-full ${isSelected ? "bg-primary-500 animate-pulse" : "bg-surface-200"}`} />
                <span className="font-semibold text-xs uppercase tracking-wider">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.guest_name.trim()) {
        setErrors({ guest_name: "Name is required" });
        setIsSubmitting(false);
        return;
      }


      // Validate all required ratings
      const requiredRatings = [
        { key: "airport_welcome_score", label: "Airport Welcome" },
        { key: "driver_language_score", label: "Driver - Language" },
        { key: "driver_appearance_score", label: "Driver - Appearance" },
        { key: "driver_hospitality_score", label: "Driver - Hospitality" },
        { key: "driver_helpfulness_score", label: "Driver - Helpfulness" },
        { key: "vehicle_quality_score", label: "Vehicle - Quality" },
        { key: "vehicle_cleanliness_score", label: "Vehicle - Cleanliness" },
        { key: "vehicle_comfort_score", label: "Vehicle - Comfort" },
        { key: "overall_experience_score", label: "Overall Tour Experience" },
      ];

      const missingRatings: string[] = [];
      requiredRatings.forEach(({ key, label }) => {
        if (!formData[key as keyof typeof formData] || formData[key as keyof typeof formData] === null) {
          missingRatings.push(label);
        }
      });

      // Validate hotel ratings
      const hotelNames = Object.keys(formData.hotel_quality_scores);
      hotelNames.forEach((hotel) => {
        if (!formData.hotel_quality_scores[hotel] || formData.hotel_quality_scores[hotel] === 0) {
          missingRatings.push(`Hotel - ${hotel}`);
        }
      });

      if (missingRatings.length > 0) {
        setErrors({ submit: `Please rate: ${missingRatings.join(", ")}` });
        setIsSubmitting(false);
        return;
      }

      const payload = {
        ...formData,
        inquiry_id: formData.inquiry_id || null,
        group_inquiry_id: formData.group_inquiry_id || null,
        itinerary_id: formData.itinerary_id || null,
        tour_id: formData.tour_id || null,
        token_id: formData.token_id || null,
        driver_id: formData.driver_id || null,
        country: formData.country || null,
        remarks: formData.remarks || null,
      };

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit feedback");
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        router.push("/feedback?success=true");
      }, 2000);
    } catch (error: any) {
      console.error("Submission error:", error);
      setErrors({ submit: error.message || "Failed to submit feedback" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-surface-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-surface-900 mb-2">Thank You!</h2>
          <p className="text-surface-600">Your feedback has been submitted successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-surface-100">
      {/* Header */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/Serendia.png"
              alt="TraveX Logo"
              className="h-12 w-auto object-contain"
            />
            <div>
              <h1 className="text-lg font-semibold text-surface-900">TraveX</h1>
              <p className="text-xs text-surface-500">Customer Feedback Form</p>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-12 text-center animate-fade-in text-balance">
          <Badge className="mb-4 bg-primary-100 text-primary-700 hover:bg-primary-100 border-none px-4 py-1">Guest Feedback</Badge>
          <h2 className="text-4xl md:text-5xl font-black text-surface-900 mb-4 tracking-tight">
            Share Your Experience
          </h2>
          <p className="text-lg text-surface-600 max-w-2xl mx-auto">
            Your insights help us craft even better journeys. Tell us about your recent trip with <span className="text-primary-600 font-bold">TraveX</span>.
          </p>
        </div>

        {isLoadingPrefill ? (
          <div className="card p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <p className="text-surface-600">Loading your information...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-12 animate-slide-up">
            <div className="space-y-12">
              {/* Find Your Booking section removed - data auto-fills via token */}

              <div className="grid grid-cols-1 gap-12">
                {/* Guest Info */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-surface-200 pb-4">
                    <h3 className="text-2xl font-bold text-surface-900">1. Guest Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-8 rounded-2xl border border-surface-200 shadow-sm">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">
                        Name <span className="text-accent-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={formData.guest_name}
                        onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                        required
                        error={errors.guest_name}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">
                        Country
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. United Kingdom"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="h-12 text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* Airport Welcome */}
                <div>
                  <RatingSelector
                    label="Overall Airport Welcome Experience"
                    value={formData.airport_welcome_score}
                    onChange={(value) => handleSliderChange("airport_welcome_score", value)}
                  />
                </div>

                {/* Hotel Quality */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-surface-200 pb-4">
                    <h3 className="text-2xl font-bold text-surface-900">2. Accommodation Quality</h3>
                    <Button type="button" variant="secondary" size="sm" onClick={addHotelField} className="rounded-full px-4">
                      + Add Hotel
                    </Button>
                  </div>

                  {Object.keys(formData.hotel_quality_scores).length === 0 ? (
                    <div className="p-12 border-2 border-dashed border-surface-200 rounded-2xl text-center bg-surface-50">
                      <p className="text-surface-500 font-medium">
                        No hotels found. Click "+ Add Hotel" if you'd like to rate your stays.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {Object.keys(formData.hotel_quality_scores).map((hotelName) => (
                        <div key={hotelName} className="bg-white p-6 rounded-2xl border border-surface-200 shadow-sm transition-all hover:border-primary-200">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                              <label className="text-lg font-bold text-surface-900">{hotelName}</label>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeHotel(hotelName)}
                              className="text-surface-400 hover:text-accent-500 transition-colors p-2"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <RatingSelector
                            label=""
                            value={formData.hotel_quality_scores[hotelName]}
                            onChange={(value) => handleHotelScoreChange(hotelName, value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Driver & Vehicle */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Driver */}
                  <div className="space-y-6">
                    <div className="border-b border-surface-200 pb-4">
                      <h3 className="text-2xl font-bold text-surface-900">3. Driver Rating</h3>
                    </div>

                    {driverInfo && (
                      <div className="bg-primary-50 p-4 rounded-xl border border-primary-100 flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-xl">
                          {driverInfo.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs text-primary-600 font-bold uppercase tracking-wider">Your Driver</p>
                          <p className="text-surface-900 font-bold">{driverInfo.name}</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-8 bg-white p-8 rounded-2xl border border-surface-200 shadow-sm">
                      <RatingSelector
                        label="Language Proficiency"
                        value={formData.driver_language_score}
                        onChange={(value) => handleSliderChange("driver_language_score", value)}
                      />
                      <RatingSelector
                        label="Professional Appearance"
                        value={formData.driver_appearance_score}
                        onChange={(value) => handleSliderChange("driver_appearance_score", value)}
                      />
                      <RatingSelector
                        label="Hospitality & Courtesy"
                        value={formData.driver_hospitality_score}
                        onChange={(value) => handleSliderChange("driver_hospitality_score", value)}
                      />
                      <RatingSelector
                        label="Helpfulness with Baggage/Info"
                        value={formData.driver_helpfulness_score}
                        onChange={(value) => handleSliderChange("driver_helpfulness_score", value)}
                      />
                    </div>
                  </div>

                  {/* Vehicle */}
                  <div className="space-y-6">
                    <div className="border-b border-surface-200 pb-4">
                      <h3 className="text-2xl font-bold text-surface-900">4. Vehicle Rating</h3>
                    </div>

                    {(vehicleInfo || driverInfo?.vehicle_type) && (
                      <div className="bg-surface-100 p-4 rounded-xl border border-surface-200 flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-surface-200 flex items-center justify-center text-surface-600">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-surface-500 font-bold uppercase tracking-wider">Your Vehicle</p>
                          <p className="text-surface-900 font-bold">
                            {(vehicleInfo?.type || driverInfo?.vehicle_type) || "Standard Vehicle"}
                            {(vehicleInfo?.number || driverInfo?.vehicle_number) && (
                              <span className="text-surface-400 font-normal ml-2">
                                • {vehicleInfo?.number || driverInfo?.vehicle_number}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-8 bg-white p-8 rounded-2xl border border-surface-200 shadow-sm">
                      <RatingSelector
                        label="Vehicle Overall Quality"
                        value={formData.vehicle_quality_score}
                        onChange={(value) => handleSliderChange("vehicle_quality_score", value)}
                      />
                      <RatingSelector
                        label="Cleanliness (Interior/Exterior)"
                        value={formData.vehicle_cleanliness_score}
                        onChange={(value) => handleSliderChange("vehicle_cleanliness_score", value)}
                      />
                      <RatingSelector
                        label="Comfort & Ride Quality"
                        value={formData.vehicle_comfort_score}
                        onChange={(value) => handleSliderChange("vehicle_comfort_score", value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Final Thoughts */}
                <div className="space-y-8 pt-8 border-t border-surface-200">
                  <div className="bg-surface-900 text-white p-10 rounded-3xl shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -mr-32 -mt-32" />

                    <div className="relative z-10 space-y-8">
                      <div className="text-center space-y-2">
                        <h3 className="text-3xl font-black italic">The TraveX Experience</h3>
                        <p className="text-surface-400">How would you rate your overall journey with us?</p>
                      </div>

                      <div className="max-w-2xl mx-auto">
                        <RatingSelector
                          label=""
                          value={formData.overall_experience_score}
                          onChange={(value) => handleSliderChange("overall_experience_score", value)}
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-surface-300">
                          Additional Remarks (Optional)
                        </label>
                        <textarea
                          value={formData.remarks}
                          onChange={(e) => {
                            if (e.target.value.length <= 800) {
                              setFormData({ ...formData, remarks: e.target.value });
                            }
                          }}
                          rows={4}
                          className="w-full px-6 py-4 bg-surface-800 border border-surface-700 rounded-2xl text-white placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none"
                          placeholder="Is there anything else you'd like to share about your trip?"
                        />
                        <p className="text-right text-xs text-surface-500">
                          {formData.remarks.length}/800 characters
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Error Message */}
                  {errors.submit && (
                    <div className="p-4 bg-accent-500/10 border border-accent-500/30 rounded-2xl text-accent-600 text-sm font-medium flex items-center gap-3 animate-shake">
                      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {errors.submit}
                    </div>
                  )}

                  {/* Submit Action */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-surface-50 p-6 rounded-2xl border border-surface-200">
                    <p className="text-sm text-surface-500">
                      Your feedback is anonymous and helps us improve our services.
                    </p>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      loading={isSubmitting}
                      className="w-full sm:w-auto px-12 h-14 text-lg font-bold btn-primary shadow-lg shadow-primary-500/20 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Submit My Feedback
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
