import { z } from "zod";

export const feedbackSchema = z.object({
  inquiry_id: z.string().uuid().optional().nullable(),
  group_inquiry_id: z.string().uuid().optional().nullable(),
  itinerary_id: z.string().uuid().optional().nullable(),
  tour_id: z.string().uuid().optional().nullable(),
  token_id: z.string().uuid().optional().nullable(),
  driver_id: z.string().uuid().optional().nullable(),
  vehicle_id: z.string().optional().nullable(),
  
  // Guest Info
  guest_name: z.string().min(1, "Name is required"),
  guest_email: z.string().email("Valid email is required"),
  country: z.string().optional().nullable(),
  age_group: z.enum(["Under 18", "18-25", "26-35", "36-45", "46-60", "60+"]).optional().nullable(),
  
  // Ratings (0-100)
  airport_welcome_score: z.number().min(0).max(100).optional().nullable(),
  
  // Hotel Quality (dynamic hotels)
  hotel_quality_scores: z.record(z.number().min(0).max(100)).optional().default({}),
  
  // Driver scores
  driver_language_score: z.number().min(0).max(100).optional().nullable(),
  driver_appearance_score: z.number().min(0).max(100).optional().nullable(),
  driver_hospitality_score: z.number().min(0).max(100).optional().nullable(),
  driver_helpfulness_score: z.number().min(0).max(100).optional().nullable(),
  
  // Vehicle scores
  vehicle_quality_score: z.number().min(0).max(100).optional().nullable(),
  vehicle_cleanliness_score: z.number().min(0).max(100).optional().nullable(),
  vehicle_comfort_score: z.number().min(0).max(100).optional().nullable(),
  
  // Overall
  overall_experience_score: z.number().min(0).max(100).optional().nullable(),
  
  // Remarks
  remarks: z.string().max(800, "Remarks cannot exceed 800 characters").optional().nullable(),
});

export type FeedbackFormData = z.infer<typeof feedbackSchema>;

// Helper function to get rating label
export function getRatingLabel(score: number | null | undefined): string {
  if (score === null || score === undefined) return "Not rated";
  if (score < 50) return "Poor";
  if (score < 70) return "Average";
  if (score < 90) return "Good";
  return "Excellent";
}

// Helper function to get rating color
export function getRatingColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "surface";
  if (score < 50) return "red";
  if (score < 70) return "orange";
  if (score < 90) return "blue";
  return "green";
}
