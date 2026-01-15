export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type InquiryStatus =
  | "new"
  | "in_progress"
  | "quoted"
  | "confirmed"
  | "cancelled"
  | "completed";

export type InquiryPriority = "low" | "medium" | "high" | "urgent";

export type TripType =
  | "leisure"
  | "business"
  | "honeymoon"
  | "adventure"
  | "cultural"
  | "wellness"
  | "family"
  | "group"
  | "solo"
  | "other";

export type AccommodationType =
  | "budget"
  | "standard"
  | "superior"
  | "deluxe"
  | "luxury"
  | "ultra_luxury";

export type UserRole = "admin" | "agent" | "viewer";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      inquiries: {
        Row: {
          id: string;
          inquiry_number: string;
          client_name: string;
          client_email: string;
          client_phone: string | null;
          client_nationality: string | null;
          trip_type: TripType;
          destinations: string[];
          travel_date_from: string | null;
          travel_date_to: string | null;
          flexibility_days: number;
          adults: number;
          children: number;
          infants: number;
          accommodation_type: AccommodationType;
          meal_plan: string | null;
          special_requirements: string | null;
          interests: string[];
          budget_min: number | null;
          budget_max: number | null;
          budget_currency: string;
          budget_flexibility: boolean;
          status: InquiryStatus;
          priority: InquiryPriority;
          assigned_to: string | null;
          source: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          inquiry_number?: string;
          client_name: string;
          client_email: string;
          client_phone?: string | null;
          client_nationality?: string | null;
          trip_type?: TripType;
          destinations?: string[];
          travel_date_from?: string | null;
          travel_date_to?: string | null;
          flexibility_days?: number;
          adults?: number;
          children?: number;
          infants?: number;
          accommodation_type?: AccommodationType;
          meal_plan?: string | null;
          special_requirements?: string | null;
          interests?: string[];
          budget_min?: number | null;
          budget_max?: number | null;
          budget_currency?: string;
          budget_flexibility?: boolean;
          status?: InquiryStatus;
          priority?: InquiryPriority;
          assigned_to?: string | null;
          source?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          inquiry_number?: string;
          client_name?: string;
          client_email?: string;
          client_phone?: string | null;
          client_nationality?: string | null;
          trip_type?: TripType;
          destinations?: string[];
          travel_date_from?: string | null;
          travel_date_to?: string | null;
          flexibility_days?: number;
          adults?: number;
          children?: number;
          infants?: number;
          accommodation_type?: AccommodationType;
          meal_plan?: string | null;
          special_requirements?: string | null;
          interests?: string[];
          budget_min?: number | null;
          budget_max?: number | null;
          budget_currency?: string;
          budget_flexibility?: boolean;
          status?: InquiryStatus;
          priority?: InquiryPriority;
          assigned_to?: string | null;
          source?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };
      travelers: {
        Row: {
          id: string;
          inquiry_id: string;
          first_name: string;
          last_name: string;
          date_of_birth: string | null;
          gender: string | null;
          passport_number: string | null;
          passport_expiry: string | null;
          nationality: string | null;
          dietary_requirements: string | null;
          medical_conditions: string | null;
          is_lead_traveler: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          inquiry_id: string;
          first_name: string;
          last_name: string;
          date_of_birth?: string | null;
          gender?: string | null;
          passport_number?: string | null;
          passport_expiry?: string | null;
          nationality?: string | null;
          dietary_requirements?: string | null;
          medical_conditions?: string | null;
          is_lead_traveler?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          inquiry_id?: string;
          first_name?: string;
          last_name?: string;
          date_of_birth?: string | null;
          gender?: string | null;
          passport_number?: string | null;
          passport_expiry?: string | null;
          nationality?: string | null;
          dietary_requirements?: string | null;
          medical_conditions?: string | null;
          is_lead_traveler?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      inquiry_activities: {
        Row: {
          id: string;
          inquiry_id: string;
          user_id: string | null;
          action: string;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          inquiry_id: string;
          user_id?: string | null;
          action: string;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          inquiry_id?: string;
          user_id?: string | null;
          action?: string;
          details?: Json;
          created_at?: string;
        };
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
export type Traveler = Database["public"]["Tables"]["travelers"]["Row"];
export type InquiryActivity = Database["public"]["Tables"]["inquiry_activities"]["Row"];
