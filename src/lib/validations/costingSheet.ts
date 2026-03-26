import { z } from "zod";

// Vehicle types and their default rates
export const vehicleTypes = [
    "Car",
    "Van",
    "Mini Coach",
    "30 Seater Coach",
    "Large Coach",
] as const;

export const vehicleRates: Record<string, number> = {
    "Car": 100,
    "Van": 130,
    "Mini Coach": 175,
    "30 Seater Coach": 250,
    "Large Coach": 350,
};

// Accommodation row schema
export const accommodationRowSchema = z.object({
    day: z.string().min(1, "Day is required"),
    location: z.string().min(1, "Location is required"),
    hotel: z.string().min(1, "Hotel is required"),
    room_category: z.string().default("Standard"),
    basis: z.string().min(1, "Basis is required"), // BB, HB, FB, etc.
    sgl: z.number().min(0).default(0),
    dbl: z.number().min(0).default(0),
    tri: z.number().min(0).default(0),
    quad: z.number().min(0).default(0),
    quad_triple: z.number().min(0).default(0), // Quad/Triple column
});

// Transport row schema
export const transportRowSchema = z.object({
    description: z.string().min(1, "Description is required"),
    mileage: z.number().min(0).default(0),
    rate: z.number().min(0).default(0),
    total: z.number().min(0).default(0),
});

// Extras row schema
export const extrasRowSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().default(""),
    count: z.number().min(0).default(0),
    unit_price: z.number().min(0).default(0),
});

// Meal extras schema
export const mealExtrasSchema = z.object({
    ex_lunch: z.number().min(0).default(0),
    ex_dinner: z.number().min(0).default(0),
    ex_breakfast: z.number().min(0).default(0),
});

// Complete costing sheet schema
export const costingSheetSchema = z.object({
    itinerary_id: z.string().uuid("Invalid itinerary ID"),
    agent_name: z.string().optional(),
    client_name: z.string().optional(),
    passport_no: z.string().optional(),
    country: z.string().optional(),
    agent_company: z.string().optional(),
    arrival_date: z.string().optional(),
    no_of_pax: z.number().int().min(1).default(2),
    hotel_type: z.string().optional(),
    meal_plan: z.string().optional(),
    quote_date: z.string().optional(),
    accommodation_data: z.array(accommodationRowSchema).default([]),
    transport_data: z.array(transportRowSchema).default([]),
    extras_data: z.array(extrasRowSchema).default([]),
    meal_extras: mealExtrasSchema.default({
        ex_lunch: 0,
        ex_dinner: 0,
        ex_breakfast: 0,
    }),
    exchange_rate: z.number().min(0).default(0),
    total_lkr: z.number().min(0).default(0),
    total_usd: z.number().min(0).default(0),
    per_person_usd: z.number().min(0).default(0),
    status: z.enum(["draft", "finalized", "approved"]).default("draft"),

    // New fields for enhanced costing
    vehicle_type: z.enum(vehicleTypes).default("Van"),
    vehicle_rate: z.number().min(0).default(130),
    profit_percentage: z.number().min(0).max(100).default(15),
    quad_rate: z.number().min(0).default(0),
    usd_conversion_offset: z.number().min(0).default(15),
    currency: z.string().default("USD"),
    period_description: z.string().optional(),
    period_start: z.string().optional(),
    period_end: z.string().optional(),
});

export type AccommodationRow = z.infer<typeof accommodationRowSchema>;
export type TransportRow = z.infer<typeof transportRowSchema>;
export type ExtrasRow = z.infer<typeof extrasRowSchema>;
export type MealExtras = z.infer<typeof mealExtrasSchema>;
export type CostingSheet = z.infer<typeof costingSheetSchema>;
export type VehicleType = typeof vehicleTypes[number];
