import { z } from "zod";

// Country list for dropdown
export const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia",
  "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados",
  "Belarus", "Belgium", "Belize", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana",
  "Brazil", "Brunei", "Bulgaria", "Cambodia", "Cameroon", "Canada", "Chile", "China",
  "Colombia", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark",
  "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Estonia", "Ethiopia", "Fiji",
  "Finland", "France", "Georgia", "Germany", "Ghana", "Greece", "Guatemala", "Haiti",
  "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya",
  "Kuwait", "Laos", "Latvia", "Lebanon", "Libya", "Lithuania", "Luxembourg", "Malaysia",
  "Maldives", "Malta", "Mexico", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco",
  "Myanmar", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Nigeria", "North Korea",
  "Norway", "Oman", "Pakistan", "Palestine", "Panama", "Paraguay", "Peru", "Philippines",
  "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saudi Arabia", "Senegal",
  "Serbia", "Singapore", "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain",
  "Sri Lanka", "Sudan", "Sweden", "Switzerland", "Syria", "Taiwan", "Tanzania", "Thailand",
  "Tunisia", "Turkey", "UAE", "Uganda", "Ukraine", "United Kingdom", "United States",
  "Uruguay", "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
] as const;

// Hotel star categories
export const hotelTypes = [
  "3 Star",
  "4 Star",
  "5 Star",
  "Boutique",
  "Villa",
  "Budget",
] as const;

export const mealPlans = [
  "BB",
  "HB",
  "FB",
  "AI",
] as const;

// Room categories
export const roomCategories = [
  "Standard",
  "Deluxe",
  "Superior",
  "Suite",
] as const;

// Activities checklist
export const activityOptions = [
  "Wildlife and Nature",
  "Wellness and Spiritual",
  "Archeology and Heritage",
  "Tea Experience and Hill Country",
  "Hiking & Adventure",
  "Beach & Water Sports",
  "Cultural & Heritage",
  "Urban & Leisure",
  "Eco & Village Experiences",
] as const;

export const inquiryStatuses = [
  "new",
  "in_progress",
  "quoted",
  "confirmed",
  "cancelled",
  "completed",
] as const;

export const inquiryPriorities = ["low", "medium", "high", "urgent"] as const;

// Public inquiry form schema (for client submission)
export const publicInquirySchema = z.object({
  // Travel Agent Details (Optional)
  agent_name: z.string().optional(),
  agent_email: z.string().email("Please enter a valid agent email address").optional().or(z.literal("")),
  agent_company: z.string().optional(),

  first_name: z
    .string()
    .max(50, "First name is too long")
    .optional()
    .or(z.literal("")),
  last_name: z
    .string()
    .max(50, "Last name is too long")
    .optional()
    .or(z.literal("")),
  passport_no: z.string().optional(),
  contact_number: z.string().optional().or(z.literal("")),
  client_email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  arriving_date: z.string().min(1, "Arriving date is required"),
  departure_date: z.string().min(1, "Departure date is required"),
  no_of_pax: z.coerce.number().min(1, "At least 1 person is required").max(50).default(1),
  no_of_children: z.coerce.number().min(0).max(20).default(0),
  hotel_type: z.string().min(1, "Please select a hotel type"),
  room_category: z.string().min(1, "Please select a room category"),
  meal_plan: z.string().optional(),
  // Room quantities
  rooms_dbl: z.coerce.number().min(0).max(20).default(0),
  rooms_sgl: z.coerce.number().min(0).max(20).default(0),
  rooms_tpl: z.coerce.number().min(0).max(20).default(0),
  rooms_qtpl: z.coerce.number().min(0).max(20).default(0),
  activities: z.array(z.string()).min(1, "Please select at least one activity"),
  client_desires: z.string().optional(),
}).refine(
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
    // At least one room must be selected
    return (data.rooms_dbl + data.rooms_sgl + data.rooms_tpl + data.rooms_qtpl) > 0;
  },
  {
    message: "Please select at least one room",
    path: ["rooms"],
  }
);

export type PublicInquiryData = z.infer<typeof publicInquirySchema>;

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Signup schema
export const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().min(2, "Name must be at least 2 characters"),
});

export type SignupFormData = z.infer<typeof signupSchema>;
