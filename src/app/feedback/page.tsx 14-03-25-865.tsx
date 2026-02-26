"use client";

import { useState, useEffect } from "react";
import { Button, Input } from "@/components/ui";
import { AnimatedSuccessCard } from "@/components/ui/FormSection";
import { feedbackSchema, getRatingLabel } from "@/lib/validations/feedback";
import { useRouter, useSearchParams } from "next/navigation";

const countries = [
  "Australia", "Canada", "France", "Germany", "India", "Japan", "Singapore",
  "South Korea", "Sri Lanka", "Thailand", "UK", "USA", "Other"
];

const ageGroups = [
  "Under 18", "18-25", "26-35", "36-45", "46-60", "60+"
];

export default function FeedbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingPrefill, setIsLoadingPrefill] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [isLoadingReference, setIsLoadingReference] = useState(false);
  const [referenceLoaded, setReferenceLoaded] = useState(false);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);

  const [formData, setFormData] = useState({
    guest_name: "",
    guest_email: "",
    country: "",
    age_group: "",
    inquiry_id: "",
    itinerary_id: "",
    tour_id: "",
    group_inquiry_id: "",
    token_id: "",
    driver_id: "",
    vehicle_id: "",
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

  // Function to fetch data by reference number
  const fetchDataByReference = async (refNumber: string) => {
    if (!refNumber || !refNumber.trim()) {
      return;
    }

    setIsLoadingReference(true);
    setErrors({});

    try {
      const response = await fetch(`/api/feedback/prefill?reference=${encodeURIComponent(refNumber.trim())}`);
      
      if (!response.ok) {
        const error = await response.json();
        setErrors({ reference: error.error || "Could not find inquiry with this reference number" });
        setIsLoadingReference(false);
        return;
      }

      const data = await response.json();
      console.log("Prefill data received:", data);

      if (!data || (!data.customer && !data.hotels)) {
        setErrors({ reference: "No data found for this reference number" });
        setIsLoadingReference(false);
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
        setDriverInfo({
          name: data.driver.name || "",
          vehicle_type: data.driver.vehicle_type || null,
          vehicle_number: data.driver.vehicle_number || null,
        });
      }
      if (data.vehicle) {
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

      console.log("Raw API response:", JSON.stringify(data, null, 2));
      console.log("Extracted customer data:", { 
        customerName, 
        customerEmail, 
        customerCountry,
        customer: data.customer,
        hasCustomer: !!data.customer 
      });

      // Update all form data - if customer data exists, use it; otherwise keep previous
      setFormData((prev) => {
        const updated = {
          ...prev,
          inquiry_id: data.inquiry_id || data.customer?.inquiry_id || prev.inquiry_id || "",
          group_inquiry_id: data.group_inquiry_id || data.customer?.group_inquiry_id || prev.group_inquiry_id || "",
          itinerary_id: data.itinerary_id || prev.itinerary_id || "",
          tour_id: data.tour_id || prev.tour_id || "",
          token_id: data.token_id || prev.token_id || "",
          driver_id: data.driver?.id || prev.driver_id || "",
          vehicle_id: prev.vehicle_id || "",
          // Update customer fields if customer data exists
          guest_name: data.customer ? customerName : prev.guest_name,
          guest_email: data.customer ? customerEmail : prev.guest_email,
          country: data.customer ? customerCountry : prev.country,
          hotel_quality_scores: Object.keys(hotelScores).length > 0 ? hotelScores : prev.hotel_quality_scores,
        };
        console.log("Setting formData:", {
          guest_name: updated.guest_name,
          guest_email: updated.guest_email,
          country: updated.country,
          hasCustomerData: !!data.customer,
          customerName,
          customerEmail,
          customerCountry
        });
        return updated;
      });
      
      setIsFromToken(false); // Not from token, so fields are editable
      setReferenceLoaded(true);
      
      console.log("Form data updated with:", {
        name: customerName,
        email: customerEmail,
        country: data.customer?.country,
        hotels: Object.keys(hotelScores),
      });
    } catch (error: any) {
      console.error("Error loading prefill data:", error);
      setErrors({ reference: error.message || "Failed to load form data" });
      setReferenceLoaded(false);
    } finally {
      setIsLoadingReference(false);
    }
  };

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReferenceNumber(e.target.value);
    setErrors({ ...errors, reference: "" });
    setReferenceLoaded(false);
  };

  const handleReferenceSubmit = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    await fetchDataByReference(referenceNumber);
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
    
    // Check for reference number parameter first
    if (refParam && refParam.trim()) {
      console.log("Found ref param, loading data for:", refParam.trim());
      setHasAutoLoaded(true);
      setReferenceNumber(refParam.trim());
      setIsLoadingPrefill(true);
      
      // Use async IIFE to handle the async function
      (async () => {
        try {
          await fetchDataByReference(refParam.trim());
        } catch (error) {
          console.error("Error loading data from reference:", error);
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
              setDriverInfo({
                name: data.driver.name || "",
                vehicle_type: data.driver.vehicle_type || null,
                vehicle_number: data.driver.vehicle_number || null,
              });
            }
            if (data.vehicle) {
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
              driver_id: data.driver?.id || prev.driver_id || "",
              vehicle_id: prev.vehicle_id || "",
              guest_name: data.customer ? customerName : prev.guest_name,
              guest_email: data.customer ? customerEmail : prev.guest_email,
              country: data.customer ? customerCountry : prev.country,
              hotel_quality_scores: Object.keys(hotelScores).length > 0 ? hotelScores : prev.hotel_quality_scores,
            }));
            
            setIsFromToken(!!token);
            setReferenceLoaded(true);
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
      { label: "Poor", score: 25, color: "bg-red-900/50 light:bg-red-50 border-red-600 light:border-red-200 text-red-300 light:text-red-700 hover:bg-red-900/70 light:hover:bg-red-100" },
      { label: "Average", score: 60, color: "bg-orange-900/50 light:bg-orange-50 border-orange-600 light:border-orange-200 text-orange-300 light:text-orange-700 hover:bg-orange-900/70 light:hover:bg-orange-100" },
      { label: "Good", score: 80, color: "bg-primary-900/50 light:bg-primary-50 border-primary-600 light:border-primary-200 text-primary-300 light:text-primary-700 hover:bg-primary-900/70 light:hover:bg-primary-100" },
      { label: "Excellent", score: 100, color: "bg-green-900/50 light:bg-green-50 border-green-600 light:border-green-200 text-green-300 light:text-green-700 hover:bg-green-900/70 light:hover:bg-green-100" },
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
      <div className="space-y-3">
        {label && <label className="block text-sm font-medium text-surface-300 mb-3">{label}</label>}
        <div className="flex gap-2">
          {ratingOptions.map((option) => {
            const isSelected = selectedScore === option.score;
            
            return (
              <button
                key={option.score}
                type="button"
                onClick={() => onChange(option.score)}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all font-medium text-sm ${
                  isSelected 
                    ? `${option.color} border-current shadow-sm` 
                    : "bg-surface-800 light:bg-white border-surface-600 light:border-surface-300 text-surface-400 light:text-surface-600 hover:bg-surface-700 light:hover:bg-surface-100 hover:border-surface-500 light:hover:border-surface-400 hover:text-surface-300 light:hover:text-surface-900"
                }`}
              >
                {option.label}
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
      if (!formData.guest_email.trim()) {
        setErrors({ guest_email: "Email is required" });
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
        age_group: formData.age_group || null,
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
      <div className="min-h-screen bg-surface-900 light:bg-surface-100 flex items-center justify-center">
        <AnimatedSuccessCard className="max-w-md w-full card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-900/50 light:bg-green-100 border border-green-700 light:border-green-200 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400 light:text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-surface-100 light:text-surface-900 mb-2">Thank You!</h2>
          <p className="text-surface-300 light:text-surface-600">Your feedback has been submitted successfully.</p>
        </AnimatedSuccessCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-900 light:bg-surface-100">
      {/* Header */}
      <header className="bg-surface-800 light:bg-white border-b border-surface-600 light:border-surface-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold">TX</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-surface-100 light:text-surface-900">TravX</h1>
              <p className="text-xs text-surface-400 light:text-surface-500">Customer Feedback Form</p>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-surface-100 light:text-surface-900 mb-2">
            Share Your Experience
          </h2>
          <p className="text-surface-300">
            Help us improve by sharing your feedback about your trip with TravX.
          </p>
        </div>

        {isLoadingPrefill ? (
          <div className="card p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-surface-600 border-t-primary-500 rounded-full animate-spin" />
            <p className="text-surface-300">Loading your information...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-8 space-y-8">
            {/* Reference Number Input */}
            <div>
              <h3 className="text-lg font-semibold text-surface-100 light:text-surface-900 mb-4">Enter Your Reference Number</h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Enter your inquiry reference number (e.g., INQ-20260115-0001 or GRP-20260115-0001)"
                    value={referenceNumber}
                    onChange={handleReferenceChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && referenceNumber.trim() && !isLoadingReference) {
                        e.preventDefault();
                        fetchDataByReference(referenceNumber);
                      }
                    }}
                    error={errors.reference}
                    disabled={isLoadingReference}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleReferenceSubmit}
                  disabled={isLoadingReference || !referenceNumber.trim()}
                  loading={isLoadingReference}
                >
                  Load Details
                </Button>
              </div>
              {referenceLoaded && !errors.reference && (
                <div className="mt-3 p-3 bg-green-900/30 light:bg-green-50 border border-green-700 light:border-green-200 rounded-lg">
                  <p className="text-sm text-green-300 light:text-green-700">
                    ✓ Booking details loaded successfully! Please review the information below and complete your feedback.
                  </p>
                </div>
              )}
            </div>

            {/* Guest Info */}
            <div>
              <h3 className="text-lg font-semibold text-surface-100 light:text-surface-900 mb-4">Guest Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Name <span className="text-red-500">*</span>
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
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={formData.guest_email}
                  onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                  required
                  error={errors.guest_email}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Country
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-600 light:border-surface-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-surface-800 light:bg-white text-surface-100 light:text-surface-900 text-sm"
                >
                  <option value="">Select Country</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Age Group
                </label>
                <select
                  value={formData.age_group}
                  onChange={(e) => setFormData({ ...formData, age_group: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-600 light:border-surface-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-surface-800 light:bg-white text-surface-100 light:text-surface-900 text-sm"
                >
                  <option value="">Select Age Group</option>
                  {ageGroups.map((age) => (
                    <option key={age} value={age}>{age}</option>
                  ))}
                </select>
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
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-surface-100 light:text-surface-900">Hotel Quality</h3>
              <Button type="button" variant="secondary" size="sm" onClick={addHotelField}>
                + Add Hotel
              </Button>
            </div>
            {Object.keys(formData.hotel_quality_scores).length === 0 ? (
              <div className="flex items-center justify-between p-3 bg-surface-800 light:bg-surface-50 rounded-lg border border-surface-600 light:border-surface-300">
                <p className="text-sm text-surface-400">
                  Click "+ Add Hotel" to rate hotels
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.keys(formData.hotel_quality_scores).map((hotelName) => (
                  <div key={hotelName} className="p-4 bg-surface-800 light:bg-surface-50 rounded-lg border border-surface-600 light:border-surface-300">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-surface-300">{hotelName}</label>
                      <button
                        type="button"
                        onClick={() => removeHotel(hotelName)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
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

          {/* Driver */}
          <div>
            <h3 className="text-lg font-semibold text-surface-100 light:text-surface-900 mb-4">Driver</h3>
            {driverInfo && (
              <div className="mb-4 p-3 bg-surface-800 light:bg-surface-50 rounded-lg border border-surface-600 light:border-surface-300">
                <p className="text-sm text-surface-300">
                  <span className="font-medium">Driver:</span> {driverInfo.name}
                  {driverInfo.vehicle_type && (
                    <span className="text-surface-500 ml-2">
                      ({driverInfo.vehicle_type}{driverInfo.vehicle_number ? ` • ${driverInfo.vehicle_number}` : ""})
                    </span>
                  )}
                </p>
              </div>
            )}
            <div className="space-y-6">
              <RatingSelector
                label="Language"
                value={formData.driver_language_score}
                onChange={(value) => handleSliderChange("driver_language_score", value)}
              />
              <RatingSelector
                label="Appearance"
                value={formData.driver_appearance_score}
                onChange={(value) => handleSliderChange("driver_appearance_score", value)}
              />
              <RatingSelector
                label="Hospitality"
                value={formData.driver_hospitality_score}
                onChange={(value) => handleSliderChange("driver_hospitality_score", value)}
              />
              <RatingSelector
                label="Helpfulness"
                value={formData.driver_helpfulness_score}
                onChange={(value) => handleSliderChange("driver_helpfulness_score", value)}
              />
            </div>
          </div>

          {/* Vehicle */}
          <div>
            <h3 className="text-lg font-semibold text-surface-100 light:text-surface-900 mb-4">Vehicle</h3>
            {(vehicleInfo || driverInfo?.vehicle_type) && (
              <div className="mb-4 p-3 bg-surface-800 light:bg-surface-50 rounded-lg border border-surface-600 light:border-surface-300">
                <p className="text-sm text-surface-300">
                  <span className="font-medium">Vehicle:</span>{" "}
                  {(vehicleInfo?.type || driverInfo?.vehicle_type) || "N/A"}
                  {(vehicleInfo?.number || driverInfo?.vehicle_number) && (
                    <span className="text-surface-500 ml-2">
                      • {vehicleInfo?.number || driverInfo?.vehicle_number}
                    </span>
                  )}
                </p>
              </div>
            )}
            <div className="space-y-6">
              <RatingSelector
                label="Quality"
                value={formData.vehicle_quality_score}
                onChange={(value) => handleSliderChange("vehicle_quality_score", value)}
              />
              <RatingSelector
                label="Cleanliness"
                value={formData.vehicle_cleanliness_score}
                onChange={(value) => handleSliderChange("vehicle_cleanliness_score", value)}
              />
              <RatingSelector
                label="Comfort"
                value={formData.vehicle_comfort_score}
                onChange={(value) => handleSliderChange("vehicle_comfort_score", value)}
              />
            </div>
          </div>

          {/* Overall Experience */}
          <div>
            <RatingSelector
              label="Overall Tour Experience"
              value={formData.overall_experience_score}
              onChange={(value) => handleSliderChange("overall_experience_score", value)}
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">
              Remarks (Optional, max 800 characters)
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => {
                if (e.target.value.length <= 800) {
                  setFormData({ ...formData, remarks: e.target.value });
                }
              }}
              rows={4}
              className="w-full px-3 py-2 border border-surface-600 light:border-surface-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none bg-surface-800 light:bg-white text-surface-100 light:text-surface-900 placeholder:text-surface-500 light:placeholder:text-surface-400"
              placeholder="Share any additional comments or suggestions..."
            />
            <p className="text-xs text-surface-400 mt-1">
              {formData.remarks.length}/800 characters
            </p>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-900/30 light:bg-red-50 border border-red-700 light:border-red-200 rounded-lg text-red-300 light:text-red-700 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-600 light:border-surface-200">
            <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>
              Submit Feedback
            </Button>
          </div>
        </form>
        )}
      </main>
    </div>
  );
}
