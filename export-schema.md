# Database Schema Documentation

Generated from Supabase database: `tvxwjknpdzvuovjgqvvi`

## Tables Overview

### 1. **profiles**
- **RLS Enabled:** Yes
- **Primary Key:** `id`
- **Columns:**
  - `id` (uuid) - Primary Key → `auth.users.id`
  - `email` (text)
  - `full_name` (text, nullable)
  - `role` (text, default: 'agent') - Check: 'admin', 'agent', 'viewer'
  - `created_at` (timestamptz, default: now())
  - `updated_at` (timestamptz, default: now())

### 2. **inquiries**
- **RLS Enabled:** No
- **Primary Key:** `id`
- **Columns:**
  - `id` (uuid) - Primary Key
  - `inquiry_number` (text, unique)
  - `client_email` (text)
  - `status` (enum: inquiry_status, default: 'new') - 'new', 'in_progress', 'quoted', 'confirmed', 'cancelled', 'completed'
  - `priority` (enum: inquiry_priority, default: 'medium') - 'low', 'medium', 'high', 'urgent'
  - `assigned_to` (uuid, nullable) → `profiles.id`
  - `source` (text, nullable)
  - `notes` (text, nullable)
  - `created_at` (timestamptz, default: now())
  - `updated_at` (timestamptz, default: now())
  - `created_by` (uuid, nullable) → `profiles.id`
  - `first_name` (text)
  - `last_name` (text)
  - `passport_no` (text, nullable)
  - `contact_number` (text, nullable)
  - `country` (text, nullable)
  - `arriving_date` (date, nullable)
  - `departure_date` (date, nullable)
  - `no_of_nights` (integer, generated) - Calculated from dates
  - `no_of_pax` (integer, default: 1)
  - `no_of_children` (integer, default: 0)
  - `hotel_type` (text, nullable)
  - `room_category` (text, nullable)
  - `activities` (text[], default: '{}')
  - `rooms_dbl` (integer, default: 0)
  - `rooms_sgl` (integer, default: 0)
  - `rooms_tpl` (integer, default: 0)
  - `rooms_qtpl` (integer, default: 0)

### 3. **group_inquiries**
- **RLS Enabled:** No
- **Primary Key:** `id`
- **Columns:**
  - `id` (uuid) - Primary Key
  - `inquiry_number` (varchar, nullable, unique)
  - `head_first_name` (varchar)
  - `head_last_name` (varchar)
  - `head_passport_no` (varchar, nullable)
  - `contact_number` (varchar)
  - `client_email` (varchar)
  - `country` (varchar, nullable)
  - `arriving_date` (date, nullable)
  - `departure_date` (date, nullable)
  - `no_of_nights` (integer, nullable)
  - `no_of_adults` (integer, default: 1)
  - `no_of_children` (integer, default: 0)
  - `hotel_type` (varchar, nullable)
  - `room_category` (varchar, nullable)
  - `rooms_dbl` (integer, default: 0)
  - `rooms_sgl` (integer, default: 0)
  - `rooms_tpl` (integer, default: 0)
  - `rooms_qtpl` (integer, default: 0)
  - `activities` (text[], nullable)
  - `status` (varchar, default: 'new')
  - `priority` (varchar, default: 'medium')
  - `source` (varchar, default: 'web_form')
  - `notes` (text, nullable)
  - `created_at` (timestamptz, default: now())
  - `updated_at` (timestamptz, default: now())
  - `room_interconnections` (jsonb, default: '[]')

### 4. **group_members**
- **RLS Enabled:** No
- **Primary Key:** `id`
- **Columns:**
  - `id` (uuid) - Primary Key
  - `group_inquiry_id` (uuid) → `group_inquiries.id`
  - `member_type` (varchar) - Check: 'adult', 'child'
  - `full_name` (varchar)
  - `passport_no` (varchar, nullable)
  - `date_of_birth` (date, nullable)
  - `special_requirements` (text, nullable)
  - `created_at` (timestamptz, default: now())
  - `room_number` (integer, nullable)
  - `room_category` (text, nullable)
  - `age_label` (text, nullable)
  - `remarks` (text, nullable)

### 5. **travelers**
- **RLS Enabled:** Yes
- **Primary Key:** `id`
- **Columns:**
  - `id` (uuid) - Primary Key
  - `inquiry_id` (uuid) → `inquiries.id`
  - `first_name` (text)
  - `last_name` (text)
  - `date_of_birth` (date, nullable)
  - `gender` (text, nullable) - Check: 'male', 'female', 'other', 'prefer_not_to_say'
  - `passport_number` (text, nullable)
  - `passport_expiry` (date, nullable)
  - `nationality` (text, nullable)
  - `dietary_requirements` (text, nullable)
  - `medical_conditions` (text, nullable)
  - `is_lead_traveler` (boolean, default: false)
  - `created_at` (timestamptz, default: now())
  - `updated_at` (timestamptz, default: now())

### 6. **inquiry_activities**
- **RLS Enabled:** Yes
- **Primary Key:** `id`
- **Columns:**
  - `id` (uuid) - Primary Key
  - `inquiry_id` (uuid) → `inquiries.id`
  - `user_id` (uuid, nullable) → `profiles.id`
  - `action` (text)
  - `details` (jsonb, default: '{}')
  - `created_at` (timestamptz, default: now())

### 7. **itineraries**
- **RLS Enabled:** No
- **Primary Key:** `id`
- **Columns:**
  - `id` (uuid) - Primary Key
  - `inquiry_id` (uuid, nullable) → `inquiries.id`
  - `group_inquiry_id` (uuid, nullable) → `group_inquiries.id`
  - `content` (jsonb)
  - `raw_response` (text, nullable)
  - `model` (varchar, default: 'gpt-4o')
  - `tokens_used` (integer, nullable)
  - `generation_time_ms` (integer, nullable)
  - `created_at` (timestamptz, default: now())
  - `updated_at` (timestamptz, default: now())
  - `status` (text, default: 'new') - Check: 'new', 'in_progress', 'completed'

### 8. **tours**
- **RLS Enabled:** Yes
- **Primary Key:** `id`
- **Columns:**
  - `id` (uuid) - Primary Key
  - `itinerary_id` (uuid) → `itineraries.id`
  - `inquiry_id` (uuid, nullable) → `inquiries.id`
  - `group_inquiry_id` (uuid, nullable) → `group_inquiries.id`
  - `driver_id` (uuid, nullable) → `drivers.id`
  - `client_name` (text)
  - `start_date` (date)
  - `end_date` (date)
  - `pax_adults` (integer, default: 0)
  - `pax_children` (integer, default: 0)
  - `status` (text, default: 'upcoming') - Check: 'upcoming', 'ongoing', 'completed', 'cancelled'
  - `notes` (text, nullable)
  - `created_at` (timestamptz, default: now())
  - `updated_at` (timestamptz, default: now())
  - `driver_status` (text, default: 'new') - Check: 'new', 'in_progress', 'completed'

### 9. **drivers**
- **RLS Enabled:** Yes
- **Primary Key:** `id`
- **Columns:**
  - `id` (uuid) - Primary Key
  - `name` (text)
  - `contact_number` (text)
  - `vehicle_type` (text, nullable)
  - `vehicle_number` (text, nullable)
  - `languages` (text[], default: '{}')
  - `created_at` (timestamptz, default: now())
  - `updated_at` (timestamptz, default: now())

### 10. **hotel_rate_requests**
- **RLS Enabled:** No
- **Primary Key:** `id`
- **Columns:**
  - `id` (uuid) - Primary Key
  - `request_number` (varchar, nullable, unique)
  - `hotel_name` (varchar)
  - `hotel_email` (varchar)
  - `hotel_contact` (varchar, nullable)
  - `hotel_address` (text, nullable)
  - `requested_by` (varchar, nullable)
  - `inquiry_id` (uuid, nullable) → `inquiries.id`
  - `group_inquiry_id` (uuid, nullable) → `group_inquiries.id`
  - `check_in_date` (date, nullable)
  - `check_out_date` (date, nullable)
  - `notes` (text, nullable)
  - `status` (varchar, default: 'pending')
  - `token` (varchar, unique)
  - `expires_at` (timestamptz)
  - `submitted_at` (timestamptz, nullable)
  - `created_at` (timestamptz, default: now())
  - `updated_at` (timestamptz, default: now())

### 11. **hotel_rates**
- **RLS Enabled:** No
- **Primary Key:** `id`
- **Columns:**
  - `id` (uuid) - Primary Key
  - `request_id` (uuid, nullable) → `hotel_rate_requests.id`
  - `room_category` (varchar)
  - `meal_plan` (varchar)
  - `valid_from` (date)
  - `valid_to` (date)
  - `currency` (varchar, default: 'USD')
  - `sell_mode` (varchar, default: 'per_room')
  - `rate_sgl` (numeric, nullable)
  - `rate_dbl` (numeric, nullable)
  - `rate_tpl` (numeric, nullable)
  - `rate_child` (numeric, nullable)
  - `rate_extra_adult` (numeric, nullable)
  - `min_nights` (integer, default: 1)
  - `remarks` (text, nullable)
  - `created_at` (timestamptz, default: now())

### 12. **hotel_vouchers**
- **RLS Enabled:** Yes
- **Primary Key:** `id`
- **Columns:**
  - `id` (uuid) - Primary Key
  - `voucher_number` (varchar, nullable, unique)
  - `inquiry_id` (uuid, nullable) → `inquiries.id`
  - `group_inquiry_id` (uuid, nullable) → `group_inquiries.id`
  - `itinerary_id` (uuid, nullable) → `itineraries.id`
  - `hotel_name` (varchar)
  - `hotel_address` (text, nullable)
  - `hotel_contact` (varchar, nullable)
  - `guest_name` (varchar)
  - `nationality` (varchar, nullable)
  - `pax_adults` (integer, default: 0)
  - `pax_children` (integer, default: 0)
  - `pax_infants` (integer, default: 0)
  - `room_type` (varchar, nullable)
  - `room_category` (varchar, nullable)
  - `no_of_rooms` (integer, default: 1)
  - `meal_plan` (varchar, nullable)
  - `check_in_date` (date)
  - `check_out_date` (date)
  - `no_of_nights` (integer, nullable)
  - `arrival_time` (varchar, nullable)
  - `departure_time` (varchar, nullable)
  - `room_rate_currency` (varchar, default: 'USD')
  - `room_rate_sgl` (numeric, nullable)
  - `room_rate_dbl` (numeric, nullable)
  - `room_rate_tpl` (numeric, nullable)
  - `confirmed_by` (varchar, nullable)
  - `confirmed_date` (date, nullable)
  - `booked_by` (varchar, nullable)
  - `booked_date` (date, nullable)
  - `remarks` (text, nullable)
  - `is_amendment` (boolean, default: false)
  - `amendment_number` (integer, default: 0)
  - `amendment_confirmed_by` (varchar, nullable)
  - `original_voucher_id` (uuid, nullable) → `hotel_vouchers.id` (self-reference)
  - `status` (varchar, default: 'draft')
  - `created_at` (timestamptz, default: now())
  - `updated_at` (timestamptz, default: now())

### 13. **feedback**
- **RLS Enabled:** Yes
- **Primary Key:** `id`
- **Columns:**
  - `id` (uuid) - Primary Key
  - `inquiry_id` (uuid, nullable) → `inquiries.id`
  - `group_inquiry_id` (uuid, nullable) → `group_inquiries.id`
  - `itinerary_id` (uuid, nullable) → `itineraries.id`
  - `tour_id` (uuid, nullable) → `tours.id`
  - `driver_id` (uuid, nullable) → `drivers.id`
  - `token_id` (uuid, nullable) → `feedback_tokens.id`
  - `guest_name` (text)
  - `guest_email` (text)
  - `country` (text, nullable)
  - `age_group` (text, nullable) - Check: 'Under 18', '18-25', '26-35', '36-45', '46-60', '60+'
  - `airport_welcome_score` (integer, nullable) - Check: 0-100
  - `hotel_quality_scores` (jsonb, default: '{}')
  - `driver_language_score` (integer, nullable) - Check: 0-100
  - `driver_appearance_score` (integer, nullable) - Check: 0-100
  - `driver_hospitality_score` (integer, nullable) - Check: 0-100
  - `driver_helpfulness_score` (integer, nullable) - Check: 0-100
  - `vehicle_quality_score` (integer, nullable) - Check: 0-100
  - `vehicle_cleanliness_score` (integer, nullable) - Check: 0-100
  - `vehicle_comfort_score` (integer, nullable) - Check: 0-100
  - `overall_experience_score` (integer, nullable) - Check: 0-100
  - `remarks` (text, nullable) - Check: length <= 800
  - `submitted_at` (timestamptz, default: now())
  - `created_at` (timestamptz, default: now())
  - `updated_at` (timestamptz, default: now())

### 14. **feedback_tokens**
- **RLS Enabled:** Yes
- **Primary Key:** `id`
- **Columns:**
  - `id` (uuid) - Primary Key
  - `token` (text, unique)
  - `inquiry_id` (uuid, nullable) → `inquiries.id`
  - `group_inquiry_id` (uuid, nullable) → `group_inquiries.id`
  - `itinerary_id` (uuid, nullable) → `itineraries.id`
  - `tour_id` (uuid, nullable) → `tours.id`
  - `expires_at` (timestamptz)
  - `used_at` (timestamptz, nullable)
  - `created_at` (timestamptz, default: now())
  - `created_by` (uuid, nullable) → `auth.users.id`

## SQL Query to Get Schema

You can also run this SQL query in Supabase SQL Editor to get detailed schema:

```sql
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default,
    CASE 
        WHEN pk.column_name IS NOT NULL THEN 'PRIMARY KEY'
        WHEN fk.column_name IS NOT NULL THEN 'FOREIGN KEY -> ' || fk.foreign_table_name || '.' || fk.foreign_column_name
        ELSE ''
    END as key_info
FROM 
    information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    LEFT JOIN (
        SELECT ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku 
            ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
    ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
    LEFT JOIN (
        SELECT 
            ku.table_name,
            ku.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS ku
            ON tc.constraint_name = ku.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
    ) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY 
    t.table_name, 
    c.ordinal_position;
```

## Alternative: Using Supabase CLI

```bash
# Generate TypeScript types (includes schema info)
npx supabase gen types typescript --project-id tvxwjknpdzvuovjgqvvi > types/database.ts
```
