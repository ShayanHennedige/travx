# Summary of Changes (April 9th - April 10th, 2026)

This document summarizes the key features, bug fixes, and architectural improvements implemented in the last 48 hours.

## 1. Driver Log Sheets & PNL Integration
- **Aesthetic Overhaul**: Redesigned the Driver Log Sheet UI to follow a premium "Invoice Style" layout, improving readability and data entry.
- **Workflow Enhancements**: 
    - Implemented a **Draft Save** workflow allowing drivers/admins to save progress without finalizing.
    - Added high-quality **PDF Export** for log sheets for records and printing.
- **Financial Ground Truth**: 
    - Automated the reflection of finalized log sheet totals into the Tour P&L.
    - Implemented LKR → USD conversion logic (fixed at 300) during finalization.
    - Fixed a critical "double-counting" bug where both vouchers and log sheet data were being summed.
- **PNL Reliability**: 
    - Fixed database column errors (`reference_number` vs `tour_reference`) that were causing API crashes.
    - Ensured P&L reflects log sheet data immediately upon finalization.

## 2. Advanced Voucher & Rooming Sheet Management
- **Localized Rooming Lists**: Developed a decoupled Rooming List system. Users can now edit rooming details for a specific voucher without affecting the global costing sheet.
- **PDF Logic**: Rebuilt PDF rendering for vouchers to handle large rooming lists with automatic layout fallbacks.
- **Voucher Categories**: Added categories (Transport, Hotel, etc.) to payment vouchers, enabling advanced filtering and P&L exclusion rules (e.g., excluding "Admin" vouchers from tour profit calculations).
- **Bug Fixes**: Corrected pax count logic and index numbering in voucher tables.

## 3. P&L Dashboard & Reporting
- **Data Cleanup**: 
    - Implemented logic to filter out "Unknown" or orphaned tour records from the P&L summary.
    - Isolated unlinked items to maintain financial integrity.
- **Interactive Features**: Added an inline **"+ Add Miscellaneous Expense"** form directly within the P&L Detail view, allowing for rapid expense tracking without leaving the dashboard.
- **Authoritative Income**: Set Costing Sheet totals as the primary source of income for P&L, falling back to invoices only when necessary.

## 4. UI/UX & Security
- **Admin Access Control**: Integrated `AdminPinModal` to protect sensitive actions like editing past files or finalized tours.
- **Intelligent Dashboard**:
    - Updated the dashboard calendar to dynamically color-code ongoing tours (past days turn green).
    - Added a **Tabbed List View** for a cleaner overview of upcoming vs. ongoing tours.
- **Uniform Styling**: Standardized status colors across Inquiries, Itineraries, and Tours to ensure visual consistency throughout the application.

## 5. General Enhancements
- **Itinerary Improvements**: Added support for rendering `site_description` in the web UI.
- **Customer Invoices**: Improved layout and added manual subtotal edit capabilities.
- **System Upgrades**: Completed heavy refactoring of Phase 3 (Log Sheets) and Phase 4 (Audit/Security) system components.
