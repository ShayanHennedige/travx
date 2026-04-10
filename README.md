# Serendia Hub - 360° Travel Agency Inquiry Management System

A production-ready Inquiry Module for a Travel Agency Management System built with Next.js 16, TypeScript, Tailwind CSS, and Supabase.

## Features

### Inquiry Management
- **Complete Inquiry Capture**: Client information, trip details, travelers, preferences, and budget
- **Status Tracking**: New, In Progress, Quoted, Confirmed, Cancelled, Completed
- **Priority Levels**: Low, Medium, High, Urgent
- **Activity Logging**: Track all changes and updates to inquiries

### Technology Stack
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Validation**: Zod
- **Date Handling**: date-fns

### Database Schema
- `profiles` - User profiles linked to Supabase Auth
- `inquiries` - Main inquiry records with all travel details
- `travelers` - Individual traveler information per inquiry
- `inquiry_activities` - Activity log for audit trail

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd "Trav X"
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env.local file with:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── api/inquiries/      # API routes
│   ├── auth/               # Auth callback handlers
│   ├── dashboard/          # Dashboard page
│   ├── inquiries/          # Inquiry pages (list, detail, new)
│   ├── login/              # Login/Signup page
│   ├── globals.css         # Global styles with Tailwind
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home redirect
├── components/
│   ├── forms/              # Form components
│   ├── layout/             # Layout components (Sidebar, Header)
│   └── ui/                 # Reusable UI components
├── lib/
│   ├── supabase/           # Supabase client utilities
│   └── validations/        # Zod validation schemas
├── types/
│   └── database.ts         # TypeScript types
└── proxy.ts                # Auth session management
```

## Security

- **Row Level Security (RLS)**: All database tables have RLS policies enabled
- **Authentication**: Supabase Auth with email/password
- **Authorization**: Role-based access (admin, agent, viewer)

## Design Principles

- Minimalistic, professional travel-industry UI
- Single unified theme across all components
- No emojis or decorative icons
- Clean, enterprise-ready design

## License

MIT
