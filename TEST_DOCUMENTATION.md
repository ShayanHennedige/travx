# Testing Documentation

---

## 1) Unit Testing

*Table 7.2 – Unit Test – Hotel Rates & Core Components*

| Test ID | Test Case | Expected Result | Status | Reasoning |
|---------|-----------|-----------------|--------|-----------|
| DC-01 | DashboardContent – Should toggle between dashboard and tracker views | "Dashboard" heading visible initially; "Tour Tracker" heading and tracker component rendered after toggle | Pass | Mode toggle correctly switches the active view and renders the appropriate child component |
| FTB-01 | FinalizeTourButton – Should disable finalize when prerequisites are missing | "Finalize Tour" button is rendered as disabled when costing sheet, vouchers and invoice are all absent | Pass | Prerequisite guard correctly prevents premature tour finalization before all required steps are complete |
| FTB-02 | FinalizeTourButton – Should post finalize request after user confirmation | POST /api/tours called with method POST after user clicks "Confirm & Add to Tracker" | Pass | Confirmation modal flow correctly triggers the finalize API endpoint only after explicit user approval |
| GVB-01 | GenerateVouchersButton – Should group continuous hotel stays and post merged payload | Two consecutive nights at same hotel merged into one; POST /api/vouchers called with no_of_nights: 2 | Pass | Hotel grouping algorithm correctly merges continuous stays at the same property to avoid duplicate voucher generation |
| IL-01 | ItinerariesList – Should filter itineraries by search query | "Beach Tour" card visible initially; hidden after typing "mountain" in the search input | Pass | Client-side search filter correctly hides non-matching itineraries in real-time as the user types |
| IG-01 | ItineraryGenerator – Should generate an itinerary and render the display component | POST /api/itinerary/generate is called; itinerary display component appears in DOM | Pass | Generate flow correctly triggers the API and renders the returned itinerary in the display component |
| IG-02 | ItineraryGenerator – Should allow editing an existing itinerary via the edit panel | POST /api/itinerary/edit called after user opens edit panel, types instructions, and clicks "Apply Changes" | Pass | Edit flow correctly opens the instruction input, accepts user text, and submits the update to the API |
| ILT-01 | InquiriesListWithToggle – Should switch between Individual and Group inquiry views | "Alice Smith" visible initially; "Group Leader" visible after clicking the "Group" toggle button | Pass | Toggle correctly swaps the active dataset and re-renders the list with the appropriate inquiry type |
| PVF-01 | PaymentVoucherForm – Should auto-calculate totals from nights and rate inputs | Total (USD) field shows 300 and "LKR 90,000" is displayed when nights = 2 and rate = 150 USD | Pass | Auto-calculation logic correctly multiplies nights × rate and applies the exchange rate conversion in real-time |
| LP-01 | LoginPage – Should submit login credentials and navigate to dashboard | signInWithPassword called with correct email and password; router redirects to /dashboard | Pass | Login flow correctly collects credentials, calls Supabase auth, and navigates to the dashboard on success |
| GIF-01 | GroupInquiryForm – Should reveal agent fields when agent toggle is enabled | "Agent Name" and "Agent Email" fields appear in DOM after checking "This trip is arranged by a tour agent" | Pass | Conditional agent section correctly mounts and becomes visible when the agent toggle checkbox is activated |
| IIF-01 | IndividualInquiryForm – Should reveal agent fields when agent toggle is enabled | "Agent Name" and "Agent Email" fields appear in DOM after checking "This trip is arranged by a tour agent" | Pass | Conditional agent section correctly mounts and becomes visible when the agent toggle checkbox is activated |

---

## 2) Functional Testing

*Table 7.3 – Functional Test – Hotel Rates Module*

| Test ID | Test Case | Expected Result | Status | Reasoning |
|---------|-----------|-----------------|--------|-----------|
| HRF-01 | Should load the hotel rates form correctly | Page displays "Submit Your Hotel Rates" heading and hotel name input field on load | Pass | Form renders its core UI elements without errors on initial page load, no authentication token required |
| HRF-02 | Should prefill form when a valid token is provided | Request number "REQ-123", notes text, check-in and check-out date fields all pre-populated from mocked API response | Pass | Prefill mechanism correctly fetches token-linked request data and populates all relevant form fields on load |
| HRF-03 | Should show validation errors when required fields are missing | "Please enter the hotel name" shown on empty submit; "Please enter the hotel email" shown after name is filled | Pass | Step-wise validation correctly surfaces the next missing required field sequentially on each submission attempt |
| HRF-04 | Should allow adding and removing room categories dynamically | "Room Category 2" appears after clicking Add; removed category disappears; remaining item renumbers to "Room Category 1" | Pass | Dynamic category management correctly adds and removes entries and renumbers all remaining items sequentially |
| HRF-05 | Should successfully submit rates when all required fields are filled | "Thank You!" heading and rates submitted successfully message displayed after form submission | Pass | Full submission flow correctly sends rate payload to API and renders the success confirmation screen to the user |
| HRF-06 | Should handle API errors gracefully and display error message | "Database connection failed" error message displayed to user when API responds with HTTP 500 | Pass | Error handling correctly surfaces the server-returned error message to the UI instead of crashing or showing a generic error |
| HRA-01 | POST /api/hotel-rates/request – Should create a new rate request | Response body contains success: true, hotel_name: "Test API Hotel", a defined token, and form_url containing token= | Pass | Rate request creation persists the record, generates a unique access token, and returns a valid prefilled form URL |
| HRA-02 | POST /api/hotel-rates/batch-lookup – Should lookup rates with fuzzy matching | Response body contains a results array with one item; each result object has a found property | Pass | Batch lookup endpoint processes lookup requests and returns a structured result object even when no exact match is found |
| HRA-03 | GET /api/hotel-rates – Should list all submitted rate requests | Response is 200 OK and response body contains a requests property with the list data | Pass | List endpoint is accessible on the public middleware path and returns the correct data structure for rate request listing |
