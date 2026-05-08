import { z } from "zod";

// Single rate plan schema
export const ratePlanSchema = z.object({
    meal_plan: z.enum(["BB", "HB", "FB", "AI", "RO"]),
    valid_from: z.string().min(1, "Start date is required"),
    valid_to: z.string().min(1, "End date is required"),
    currency: z.string().default("USD"),
    rate_sgl: z.number().min(0).optional().nullable(),
    rate_dbl: z.number().min(0).optional().nullable(),
    rate_tpl: z.number().min(0).optional().nullable(),
    rate_child: z.number().min(0).optional().nullable(),
    rate_extra_adult: z.number().min(0).optional().nullable(),
});

// Room category with multiple rate plans
export const roomCategorySchema = z.object({
    room_category: z.string().min(1, "Room category is required"),
    rate_plans: z.array(ratePlanSchema).min(1, "At least one rate plan is required"),
});

// Full submission schema
export const hotelRatesSubmissionSchema = z.object({
    token: z.string().optional().nullable(),
    hotel_name: z.string().min(1, "Hotel name is required"),
    hotel_location: z.string().optional(),
    hotel_contact: z.string().optional(),
    hotel_email: z.string().email("Valid hotel email is required"),
    room_categories: z.array(roomCategorySchema).min(1, "At least one room category is required"),
});

export type RatePlan = z.infer<typeof ratePlanSchema>;
export type RoomCategory = z.infer<typeof roomCategorySchema>;
export type HotelRatesSubmission = z.infer<typeof hotelRatesSubmissionSchema>;

// Helper constants
export const mealPlanOptions = [
    { value: "BB", label: "Bed & Breakfast (BB)" },
    { value: "HB", label: "Half Board (HB)" },
    { value: "FB", label: "Full Board (FB)" },
    { value: "AI", label: "All Inclusive (AI)" },
    { value: "RO", label: "Room Only (RO)" },
];

export const currencyOptions = [
    { value: "USD", label: "USD - US Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - British Pound" },
    { value: "LKR", label: "LKR - Sri Lankan Rupee" },
    { value: "AUD", label: "AUD - Australian Dollar" },
    { value: "SGD", label: "SGD - Singapore Dollar" },
];

export const roomCategoryPresets = [
    "Standard Room",
    "Superior Room",
    "Deluxe Room",
    "Suite",
    "Family Room",
    "Villa",
    "Bungalow",
];
