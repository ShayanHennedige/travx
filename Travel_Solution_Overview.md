# TripSuite - Comprehensive Solution Architecture & Process Flow

## 1. Executive Summary
TripSuite (formerly Serendia) is an advanced, 360° Travel Agency Management System built to orchestrate the end-to-end lifecycle of a travel agency's operations. The platform seamlessly bridges the gap between initial client acquisition, complex multi-day itinerary generation, on-ground logistical tracking, and final financial reconciliation. 

## 2. High-Level System Architecture

```mermaid
graph TD
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef backend fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef database fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff;
    classDef external fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff;

    Client((Agency Staff)) <-->|Web Access| NextApp

    subgraph Frontend Application
        NextApp["Next.js 16 App Router"]:::frontend
        UI["React 19 / Tailwind / Radix UI"]:::frontend
        NextApp --> UI
    end

    subgraph Backend Infrastructure
        SupabaseAuth["Supabase Auth / RLS"]:::backend
        API["Next.js API & Edge Functions"]:::backend
        Puppeteer["Puppeteer PDF Engine"]:::backend
        Excel["ExcelJS Export Engine"]:::backend
        NextApp <--> API
        NextApp <--> SupabaseAuth
        API --> Puppeteer
        API --> Excel
    end

    subgraph Data Layer
        PostgreSQL[("Supabase PostgreSQL")]:::database
        SupabaseAuth --> PostgreSQL
        API <--> PostgreSQL
    end
```

## 3. Inquiry-to-Tour Process Flow

This flow maps out how a raw inquiry is converted into a structured, confirmed tour with accurate financial backing.

```mermaid
sequenceDiagram
    actor Agent
    participant Inquiries
    participant Itineraries
    participant Costing
    participant Tours

    Agent->>Inquiries: 1. Capture Client Request (Pax, Dates, Budget)
    activate Inquiries
    Inquiries-->>Agent: Inquiry Created (Status: New)
    
    Agent->>Itineraries: 2. Generate Itinerary (Manual or AI-based)
    activate Itineraries
    Itineraries->>Inquiries: Link Itinerary to Inquiry
    Itineraries-->>Agent: Itinerary Drafted 

    Agent->>Costing: 3. Create Costing Sheet (Hotel Rates, Transport, Margins)
    activate Costing
    Costing->>Itineraries: Syncs with generated routing
    Costing-->>Agent: Costing Finalized & Quotation Sent
    
    Agent->>Inquiries: 4. Client Approves Quote
    Inquiries->>Tours: 5. Convert Inquiry to Active Tour
    activate Tours
    Tours-->>Agent: Tour Activated (Dashboard Updated)
    deactivate Inquiries
    deactivate Itineraries
    deactivate Costing
```

### Module Breakdown
- **Inquiry Management (`/inquiries`)**: Standardizes client input. Supports individual or group travel parameters, prioritizing leads mathematically (Low, Medium, High, Urgent).
- **Itineraries (`/itineraries`)**: Uses hotel rate data and POI mappings to craft dynamic, visually appealing itineraries.
- **Costing Sheet (`/costing-sheet`)**: The central financial calculator for the quotation phase. It pulls room rates, calculates vehicle mileage, and adds profit margins in real-time.

## 4. On-Ground Operations & Booking Flow

Once a Tour is active, the operations team ensures suppliers are booked and logistics are sorted.

```mermaid
stateDiagram-v2
    [*] --> TourActive
    
    state TourActive {
        direction LR
        CustomerInvoicing: Customer Invoice Generation
        BookingVouchers: Supplier Vouchers
        Rooming: Rooming Lists
        
        CustomerInvoicing --> BookingVouchers: Collect Deposit
        BookingVouchers --> Rooming: Confirm Hotels
    }
    
    TourActive --> Execution_Phase
    
    state Execution_Phase {
        DriverAssignment: Driver Allocated
        LogSheet: Driver Log Sheet Active
        DriverAssignment --> LogSheet: Driver Enters Mileage & Tolls
    }
```

### Module Breakdown
- **Customer Invoices (`/customer-invoices`)**: Validates the agreed total from the Costing Sheet. Supports multiple installments, manual subtotal adjustments, and PDF receipts.
- **Supplier Vouchers (`/vouchers`)**: Official communication dispatched to hotels and external service providers ensuring booked reservations. Decoupled from the costing sheet so ad-hoc changes can be made safely.
- **Rooming Lists (`/rooming-list`)**: Detailed breakdown of pax distribution per room (e.g., SGL, DBL, TWIN) tied tightly to specific hotel vouchers.
- **Driver Log Sheet (`/driver-log-sheet`)**: A crucial operational document used during the tour execution. Drivers record exact mileage, external fuel expenses, and tolls. Allows saving as Draft before strict finalization.

## 5. Profit & Loss (P&L) Reconciliation Flow

The P&L module acts as the financial ground-truth center. It isolates confirmed income and deducts all paid expenses.

```mermaid
graph TD
    classDef income fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef expense fill:#ef4444,stroke:#b91c1c,stroke-width:2px,color:#fff;
    classDef neutral fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef final fill:#f59e0b,stroke:#b45309,stroke-width:3px,color:#fff;

    CS["1. Costing Sheet / Final Invoices"]:::income
    CS --> |Authoritative Income Source| PNL(("Tour P&L Engine"))

    PV["2. Payment Vouchers"]:::expense
    PV --> |Supplier Deductions| PNL

    DS["3. Finalized Driver Log Sheet"]:::expense
    DS --> |LKR to USD Conversion| PNL

    ME["4. Ad-Hoc Misc Expenses"]:::expense
    ME --> |Direct Dashboard Input| PNL

    PNL --> NetProfit["Net Tour Profitability"]:::final
```

### Execution Rules for P&L:
1. **Income Priority:** The final agreed amount on the *Costing Sheet* is treated as the primary income source. It falls back to invoices if there are specific overrides.
2. **Double-Count Prevention:** Once a driver Log Sheet is finalized, the P&L engine intelligently ignores any generic transport estimates inside payment vouchers, relying solely on the real-world LKR ground truth (converted to USD).
3. **Ghost Record Isolation:** "Unknown" or untracked vouchers are inherently stripped out from individual Tour P&L to ensure an agent's individual profitability metrics are protected from generic admin overheads.

## 6. Access Control & Admin Privileges

Operational integrity is preserved by restricting destructive or overriding actions:
- **Admin PIN Modals:** Sensitive actions, such as un-finalizing a driver's log sheet, force-editing an old P&L, or updating locked vouchers, require a secondary Admin PIN challenge.
- **RLS (Row Level Security):** All Supabase queries ensure a user can only alter entities within their established permission boundaries.
