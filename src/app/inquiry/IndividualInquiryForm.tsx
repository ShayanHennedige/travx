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
    first_name: "",
    last_name: "",
    passport_no: "",
    contact_number: "",
    client_email: "",
    country: "",
    arriving_date: "",
    departure_date: "",
    no_of_pax: 1,
    no_of_children: 0,
    hotel_type: "",
    room_category: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
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

      {/* Personal Information */}
      <div className="card p-6 animate-slide-up">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="First Name"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            error={fieldErrors.first_name}
            placeholder="Enter your first name"
            required
          />
          <Input
            label="Last Name"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            error={fieldErrors.last_name}
            placeholder="Enter your last name"
            required
          />
          <Input
            label="Passport No"
            name="passport_no"
            value={formData.passport_no}
            onChange={handleChange}
            error={fieldErrors.passport_no}
            placeholder="Enter passport number"
          />
          <Input
            label="Contact Number"
            name="contact_number"
            type="tel"
            value={formData.contact_number}
            onChange={handleChange}
            error={fieldErrors.contact_number}
            placeholder="+94 77 123 4567"
            required
          />
          <Input
            label="Email"
            name="client_email"
            type="email"
            value={formData.client_email}
            onChange={handleChange}
            error={fieldErrors.client_email}
            placeholder="you@example.com"
            required
          />
          <Select
            label="Country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            options={countryOptions}
            error={fieldErrors.country}
            placeholder="Select your country"
            required
          />
        </div>
      </div>

      {/* Travel Dates */}
      <div className="card p-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <h3 className="text-lg font-semibold text-surface-900 mb-4">
          Travel Dates
        </h3>
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
            label="Departure Date"
            name="departure_date"
            type="date"
            value={formData.departure_date}
            onChange={handleChange}
            error={fieldErrors.departure_date}
            required
          />
          <div>
            <label className="label">No. of Nights</label>
            <div className="input bg-surface-50 text-surface-700 flex items-center">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Select
            label="Hotel Type"
            name="hotel_type"
            value={formData.hotel_type}
            onChange={handleChange}
            options={hotelTypeOptions}
            error={fieldErrors.hotel_type}
            placeholder="Select star category"
            required
          />
          <Select
            label="Room Category"
            name="room_category"
            value={formData.room_category}
            onChange={handleChange}
            options={roomCategoryOptions}
            error={fieldErrors.room_category}
            placeholder="Select category"
            required
          />
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
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedActivities.includes(activity)
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
              <span className={`text-sm font-medium ${
                selectedActivities.includes(activity)
                  ? "text-primary-700"
                  : "text-surface-700"
              }`}>
                {activity}
              </span>
            </label>
          ))}
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
