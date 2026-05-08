# Component Test Cases

This document lists practical unit and functional test cases for each component in src/components and src/app.

## src/components/AdminPinModal.tsx
- Unit: renders title/description, disables verify while verifying, shows error on invalid PIN, resets state on close.
- Functional: Enter triggers verify, Escape closes, successful verify calls onAuthorized with PIN.

## src/components/VersionHistoryPanel.tsx
- Unit: fetches versions on open, renders version list and selected version details, shows loading state.
- Functional: clicking a version updates details panel, close button calls onClose.

## src/components/feedback/GenerateFeedbackLink.tsx
- Unit: renders inputs and button states, validation of required fields, copied state resets after timeout.
- Functional: generates link via API, copies to clipboard, handles API error with message.

## src/components/itinerary/ItineraryDisplay.tsx
- Unit: renders day sections with titles, handles missing optional fields gracefully, stable ordering by day.
- Functional: long itinerary renders without layout break.

## src/components/itinerary/ItineraryGenerator.tsx
- Unit: generate button toggles loading, edit panel toggles, error state displays on failed fetch.
- Functional: POST /api/itinerary/generate renders new itinerary; edit request POST updates content; retry after error succeeds.

## src/components/layout/AppLayout.tsx
- Unit: renders header/sidebar slots and children, applies layout container classes.
- Functional: responsive layout displays sidebar/header correctly on mobile and desktop.

## src/components/layout/Header.tsx
- Unit: renders title/subtitle/action areas, hides optional areas when undefined.
- Functional: action buttons invoke provided handlers.

## src/components/layout/Sidebar.tsx
- Unit: renders nav entries with active state.
- Functional: navigation links route to target pages.

## src/components/ui/Badge.tsx
- Unit: renders label with variant class, supports custom className.
- Functional: snapshot of common variants for regression.

## src/components/ui/Button.tsx
- Unit: renders label/children, respects disabled, shows loading state.
- Functional: click triggers handler once, disabled prevents click.

## src/components/ui/Card.tsx
- Unit: renders children and optional header areas.
- Functional: snapshot of default and outlined variants.

## src/components/ui/Input.tsx
- Unit: renders value/placeholder, forwards onChange.
- Functional: typing updates controlled value and triggers onChange.

## src/components/ui/LoadingScreen.tsx
- Unit: renders spinner and text.
- Functional: appears when host component is loading.

## src/components/ui/RoomQuantitySelector.tsx
- Unit: increments/decrements value, clamps at min, calls onChange.
- Functional: clicking plus/minus updates UI and value.

## src/components/ui/Select.tsx
- Unit: renders options and selected value.
- Functional: changing selection triggers onChange and updates value.

## src/components/ui/Textarea.tsx
- Unit: renders value/rows and onChange.
- Functional: user input updates value and triggers onChange.

## src/app/analytics/AnalyticsDashboard.tsx
- Unit: filter controls update state, loading and empty states render, error state shows message.
- Functional: changing filters triggers GET /api/analytics/feedback and updates charts.

## src/app/analytics/page.tsx
- Unit: renders AnalyticsDashboard wrapper.
- Functional: page loads without data errors.

## src/app/dashboard/AnalyticsSection.tsx
- Unit: renders chart cards with provided data.
- Functional: user selects period or filter and chart updates.

## src/app/dashboard/DashboardContent.tsx
- Unit: toggles between dashboard and tracker modes, renders stats cards.
- Functional: switching view retains previously loaded data.

## src/app/dashboard/LiveStatusTracker.tsx
- Unit: paginates items, renders correct status tags.
- Functional: next/prev page changes visible items and links navigate.

## src/app/dashboard/TourTracker.tsx
- Unit: month navigation updates calendar grid, tab filter changes tours list.
- Functional: selecting a tour shows details with correct driver info.

## src/app/dashboard/loading.tsx
- Unit: renders loading state.
- Functional: appears during dashboard data fetch.

## src/app/dashboard/page.tsx
- Unit: renders DashboardContent wrapper.
- Functional: page renders with server data and no crash.

## src/app/drivers/DriversList.tsx
- Unit: search filters results, add/edit form validation, delete confirm flow.
- Functional: create/update/delete requests succeed and refresh list.

## src/app/drivers/LogSheetView.tsx
- Unit: calculates totals and excess mileage, handles finalized state.
- Functional: loads tour/log data, finalize flow posts and locks inputs, session expiry redirects.

## src/app/drivers/TourAssignmentSection.tsx
- Unit: tabs filter tours (pending/upcoming/ongoing/completed), driver availability conflict detection.
- Functional: assign/unassign driver or guide persists via PUT and refreshes, log sheet download works.

## src/app/drivers/TourGuidesList.tsx
- Unit: language selection, edit mode and validation.
- Functional: CRUD operations call API and update list.

## src/app/drivers/page.tsx
- Unit: renders drivers module shell.
- Functional: list loads and actions are visible.

## src/app/feedback/page.tsx
- Unit: renders feedback entry page components.
- Functional: feedback submission succeeds and shows confirmation.

## src/app/group-inquiries/[id]/GroupInquiryStatusUpdate.tsx
- Unit: dropdown opens/closes, disables while updating, keeps current status highlighted.
- Functional: status update via Supabase refreshes page and shows error on failure.

## src/app/group-inquiries/[id]/GroupItineraryQuickActions.tsx
- Unit: shows existing itinerary card vs generate state, loading and error states.
- Functional: POST /api/itinerary/generate-group redirects to itinerary page on success.

## src/app/group-inquiries/[id]/RoomingListManager.tsx
- Unit: drag/drop assigns members to rooms, capacity constraints enforced, interconnections toggle.
- Functional: save persists assignments and reload restores state.

## src/app/group-inquiries/[id]/page.tsx
- Unit: renders group inquiry detail layout.
- Functional: quick actions appear based on existing itinerary.

## src/app/group-inquiries/loading.tsx
- Unit: renders loading state.
- Functional: appears during group inquiry page fetch.

## src/app/group-inquiries/page.tsx
- Unit: renders group inquiries list container.
- Functional: filtering/search updates list.

## src/app/hotel-rates/page.tsx
- Unit: renders rates list and filters.
- Functional: CRUD operations update list and validate required fields.

## src/app/inquiries/InquiriesListWithToggle.tsx
- Unit: toggle switches between individual/group data, filters/searches correctly.
- Functional: delete confirms and removes item, edit link navigates.

## src/app/inquiries/[id]/GenerateFeedbackLinkButton.tsx
- Unit: options panel toggles, copied state resets after timeout.
- Functional: generates link with expected query params and copies to clipboard.

## src/app/inquiries/[id]/InquiryQuickEdit.tsx
- Unit: edit mode toggle, save/cancel behavior, error state when update fails.
- Functional: Supabase update persists and refreshes view.

## src/app/inquiries/[id]/InquiryStatusUpdate.tsx
- Unit: dropdown opens/closes, disables while updating, ignores unchanged status.
- Functional: PUT /api/inquiries/{id}/status refreshes and shows error on failure.

## src/app/inquiries/[id]/ItineraryQuickActions.tsx
- Unit: render existing itinerary card vs generate button, loading state.
- Functional: POST /api/itinerary/generate redirects to itinerary page.

## src/app/inquiries/[id]/ProposalQuickActions.tsx
- Unit: tier selection validation, disables while generating, error display.
- Functional: proposal creation and version generation navigate to proposal page.

## src/app/inquiries/[id]/page.tsx
- Unit: renders inquiry detail shell.
- Functional: action widgets display correctly based on data.

## src/app/inquiries/loading.tsx
- Unit: renders loading state.
- Functional: appears while loading inquiries.

## src/app/inquiries/page.tsx
- Unit: renders inquiries list container.
- Functional: list loads and filter/search works.

## src/app/inquiry/GroupInquiryForm.tsx
- Unit: validates required fields, dynamic members update with pax, room selectors update counts.
- Functional: POST /api/inquiries/group succeeds and redirects; errors keep input and show message.

## src/app/inquiry/IndividualInquiryForm.tsx
- Unit: validation, activity selection, room selectors.
- Functional: POST /api/inquiries/individual succeeds and redirects; errors displayed.

## src/app/inquiry/page.tsx
- Unit: renders form selector layout.
- Functional: switching between forms preserves expected default values.

## src/app/invoices/new/page.tsx
- Unit: loads itinerary/inquiry/costing, calculates subtotal/tax/total correctly, edit rate toggles.
- Functional: POST /api/customer-invoices saves, downloads PDF, redirects to /operations.

## src/app/invoices/page.tsx
- Unit: renders invoice list container.
- Functional: filters and actions behave as expected.

## src/app/itineraries/[id]/CostingSheetForm.tsx
- Unit: add/remove rows, calculations per row and category, validation of numeric fields.
- Functional: rate lookup populates row; save persists; locked state blocks edits; PIN gate for past docs.

## src/app/itineraries/[id]/CostingSheetSection.tsx
- Unit: toggle opens/closes drawer, body scroll lock toggles with open state.
- Functional: saving via CostingSheetForm closes drawer.

## src/app/itineraries/[id]/CostingSheetToggleButton.tsx
- Unit: label changes when costing sheet exists, onClick fires.
- Functional: clicking opens costing drawer in parent.

## src/app/itineraries/[id]/DownloadCostingSheetButtons.tsx
- Unit: disables while downloading, handles errors.
- Functional: fetches PDF/Excel and triggers file download with correct filename.

## src/app/itineraries/[id]/DownloadPDFButton.tsx
- Unit: dropdown opens/closes, disabled options when costing not finalized, loading state labels.
- Functional: preview opens new tab; download saves file with correct naming; error shows alert.

## src/app/itineraries/[id]/FinalizeTourButton.tsx
- Unit: prerequisites gating, confirm modal opens, decline/reactivate flows require PIN.
- Functional: POST /api/tours creates tour; decline/reactivate endpoints called with passcode; refresh occurs.

## src/app/itineraries/[id]/GeneratePaymentVouchersButton.tsx
- Unit: hidden when existingCount > 0, disabled when hasVouchers false, message rendering.
- Functional: POST /api/payment-vouchers/generate and refresh on success; error displays message.

## src/app/itineraries/[id]/GenerateVouchersButton.tsx
- Unit: hotel grouping merges continuous stays, modal shows grouped hotels, disabled when isDisabled.
- Functional: POST /api/vouchers generates vouchers and refreshes; error shows alert.

## src/app/itineraries/[id]/ItineraryEditor.tsx
- Unit: edit toggles, modified day tracking, regenerate day updates only target day.
- Functional: POST /api/itinerary/{id}/regenerate-day updates UI; errors displayed.

## src/app/itineraries/[id]/WorkflowActions.tsx
- Unit: step statuses computed from props, progress bar percentage correct.
- Functional: clicking actions launches each step (costing, invoice, finalize, voucher generation).

## src/app/itineraries/[id]/page.tsx
- Unit: renders itinerary detail shell.
- Functional: loads editor and workflow sections.

## src/app/itineraries/loading.tsx
- Unit: renders loading state.
- Functional: appears during itinerary load.

## src/app/itineraries/ItinerariesList.tsx
- Unit: grouping and sorting logic, delete confirmation flow.
- Functional: delete removes itinerary and refreshes, search filters items.

## src/app/itineraries/page.tsx
- Unit: renders itineraries list container.
- Functional: list loads and filters.

## src/app/login/page.tsx
- Unit: validation for required fields and disabled submit.
- Functional: login success navigates, failure shows error.

## src/app/operations/OperationsList.tsx
- Unit: group expand/collapse, variant selection by group.
- Functional: filter/search updates visible operations.

## src/app/operations/page.tsx
- Unit: renders operations list shell.
- Functional: list loads and filters.

## src/app/payment-vouchers/PaymentVouchersList.tsx
- Unit: search and category filter logic, loading state per download.
- Functional: PDF download triggers fetch and file download; error shows alert.

## src/app/payment-vouchers/[id]/PaymentVoucherForm.tsx
- Unit: auto-calculations for totals, PIN gating for past docs, version snapshot trigger.
- Functional: PUT /api/payment-vouchers saves, POST /api/document-versions writes version.

## src/app/payment-vouchers/[id]/page.tsx
- Unit: renders form with initial data.
- Functional: save flow persists and redirects if defined.

## src/app/payment-vouchers/loading.tsx
- Unit: renders loading state.
- Functional: appears while fetching vouchers.

## src/app/payment-vouchers/page.tsx
- Unit: renders vouchers list container.
- Functional: list loads, filter works.

## src/app/pnl/PnlDashboard.tsx
- Unit: range selection updates state, loading and error states.
- Functional: GET /api/pnl/summary fetches and charts update per range.

## src/app/pnl/[tourId]/PnlDetail.tsx
- Unit: renders loading/empty states, computes expense chart data and percent columns.
- Functional: fetches pnl/invoices/vouchers; uploads log sheet; adds misc expense and refreshes.

## src/app/pnl/[tourId]/page.tsx
- Unit: renders PnlDetail wrapper.
- Functional: loads data for selected tour.

## src/app/pnl/monthly/page.tsx
- Unit: renders summary cards and chart data transformation.
- Functional: fetches monthly data and month detail, view link navigates to tour PnL.

## src/app/pnl/page.tsx
- Unit: renders PnL dashboard shell.
- Functional: dashboard loads data.

## src/app/profile/page.tsx
- Unit: renders profile detail form and validation.
- Functional: profile update persists and refreshes.

## src/app/proposals/[id]/ProposalVersionTabs.tsx
- Unit: active tab state, clone button disabled while cloning.
- Functional: POST /api/proposals/{id}/clone adds new version and switches tab.

## src/app/proposals/[id]/page.tsx
- Unit: renders proposal view shell.
- Functional: tabs and actions load based on data.

## src/app/proposals/loading.tsx
- Unit: renders loading state.
- Functional: shows during proposal load.

## src/app/quote/[uuid]/ClientQuoteView.tsx
- Unit: version selection updates displayed pricing, passenger form validation.
- Functional: submit acceptance posts to /api/quote/{id}/accept and shows success.

## src/app/quote/[uuid]/page.tsx
- Unit: renders quote view shell.
- Functional: version tabs and CTA render for valid token.

## src/app/vouchers/VouchersList.tsx
- Unit: search filters vouchers, grouping and sorting logic, expand/collapse behavior.
- Functional: complete-all updates statuses; PDF download works; rooming list view/download works; deletion requires PIN and removes voucher.

## src/app/vouchers/[id]/VoucherEditor.tsx
- Unit: room rate matrix validation, amendment fields and derived totals.
- Functional: PUT save persists, amendment tracks original.

## src/app/vouchers/[id]/page.tsx
- Unit: renders voucher editor with loaded data.
- Functional: save persists and refreshes.

## src/app/vouchers/[id]/rooming-list/VoucherRoomingListClient.tsx
- Unit: grouping by room number, update member fields, add/remove tour guide.
- Functional: save updates via PUT; generate PDF opens new tab.

## src/app/vouchers/[id]/rooming-list/page.tsx
- Unit: renders rooming list page shell.
- Functional: passes props to client component and renders list.

## src/app/vouchers/page.tsx
- Unit: renders vouchers list container.
- Functional: list loads and actions available.

## src/app/loading.tsx
- Unit: renders app loading state.
- Functional: appears during route transitions.

## src/app/layout.tsx
- Unit: wraps children with global layout and providers.
- Functional: metadata and global styles apply.

## src/app/page.tsx
- Unit: renders landing content and CTA.
- Functional: CTA navigation works.
