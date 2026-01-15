import { z } from "zod";
import { countries, hotelTypes, roomCategories, activityOptions } from "./inquiry";

export const groupMemberSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  passport_no: z.string().optional(),
  date_of_birth: z.string().optional(),
  special_requirements: z.string().optional(),
});

export const groupInquirySchema = z.object({
  // Head of Group Details
  head_first_name: z.string().min(1, "First name is required"),
  head_last_name: z.string().min(1, "Last name is required"),
  head_passport_no: z.string().optional(),
  contact_number: z.string().min(1, "Contact number is required"),
  client_email: z.string().email("Invalid email address"),
  country: z.enum(countries, { message: "Please select a valid country" }),
  
  // Travel Details
  arriving_date: z.string().min(1, "Arrival date is required"),
  departure_date: z.string().min(1, "Departure date is required"),
  no_of_adults: z.coerce.number().min(1, "At least 1 adult is required"),
  no_of_children: z.coerce.number().min(0).optional(),
  
  // Accommodation
  hotel_type: z.enum(hotelTypes, { message: "Please select a hotel type" }),
  room_category: z.enum(roomCategories, { message: "Please select a room category" }),
  rooms_dbl: z.coerce.number().min(0).max(50).default(0),
  rooms_sgl: z.coerce.number().min(0).max(50).default(0),
  rooms_tpl: z.coerce.number().min(0).max(50).default(0),
  rooms_qtpl: z.coerce.number().min(0).max(50).default(0),
  
  // Activities
  activities: z.array(z.enum(activityOptions)).optional(),
  
  // Group Members
  adult_members: z.array(groupMemberSchema).min(1, "At least one adult member is required"),
  child_members: z.array(groupMemberSchema).optional(),
}).refine(
  (data) => {
    const arriving = new Date(data.arriving_date);
    const departure = new Date(data.departure_date);
    return departure >= arriving;
  },
  {
    message: "Departure date cannot be before arrival date",
    path: ["departure_date"],
  }
).refine(
  (data) => {
    return (data.rooms_dbl || 0) + (data.rooms_sgl || 0) + (data.rooms_tpl || 0) + (data.rooms_qtpl || 0) > 0;
  },
  {
    message: "At least one room must be selected",
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
