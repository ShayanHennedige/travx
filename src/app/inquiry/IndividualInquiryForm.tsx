"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, RoomQuantitySelector } from "@/components/ui";
import {
  publicInquirySchema,
  countries,
  hotelTypes,
  roomCategories,
  activityOptions,
  mealPlans,
} from "@/lib/validations/inquiry";

const countryOptions = countries.map((country) => ({
  value: country,
  label: country,
}));

const hotelTypeOptions = hotelTypes.map((type) => ({
  value: type,
  label: type,
}));

const roomCategoryOptions = roomCategories.map((cat) => ({
  value: cat,
  label: cat,
}));

const mealPlanOptions = mealPlans.map((plan) => ({
  value: plan,
  label: plan,
}));

export function IndividualInquiryForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  // Room quantities state
  const [roomsDbl, setRoomsDbl] = useState(0);
  const [roomsSgl, setRoomsSgl] = useState(0);
  const [roomsTpl, setRoomsTpl] = useState(0);
  const [roomsQtpl, setRoomsQtpl] = useState(0);

  const [formData, setFormData] = useState({
    is_tour_agent: false,
    agent_name: "",
    agent_email: "",
    agent_company: "",
    first_name: "",
    last_name: "",
    passport_no: "",
    contact_number: "",
    client_email: "",
    country: "",
    arriving_date: "",
    arrival_flight_no: "",
    arrival_time: "",
    departure_date: "",
    departure_flight_no: "",
    departure_time: "",
    no_of_pax: 1,
    no_of_children: 0,
    hotel_type: [] as string[],
    room_category: [] as string[],
    meal_plan: [] as string[],
    mixed_mode: false,
    client_desires: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setError(null);
  };

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((a) => a !== activity)
        : [...prev, activity]
    );
    setFieldErrors((prev) => ({ ...prev, activities: "" }));
  };

  const toggleArrayField = (field: "hotel_type" | "room_category" | "meal_plan", value: string) => {
    setFormData((prev) => {
      const currentArr = prev[field];
      const newArr = currentArr.includes(value)
        ? currentArr.filter((v) => v !== value)
        : [...currentArr, value];
      return { ...prev, [field]: newArr };
    });
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // Calculate number of nights
  const calculateNights = () => {
    if (formData.arriving_date && formData.departure_date) {
      const arriving = new Date(formData.arriving_date);
      const departure = new Date(formData.departure_date);
      const diffTime = departure.getTime() - arriving.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    }
    return 0;
  };

  // Calculate total rooms
  const totalRooms = roomsDbl + roomsSgl + roomsTpl + roomsQtpl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const dataToValidate = {
        ...formData,
        rooms_dbl: roomsDbl,
        rooms_sgl: roomsSgl,
        rooms_tpl: roomsTpl,
        rooms_qtpl: roomsQtpl,
        activities: selectedActivities,
      };

      const result = publicInquirySchema.safeParse(dataToValidate);

      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.issues.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setFieldErrors(errors);
        setLoading(false);
        return;
      }

      // Submit to API
      const response = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        setError(responseData.error || "Failed to submit inquiry");
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="card max-w-md mx-auto p-8 text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-surface-900 mb-2">
          Thank You!
        </h1>
        <p className="text-surface-600 mb-6">
          Your travel inquiry has been submitted successfully. Our team will review your request and get back to you shortly.
        </p>
        <Button variant="primary" onClick={() => router.refresh()}>
          Submit Another Inquiry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Travel Agent Details */}
      <div className="card p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-surface-900">
              Travel Agent Details
            </h3>
            <p className="text-sm text-surface-500">Details about the booking source</p>
          </div>
        </div>

        <div className="mb-4 flex items-center">
          <input
            id="is_tour_agent"
            name="is_tour_agent"
            type="checkbox"
            checked={formData.is_tour_agent}
            onChange={handleChange}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="is_tour_agent" className="ml-2 block text-sm text-gray-900">
            This trip is arranged by a tour agent
          </label>
        </div>

        {formData.is_tour_agent && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            <Input
              label="Agent Name"
              name="agent_name"
              value={formData.agent_name}
              onChange={handleChange}
              error={fieldErrors.agent_name}
              placeholder="Enter agent name"
            />
            <Input
              label="Agent Email"
              name="agent_email"
              type="email"
              value={formData.agent_email}
              onChange={handleChange}
              error={fieldErrors.agent_email}
              placeholder="agent@example.com"
            />
            <Input
              label="Agent Company"
              name="agent_company"
              value={formData.agent_company}
              onChange={handleChange}
              error={fieldErrors.agent_company}
              placeholder="Enter company name"
              className="md:col-span-2"
            />
          </div>
        )}
      </div>

      {/* Client Details */}
      <div className="card p-6 animate-slide-up" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-surface-900">
              Client Details
            </h3>
            <p className="text-sm text-surface-500">Essential client information</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="First Name"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            error={fieldErrors.first_name}
            placeholder="Enter client first name"
          />
          <Input
            label="Last Name"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            error={fieldErrors.last_name}
            placeholder="Enter client last name"
          />
          <Input
            label="Passport Number"
            name="passport_no"
            value={formData.passport_no}
            onChange={handleChange}
            error={fieldErrors.passport_no}
            placeholder="Enter passport number"
          />
          <Select
            label="Client Country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            options={countryOptions}
            error={fieldErrors.country}
            placeholder="Select client country"
          />
        </div>
      </div>

      {/* Travel Dates */}
      <div className="card p-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <h3 className="text-lg font-semibold text-surface-900 mb-4">
          Travel Dates & Flights
        </h3>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-surface-700 mb-2">Arrival Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Arriving Date"
                name="arriving_date"
                type="date"
                value={formData.arriving_date}
                onChange={handleChange}
                error={fieldErrors.arriving_date}
                required
              />
              <Input
                label="Flight No"
                name="arrival_flight_no"
                value={formData.arrival_flight_no}
                onChange={handleChange}
                placeholder="e.g. UL123"
              />
              <Input
                label="Arrival Time"
                name="arrival_time"
                type="time"
                value={formData.arrival_time}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-surface-700 mb-2">Departure Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Departure Date"
                name="departure_date"
                type="date"
                value={formData.departure_date}
                onChange={handleChange}
                error={fieldErrors.departure_date}
                required
              />
              <Input
                label="Flight No"
                name="departure_flight_no"
                value={formData.departure_flight_no}
                onChange={handleChange}
                placeholder="e.g. UL124"
              />
              <Input
                label="Departure Time"
                name="departure_time"
                type="time"
                value={formData.departure_time}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="label">No. of Nights</label>
            <div className="input bg-surface-50 text-surface-700 flex items-center w-full md:w-1/3">
              {calculateNights()} nights
            </div>
          </div>
        </div>
      </div>

      {/* Travelers */}
      <div className="card p-6 animate-slide-up" style={{ animationDelay: "0.15s" }}>
        <h3 className="text-lg font-semibold text-surface-900 mb-4">
          Number of Travelers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="No. of Pax (Adults)"
            name="no_of_pax"
            type="number"
            min="1"
            max="50"
            value={formData.no_of_pax}
            onChange={handleChange}
            error={fieldErrors.no_of_pax}
            required
          />
          <Input
            label="No. of Children"
            name="no_of_children"
            type="number"
            min="0"
            max="20"
            value={formData.no_of_children}
            onChange={handleChange}
            error={fieldErrors.no_of_children}
          />
        </div>
      </div>

      {/* Accommodation */}
      <div className="card p-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <h3 className="text-lg font-semibold text-surface-900 mb-4">
          Accommodation Preferences
        </h3>
        <div className="grid grid-cols-1 gap-6 mb-6">
          {/* Mixed Mode Toggle
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <input
              id="mixed_mode"
              name="mixed_mode"
              type="checkbox"
              checked={formData.mixed_mode}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, mixed_mode: e.target.checked }));
              }}
              className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
            />
            <label htmlFor="mixed_mode" className="text-sm font-medium text-amber-900">
              Mixed / Custom Setup — Let the AI assign different hotel types and meal plans per day based on Client Desires
            </label>
          </div> */}

          {/* Hotel Type - Multi Select */}
          <div>
            <label className="label mb-2 block">Hotel Type <span className="text-red-500">*</span></label>
            {fieldErrors.hotel_type && (
              <p className="text-sm text-red-600 mb-2">{fieldErrors.hotel_type}</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {hotelTypes.map((type) => (
                <label
                  key={type}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.hotel_type.includes(type)
                      ? "border-primary-500 bg-primary-50"
                      : "border-surface-200 hover:border-surface-300 bg-white"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.hotel_type.includes(type)}
                    onChange={() => toggleArrayField("hotel_type", type)}
                    className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className={`text-sm font-medium ${formData.hotel_type.includes(type) ? "text-primary-700" : "text-surface-700"
                    }`}>
                    {type}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Room Category - Multi Select */}
          <div>
            <label className="label mb-2 block">Room Category <span className="text-red-500">*</span></label>
            {fieldErrors.room_category && (
              <p className="text-sm text-red-600 mb-2">{fieldErrors.room_category}</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {roomCategories.map((cat) => (
                <label
                  key={cat}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.room_category.includes(cat)
                      ? "border-blue-500 bg-blue-50"
                      : "border-surface-200 hover:border-surface-300 bg-white"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.room_category.includes(cat)}
                    onChange={() => toggleArrayField("room_category", cat)}
                    className="w-4 h-4 rounded border-surface-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm font-medium ${formData.room_category.includes(cat) ? "text-blue-700" : "text-surface-700"
                    }`}>
                    {cat}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Meal Plan - Multi Select */}
          <div>
            <label className="label mb-2 block">Meal Plan <span className="text-red-500">*</span></label>
            {fieldErrors.meal_plan && (
              <p className="text-sm text-red-600 mb-2">{fieldErrors.meal_plan}</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {mealPlans.map((plan) => (
                <label
                  key={plan}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.meal_plan.includes(plan)
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-surface-200 hover:border-surface-300 bg-white"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.meal_plan.includes(plan)}
                    onChange={() => toggleArrayField("meal_plan", plan)}
                    className="w-4 h-4 rounded border-surface-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className={`text-sm font-medium ${formData.meal_plan.includes(plan) ? "text-emerald-700" : "text-surface-700"
                    }`}>
                    {plan === "BB" ? "BB (Bed & Breakfast)" :
                      plan === "HB" ? "HB (Half Board)" :
                        plan === "FB" ? "FB (Full Board)" :
                          plan === "AI" ? "AI (All Inclusive)" : plan}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Room Quantities */}
        <div className="border-t border-surface-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-surface-900">Number of Rooms</h4>
              <p className="text-sm text-surface-500">Select the number of each room type you need</p>
            </div>
            {totalRooms > 0 && (
              <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                {totalRooms} room{totalRooms !== 1 ? "s" : ""} selected
              </span>
            )}
          </div>

          {fieldErrors.rooms && (
            <p className="text-sm text-red-600 mb-3">{fieldErrors.rooms}</p>
          )}

          <div className="space-y-3">
            <RoomQuantitySelector
              label="Double (DBL)"
              description="Room with one double bed for 2 guests"
              value={roomsDbl}
              onChange={setRoomsDbl}
            />
            <RoomQuantitySelector
              label="Single (SGL)"
              description="Room with one single bed for 1 guest"
              value={roomsSgl}
              onChange={setRoomsSgl}
            />
            <RoomQuantitySelector
              label="Triple (TPL)"
              description="Room with beds for 3 guests"
              value={roomsTpl}
              onChange={setRoomsTpl}
            />
            <RoomQuantitySelector
              label="Quadruple (QTPL)"
              description="Room with beds for 4 guests"
              value={roomsQtpl}
              onChange={setRoomsQtpl}
            />
          </div>
        </div>
      </div>

      {/* Activities */}
      <div className="card p-6 animate-slide-up" style={{ animationDelay: "0.25s" }}>
        <h3 className="text-lg font-semibold text-surface-900 mb-2">
          Activities
        </h3>
        <p className="text-sm text-surface-500 mb-4">
          Select the activities you are interested in
        </p>
        {fieldErrors.activities && (
          <p className="text-sm text-red-600 mb-3">{fieldErrors.activities}</p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {activityOptions.map((activity) => (
            <label
              key={activity}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedActivities.includes(activity)
                ? "border-primary-500 bg-primary-50"
                : "border-surface-200 hover:border-surface-300 bg-white"
                }`}
            >
              <input
                type="checkbox"
                checked={selectedActivities.includes(activity)}
                onChange={() => toggleActivity(activity)}
                className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
              />
              <span className={`text-sm font-medium ${selectedActivities.includes(activity)
                ? "text-primary-700"
                : "text-surface-700"
                }`}>
                {activity}
              </span>
            </label>
          ))}
        </div>

        {/* Client Desires */}
        <div className="mt-6 pt-6 border-t border-surface-200">
          <label className="label mb-2 block">
            Client Desires / Preferred Places (Optional)
          </label>
          <textarea
            name="client_desires"
            value={formData.client_desires}
            onChange={handleChange}
            placeholder="Type client desires, places, etc. in plain English..."
            className="input min-h-[100px] py-3 resize-none"
          />
          <p className="text-xs text-surface-500 mt-2">
            This will help us personalize the itinerary according to client requirements.
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-center pt-4">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="px-12"
        >
          Submit Inquiry
        </Button>
      </div>
    </form>
  );
}
