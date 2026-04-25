import { z } from "zod";
import { countries, hotelTypes, roomCategories, activityOptions } from "./inquiry";

export const groupMemberSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  passport_no: z.string().optional(),
  date_of_birth: z.string().optional(),
  special_requirements: z.string().optional(),
});

export const groupInquirySchema = z.object({
  // Travel Agent Details (Optional)
  is_tour_agent: z.boolean().default(false),
  agent_name: z.string().optional(),
  agent_email: z.string().email("Please enter a valid agent email address").optional().or(z.literal("")),
  agent_company: z.string().optional(),

  // Head of Group Details
  head_first_name: z.string().optional().or(z.literal("")),
  head_last_name: z.string().optional().or(z.literal("")),
  head_passport_no: z.string().optional(),
  contact_number: z.string().optional().or(z.literal("")),
  client_email: z.string().email("Invalid email address").optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),

  // Travel Details
  arriving_date: z.string().min(1, "Arrival date is required"),
  arrival_flight_no: z.string().optional(),
  arrival_time: z.string().optional(),
  departure_date: z.string().min(1, "Departure date is required"),
  departure_flight_no: z.string().optional(),
  departure_time: z.string().optional(),
  no_of_adults: z.coerce.number().min(1, "At least 1 adult is required"),
  no_of_children: z.coerce.number().min(0).optional(),

  // Accommodation — multi-select arrays matching individual inquiry form
  hotel_type: z.array(z.enum(hotelTypes)).min(1, "Please select at least one hotel type"),
  room_category: z.array(z.enum(roomCategories)).min(1, "Please select at least one room category"),
  meal_plan: z.array(z.string()).min(1, "Please select at least one meal plan"),
  rooms_dbl: z.coerce.number().min(0).max(50).default(0),
  rooms_sgl: z.coerce.number().min(0).max(50).default(0),
  rooms_tpl: z.coerce.number().min(0).max(50).default(0),
  rooms_qtpl: z.coerce.number().min(0).max(50).default(0),

  // Activities
  activities: z.array(z.enum(activityOptions)).min(1, "Please select at least one activity"),
  client_desires: z.string().optional(),

  // Group Members
  adult_members: z.array(groupMemberSchema).min(1, "At least one adult member is required"),
  child_members: z.array(groupMemberSchema).optional(),
}).refine(
  (data) => {
    if (data.arriving_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(data.arriving_date) >= today;
    }
    return true;
  },
  {
    message: "Arrival date cannot be in the past",
    path: ["arriving_date"],
  }
).refine(
  (data) => {
    if (data.arriving_date && data.departure_date) {
      return new Date(data.departure_date) > new Date(data.arriving_date);
    }
    return true;
  },
  {
    message: "Departure date must be after arriving date",
    path: ["departure_date"],
  }
).refine(
  (data) => {
    return (data.rooms_dbl || 0) + (data.rooms_sgl || 0) + (data.rooms_tpl || 0) + (data.rooms_qtpl || 0) > 0;
  },
  {
    message: "Please select at least one room",
    path: ["rooms_dbl"],
  }
).refine(
  (data) => {
    return data.adult_members.length === data.no_of_adults;
  },
  {
    message: "Number of adult names must match the number of adults",
    path: ["adult_members"],
  }
).refine(
  (data) => {
    const childCount = data.no_of_children || 0;
    const childMembersCount = data.child_members?.length || 0;
    return childMembersCount === childCount;
  },
  {
    message: "Number of children names must match the number of children",
    path: ["child_members"],
  }
);

export type GroupMember = z.infer<typeof groupMemberSchema>;
export type GroupInquiryData = z.infer<typeof groupInquirySchema>;
