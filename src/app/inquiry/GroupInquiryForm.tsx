"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, RoomQuantitySelector } from "@/components/ui";
import { FormSection, AnimatedSuccessCard } from "@/components/ui/FormSection";
import {
  countries,
  hotelTypes,
  roomCategories,
  activityOptions,
} from "@/lib/validations/inquiry";
import { groupInquirySchema, GroupMember } from "@/lib/validations/groupInquiry";

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

export function GroupInquiryForm() {
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

  // Group members state
  const [adultMembers, setAdultMembers] = useState<GroupMember[]>([{ full_name: "" }]);
  const [childMembers, setChildMembers] = useState<GroupMember[]>([]);

  const [formData, setFormData] = useState({
    head_first_name: "",
    head_last_name: "",
    head_passport_no: "",
    contact_number: "",
    client_email: "",
    country: "",
    arriving_date: "",
    departure_date: "",
    no_of_adults: 1,
    no_of_children: 0,
    hotel_type: "",
    room_category: "",
  });

  // Update adult members array when no_of_adults changes
  useEffect(() => {
    const count = Number(formData.no_of_adults) || 1;
    setAdultMembers((prev) => {
      if (prev.length < count) {
        return [...prev, ...Array(count - prev.length).fill(null).map(() => ({ full_name: "" }))];
      } else if (prev.length > count) {
        return prev.slice(0, count);
      }
      return prev;
    });
  }, [formData.no_of_adults]);

  // Update child members array when no_of_children changes
  useEffect(() => {
    const count = Number(formData.no_of_children) || 0;
    setChildMembers((prev) => {
      if (prev.length < count) {
        return [...prev, ...Array(count - prev.length).fill(null).map(() => ({ full_name: "" }))];
      } else if (prev.length > count) {
        return prev.slice(0, count);
      }
      return prev;
    });
  }, [formData.no_of_children]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setError(null);
  };

  const handleAdultMemberChange = (index: number, field: keyof GroupMember, value: string) => {
    setAdultMembers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setFieldErrors((prev) => ({ ...prev, adult_members: "" }));
  };

  const handleChildMemberChange = (index: number, field: keyof GroupMember, value: string) => {
    setChildMembers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setFieldErrors((prev) => ({ ...prev, child_members: "" }));
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
        adult_members: adultMembers,
        child_members: childMembers.length > 0 ? childMembers : undefined,
      };

      const result = groupInquirySchema.safeParse(dataToValidate);

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
      const response = await fetch("/api/group-inquiry", {
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
      <AnimatedSuccessCard className="card max-w-md mx-auto p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-900/50 light:bg-green-100 border border-green-700 light:border-green-200 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400 light:text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-surface-100 light:text-surface-900 mb-2">
          Thank You!
        </h1>
        <p className="text-surface-300 light:text-surface-600 mb-6">
          Your group travel inquiry has been submitted successfully. Our team will review your request and get back to you shortly.
        </p>
        <Button variant="primary" onClick={() => router.refresh()}>
          Submit Another Inquiry
        </Button>
      </AnimatedSuccessCard>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-900/30 light:bg-red-50 border border-red-700 light:border-red-200 rounded-lg">
          <p className="text-sm text-red-300 light:text-red-700">{error}</p>
        </div>
      )}

      {/* Head of Group Information */}
      <FormSection index={0} className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary-900/50 flex items-center justify-center border border-primary-700/50">
            <svg className="w-4 h-4 text-primary-300 light:text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-surface-100 light:text-surface-900">
              Head of Group / Contact Person
            </h3>
            <p className="text-sm text-surface-400 light:text-surface-500">Main contact for this group booking</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="First Name"
            name="head_first_name"
            value={formData.head_first_name}
            onChange={handleChange}
            error={fieldErrors.head_first_name}
            placeholder="Enter first name"
            required
          />
          <Input
            label="Last Name"
            name="head_last_name"
            value={formData.head_last_name}
            onChange={handleChange}
            error={fieldErrors.head_last_name}
            placeholder="Enter last name"
            required
          />
          <Input
            label="Passport No"
            name="head_passport_no"
            value={formData.head_passport_no}
            onChange={handleChange}
            error={fieldErrors.head_passport_no}
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
      </FormSection>

      {/* Travel Dates */}
      <FormSection index={1} className="card p-6">
        <h3 className="text-lg font-semibold text-surface-100 mb-4">
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
            <div className="input bg-surface-800 light:bg-surface-100 text-surface-200 light:text-surface-800 flex items-center border-surface-600 light:border-surface-300">
              {calculateNights()} nights
            </div>
          </div>
        </div>
      </FormSection>

      {/* Group Size */}
      <FormSection index={2} className="card p-6">
        <h3 className="text-lg font-semibold text-surface-100 mb-4">
          Group Size
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Number of Adults"
            name="no_of_adults"
            type="number"
            min="1"
            max="100"
            value={formData.no_of_adults}
            onChange={handleChange}
            error={fieldErrors.no_of_adults}
            required
          />
          <Input
            label="Number of Children"
            name="no_of_children"
            type="number"
            min="0"
            max="50"
            value={formData.no_of_children}
            onChange={handleChange}
            error={fieldErrors.no_of_children}
          />
          <div>
            <label className="label">Total Pax</label>
            <div className="input bg-primary-900/50 light:bg-primary-50 text-primary-300 light:text-primary-800 font-semibold flex items-center border-primary-700/50 light:border-primary-200 border">
              {Number(formData.no_of_adults) + Number(formData.no_of_children)} travelers
            </div>
          </div>
        </div>
      </FormSection>

      {/* Adult Members Names */}
      <FormSection index={3} className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary-900/50 flex items-center justify-center border border-primary-700/50">
            <svg className="w-4 h-4 text-primary-300 light:text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-surface-100 light:text-surface-900">
              Adult Members ({formData.no_of_adults})
            </h3>
            <p className="text-sm text-surface-400 light:text-surface-500">Enter the full names of all adult travelers</p>
          </div>
        </div>
        
        {fieldErrors.adult_members && (
          <p className="text-sm text-red-600 mb-3">{fieldErrors.adult_members}</p>
        )}

        <div className="space-y-3">
          {adultMembers.map((member, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-surface-700 light:bg-surface-200 flex items-center justify-center text-sm font-medium text-surface-300 light:text-surface-600 flex-shrink-0">
                {index + 1}
              </span>
              <Input
                label=""
                name={`adult_${index}`}
                value={member.full_name}
                onChange={(e) => handleAdultMemberChange(index, "full_name", e.target.value)}
                placeholder={`Adult ${index + 1} full name`}
                required
                className="flex-1"
              />
            </div>
          ))}
        </div>
      </FormSection>

      {/* Child Members Names */}
      {Number(formData.no_of_children) > 0 && (
        <FormSection index={4} className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-amber-900/50 light:bg-amber-100 flex items-center justify-center border border-amber-700/50 light:border-amber-200">
              <svg className="w-4 h-4 text-amber-300 light:text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-surface-100 light:text-surface-900">
                Children ({formData.no_of_children})
              </h3>
              <p className="text-sm text-surface-400 light:text-surface-500">Enter the full names of all children</p>
            </div>
          </div>
          
          {fieldErrors.child_members && (
            <p className="text-sm text-red-600 mb-3">{fieldErrors.child_members}</p>
          )}

          <div className="space-y-3">
            {childMembers.map((member, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-amber-900/50 light:bg-amber-100 flex items-center justify-center text-sm font-medium text-amber-300 light:text-amber-700 flex-shrink-0 border border-amber-700/50 light:border-amber-200">
                  {index + 1}
                </span>
                <Input
                  label=""
                  name={`child_${index}`}
                  value={member.full_name}
                  onChange={(e) => handleChildMemberChange(index, "full_name", e.target.value)}
                  placeholder={`Child ${index + 1} full name`}
                  required
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        </FormSection>
      )}

      {/* Accommodation */}
      <FormSection index={5} className="card p-6">
        <h3 className="text-lg font-semibold text-surface-100 mb-4">
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
        <div className="border-t border-surface-600 light:border-surface-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-surface-100">Number of Rooms</h4>
              <p className="text-sm text-surface-400 light:text-surface-500">Select the number of each room type you need</p>
            </div>
            {totalRooms > 0 && (
              <span className="px-3 py-1 bg-primary-900/50 light:bg-primary-100 text-primary-300 light:text-primary-800 rounded-full text-sm font-medium border border-primary-700/50 light:border-primary-200">
                {totalRooms} room{totalRooms !== 1 ? "s" : ""} selected
              </span>
            )}
          </div>
          
          {fieldErrors.rooms_dbl && (
            <p className="text-sm text-red-600 mb-3">{fieldErrors.rooms_dbl}</p>
          )}

          <div className="space-y-3">
            <RoomQuantitySelector
              label="Double (DBL)"
              description="Room with one double bed for 2 guests"
              value={roomsDbl}
              onChange={setRoomsDbl}
              max={50}
            />
            <RoomQuantitySelector
              label="Single (SGL)"
              description="Room with one single bed for 1 guest"
              value={roomsSgl}
              onChange={setRoomsSgl}
              max={50}
            />
            <RoomQuantitySelector
              label="Triple (TPL)"
              description="Room with beds for 3 guests"
              value={roomsTpl}
              onChange={setRoomsTpl}
              max={50}
            />
            <RoomQuantitySelector
              label="Quadruple (QTPL)"
              description="Room with beds for 4 guests"
              value={roomsQtpl}
              onChange={setRoomsQtpl}
              max={50}
            />
          </div>
        </div>
      </FormSection>

      {/* Activities */}
      <FormSection index={6} className="card p-6">
        <h3 className="text-lg font-semibold text-surface-100 mb-2">
          Activities
        </h3>
        <p className="text-sm text-surface-400 mb-4">
          Select the activities your group is interested in
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
                  ? "border-primary-500 bg-primary-900/50 light:bg-primary-50"
                  : "border-surface-600 light:border-surface-300 hover:border-surface-500 light:hover:border-surface-400 bg-surface-800 light:bg-white"
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
                  ? "text-primary-300 light:text-primary-700"
                  : "text-surface-300 light:text-surface-600"
              }`}>
                {activity}
              </span>
            </label>
          ))}
        </div>
      </FormSection>

      {/* Submit */}
      <div className="flex justify-center pt-4">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="px-12"
        >
          Submit Group Inquiry
        </Button>
      </div>
    </form>
  );
}
