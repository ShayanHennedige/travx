import { format } from "date-fns";

interface ItineraryDay {
  day: number;
  date: string;
  title: string;
  overnight_location: string;
  hotel_suggestion: string;
  hotel_tier?: string;
  room_category?: string;
  meal_plan?: string;
  day_total_km?: string;
  activities: {
    time: string;
    activity: string;
    location: string;
    site_description?: string;
    duration: string;
    driving_time?: string;
    driving_distance_km?: string;
  }[];
  meals: {
    breakfast: string;
    lunch: string;
    dinner: string;
  };
  notes?: string;
}

interface ItineraryContent {
  title: string;
  summary: string;
  days: ItineraryDay[];
  practical_notes: string[];
  total_driving_hours: string;
  total_distance_km?: string;
}

interface InquiryData {
  inquiry_number: string;
  first_name: string;
  last_name: string;
  client_email: string;
  arriving_date: string;
  departure_date: string;
  no_of_nights: number;
  no_of_pax: number;
  no_of_children: number;
  passport_no?: string | null;
  head_passport_no?: string | null;
  country?: string | null;
  hotel_type: string;
  room_category?: string | string[];
  meal_plan?: string | string[];
  is_group?: boolean;
  rooms_dbl?: number;
  rooms_sgl?: number;
  rooms_tpl?: number;
  rooms_qtpl?: number;
}

interface PDFOptions {
  includeRates?: boolean;
  costingData?: any;
}

function formatDateWithSuffix(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const suffix = getDaySuffix(day);
  return `${day}<sup>${suffix}</sup> ${format(date, "MMM")}`;
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

function generateDayHTML(day: ItineraryDay, isLastDay: boolean = false, mealPlan: string = 'BB'): string {
  const dayDate = day.date ? new Date(day.date) : null;
  const dateFormatted = dayDate ? formatDateWithSuffix(day.date) : "";
  const dayOfWeek = dayDate ? format(dayDate, "EEEE") : "";

  const travelActivities = day.activities.filter(a => a.driving_time || a.driving_distance_km);

  const travelTimesList = travelActivities.length > 0
    ? `
      <div class="travel-info">
        ${travelActivities.map(a => {
      const timePart = a.driving_time ? `${a.driving_time}` : "";
      const distancePart = a.driving_distance_km ? `${a.driving_distance_km}` : "";
      const parts = [timePart, distancePart].filter(Boolean);
      return `${a.location}: ${parts.join(" · ")}`;
    }).join(" &nbsp;|&nbsp; ")}
      </div>
    `
    : "";

  const getMealDisplayText = (abbr: string): string => {
    switch (abbr.toUpperCase()) {
      case 'AI': return 'All Inclusive';
      case 'FB': return 'Full Board';
      case 'HB': return 'Half Board';
      case 'BB': return 'Bed & Breakfast';
      default: return 'Bed & Breakfast';
    }
  };

  const overnightSection = isLastDay
    ? ""
    : `
      <div class="overnight-info">
        <span class="ov-detail"><em>Overnight:</em> ${day.overnight_location}</span>
        <span class="ov-sep">·</span>
        <span class="ov-detail"><em>Hotel:</em> ${day.hotel_suggestion}</span>
        <span class="ov-sep">·</span>
        <span class="ov-detail"><em>Meals:</em> ${getMealDisplayText(mealPlan)}</span>
      </div>
    `;

  return `
    <div class="day-card">
      <div class="day-header">
        <span class="day-num">DAY ${String(day.day).padStart(2, "0")}</span>
        <span class="day-divider"></span>
        <div class="day-title-block">
          <span class="day-title">${day.title}</span>
          <span class="day-date">${dayOfWeek}, ${dateFormatted}</span>
        </div>
      </div>
      
      <ul class="activities">
        ${day.activities.map(a => `<li>${a.activity}${a.site_description ? `<div class="site-desc">${a.site_description}</div>` : ''}</li>`).join("")}
      </ul>

      ${travelTimesList}
      ${day.day_total_km ? `<div class="km-tag">${day.day_total_km} total</div>` : ""}
      ${overnightSection}
    </div>
  `;
}

export function generateItineraryHTML(
  itinerary: ItineraryContent,
  inquiry: InquiryData | null,
  options: PDFOptions = {}
): string {
  const { includeRates = false, costingData = null } = options;
  const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL || 'https://axcfwwdahunzxsdeohkv.supabase.co/storage/v1/object/public/logo/Serendia.png';
  const totalPax = inquiry
    ? (inquiry.no_of_pax || 0) + (inquiry.no_of_children || 0)
    : 2;

  const clientName = inquiry
    ? `${inquiry.first_name} ${inquiry.last_name}`
    : "Valued Guest";

  const arrivalDate = inquiry?.arriving_date
    ? new Date(inquiry.arriving_date)
    : itinerary.days[0]?.date
      ? new Date(itinerary.days[0].date)
      : new Date();

  const departureDate = inquiry?.departure_date
    ? new Date(inquiry.departure_date)
    : itinerary.days[itinerary.days.length - 1]?.date
      ? new Date(itinerary.days[itinerary.days.length - 1].date)
      : new Date();

  const nights = inquiry?.no_of_nights || itinerary.days.length - 1;

  const getMealPlanAbbreviation = (mealPlan?: string | string[]): string => {
    if (!mealPlan) return 'BB';
    
    // If array, grab the first element as the primary meal plan basis for the itinerary overview
    const planStr = Array.isArray(mealPlan) ? mealPlan[0] : mealPlan;
    if (typeof planStr !== 'string') return 'BB';
    
    const lowerPlan = planStr.toLowerCase();
    if (lowerPlan.includes('all inclusive') || lowerPlan === 'ai') return 'AI';
    if (lowerPlan.includes('full board') || lowerPlan === 'fb') return 'FB';
    if (lowerPlan.includes('half board') || lowerPlan === 'hb') return 'HB';
    if (lowerPlan.includes('bed & breakfast') || lowerPlan.includes('bed and breakfast') || lowerPlan === 'bb') return 'BB';
    return planStr;
  };

  const accommodationMap = new Map<string, { hotel: string; nights: number; roomCategory: string; mealPlan: string }>();
  const daysWithOvernight = itinerary.days.slice(0, -1);

  daysWithOvernight.forEach((day) => {
    if (day.overnight_location && day.hotel_suggestion) {
      const key = day.overnight_location;
      // Get day-specific properties, fallback to global inquiry properties if missing
      const globalRoomCat = Array.isArray(inquiry?.room_category) ? inquiry.room_category[0] : inquiry?.room_category;
      const globalMealPlan = Array.isArray(inquiry?.meal_plan) ? inquiry.meal_plan[0] : inquiry?.meal_plan;
      
      const dayRoomCategory = day.room_category || globalRoomCat || "Standard";
      const rawDayMealPlan = day.meal_plan || globalMealPlan || "BB";
      const dayMealPlan = getMealPlanAbbreviation(rawDayMealPlan);

      if (accommodationMap.has(key)) {
        accommodationMap.get(key)!.nights += 1;
      } else {
        accommodationMap.set(key, { 
           hotel: day.hotel_suggestion, 
           nights: 1,
           roomCategory: dayRoomCategory,
           mealPlan: dayMealPlan
        });
      }
    }
  });

  const mealPlanDisplay = getMealPlanAbbreviation(inquiry?.meal_plan);

  const accommodationRows = Array.from(accommodationMap.entries())
    .map(([location, data]) => `
      <tr>
        <td>${location}</td>
        <td>${data.hotel}</td>
        <td class="center">${data.nights} Night${data.nights > 1 ? 's' : ''}</td>
        <td class="center">${data.roomCategory}</td>
        <td class="center accent">${data.mealPlan}</td>
      </tr>
    `)
    .join("");

  const totalDays = itinerary.days.length;
  const oddDays = itinerary.days.filter((_, i) => i % 2 === 0);
  const evenDays = itinerary.days.filter((_, i) => i % 2 === 1);

  const globalMealPlanFallback = Array.isArray(inquiry?.meal_plan) ? inquiry.meal_plan[0] : inquiry?.meal_plan;

  const leftColumnHTML = oddDays.map(day => {
     const dayMp = getMealPlanAbbreviation(day.meal_plan || globalMealPlanFallback || "BB");
     return generateDayHTML(day, day.day === totalDays, dayMp);
  }).join("");
  
  const rightColumnHTML = evenDays.map(day => {
     const dayMp = getMealPlanAbbreviation(day.meal_plan || globalMealPlanFallback || "BB");
     return generateDayHTML(day, day.day === totalDays, dayMp);
  }).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${itinerary.title || "Sri Lanka Itinerary"} - ${inquiry?.inquiry_number || ""}</title>
  <style>
    @page { size: A4; margin: 14mm 16mm 16mm 16mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: "Times New Roman", "Times", Georgia, serif;
      font-size: 10.5px;
      line-height: 1.55;
      color: #2c2c2c;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 10px;
      border-bottom: 1.5px solid #2c2c2c;
      margin-bottom: 22px;
    }

    .logo { height: 42px; }

    .company-info {
      text-align: right;
      font-size: 9px;
      color: #555;
      line-height: 1.45;
    }

    .company-name {
      font-size: 13px;
      font-weight: bold;
      color: #2c2c2c;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    /* ── Hero ── */
    .hero {
      text-align: center;
      margin-bottom: 20px;
    }

    .hero-title {
      font-size: 20px;
      font-weight: normal;
      font-style: italic;
      color: #2c2c2c;
      letter-spacing: 0.4px;
      margin-bottom: 3px;
    }

    .hero-line {
      width: 60px;
      height: 1.5px;
      background: #e0c16c;
      margin: 8px auto;
    }

    .hero-sub {
      font-size: 10px;
      color: #888;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    /* ── Trip Details ── */
    .details-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 18px;
      padding: 12px 0;
      border-top: 1px solid #e5e0d8;
      border-bottom: 1px solid #e5e0d8;
    }

    .detail-group {
      text-align: center;
      flex: 1;
    }

    .detail-group + .detail-group {
      border-left: 1px solid #e5e0d8;
    }

    .detail-label {
      font-size: 7.5px;
      text-transform: uppercase;
      letter-spacing: 1.8px;
      color: #999;
      margin-bottom: 3px;
    }

    .detail-value {
      font-size: 11px;
      color: #2c2c2c;
      font-weight: bold;
    }

    /* ── Section Titles ── */
    .section-title {
      font-size: 12px;
      font-style: italic;
      color: #2c2c2c;
      margin-bottom: 12px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e0c16c;
      display: inline-block;
    }

    /* ── Day Layout ── */
    .days-container {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }

    .days-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    /* ── Day Card ── */
    .day-card {
      break-inside: avoid;
      padding-bottom: 12px;
      border-bottom: 1px dotted #d5d0c8;
    }

    .day-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .day-num {
      font-size: 8px;
      font-weight: bold;
      letter-spacing: 2px;
      color: #fff;
      background: #2c2c2c;
      padding: 3px 8px;
      border-radius: 2px;
    }

    .day-divider {
      width: 1px;
      height: 22px;
      background: #e0c16c;
    }

    .day-title-block {
      display: flex;
      flex-direction: column;
    }

    .day-title {
      font-size: 11px;
      font-weight: bold;
      color: #2c2c2c;
      line-height: 1.3;
    }

    .day-date {
      font-size: 9px;
      color: #999;
      font-style: italic;
    }

    ul.activities {
      list-style: none;
      margin: 4px 0 4px 28px;
      padding: 0;
    }

    ul.activities li {
      font-size: 10.5px;
      margin-bottom: 2px;
      color: #444;
      padding-left: 12px;
      position: relative;
    }

    ul.activities li::before {
      content: "";
      position: absolute;
      left: 0;
      top: 6px;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #c09853;
    }

    .site-desc {
      font-size: 9px;
      color: #777;
      font-style: italic;
      margin-top: 1px;
      margin-bottom: 3px;
      line-height: 1.4;
    }

    .travel-info {
      font-size: 9px;
      color: #888;
      font-style: italic;
      margin: 4px 0 4px 28px;
    }

    .km-tag {
      font-size: 9px;
      color: #c09853;
      font-weight: bold;
      margin-left: 28px;
      margin-bottom: 4px;
    }

    .overnight-info {
      font-size: 9.5px;
      color: #555;
      margin-top: 6px;
      margin-left: 28px;
      line-height: 1.6;
    }

    .ov-sep {
      color: #ccc;
      margin: 0 4px;
    }

    /* ── Accommodation Table ── */
    .accommodation-section {
      margin-top: 20px;
      break-inside: avoid;
    }

    table.accom {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }

    table.accom th {
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #888;
      font-weight: normal;
      padding: 6px 10px;
      text-align: left;
      border-bottom: 1.5px solid #2c2c2c;
    }

    table.accom td {
      padding: 8px 10px;
      border-bottom: 1px solid #eee;
      color: #333;
    }

    table.accom .center { text-align: center; }
    table.accom .accent { color: #c09853; font-weight: bold; }

    table.accom tr:last-child td {
      border-bottom: 1.5px solid #2c2c2c;
    }

    /* ── T&C Section ── */
    .tc-section {
      margin-top: 28px;
      break-inside: avoid;
      border-top: 1.5px solid #2c2c2c;
      padding-top: 16px;
    }

    .tc-rate-box {
      background: #faf8f5;
      border: 1px solid #e5e0d8;
      padding: 14px 18px;
      margin-bottom: 16px;
    }

    .tc-rate-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1.8px;
      color: #888;
      margin-bottom: 4px;
    }

    .tc-rate-value {
      font-size: 13px;
      font-weight: bold;
      color: #2c2c2c;
    }

    .tc-rate-detail {
      font-size: 10.5px;
      color: #555;
      margin-top: 4px;
    }

    .tc-columns {
      display: flex;
      gap: 24px;
      margin-top: 14px;
    }

    .tc-col {
      flex: 1;
    }

    .tc-col-title {
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #2c2c2c;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #c09853;
      display: inline-block;
    }

    .tc-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .tc-list li {
      font-size: 10.5px;
      color: #444;
      padding: 3px 0 3px 14px;
      position: relative;
    }

    .tc-list li::before {
      content: "";
      position: absolute;
      left: 0;
      top: 9px;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #c09853;
    }

    .tc-list.excludes li::before {
      background: #ccc;
    }

    /* ── Footer ── */
    .footer {
      margin-top: 28px;
      text-align: center;
      font-size: 9px;
      color: #aaa;
      font-style: italic;
    }

    .footer-line {
      width: 40px;
      height: 1px;
      background: #c09853;
      margin: 8px auto;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <img src="${logoUrl}" alt="TravX" class="logo" />
    <div class="company-info">
      <div class="company-name">TravX</div>
      63A, Old Road, Pannipitiya, Sri Lanka<br>
      +94 77 346 9998 &nbsp;·&nbsp; info@serendiaholidays.com
    </div>
  </div>

  <!-- Hero -->
  <div class="hero">
    <div class="hero-title">${itinerary.title || `Sri Lanka ${nights + 1} Day Adventure`}</div>
    <div class="hero-line"></div>
    <div class="hero-sub">Tailor-Made for ${clientName} &nbsp;·&nbsp; ${String(totalPax).padStart(2, "0")} Traveller${totalPax > 1 ? 's' : ''} &nbsp;·&nbsp; Ref ${inquiry?.inquiry_number || "—"}</div>
  </div>

  <!-- Trip Summary -->
  <div class="details-row">
    <div class="detail-group">
      <div class="detail-label">Travel Dates</div>
      <div class="detail-value">${format(arrivalDate, "dd MMM")} – ${format(departureDate, "dd MMM yyyy")}</div>
    </div>
    <div class="detail-group">
      <div class="detail-label">Duration</div>
      <div class="detail-value">${nights} Nights / ${nights + 1} Days</div>
    </div>
    <div class="detail-group">
      <div class="detail-label">Category</div>
      <div class="detail-value">${inquiry?.hotel_type || "Standard"}</div>
    </div>
    ${itinerary.total_distance_km ? `
    <div class="detail-group">
      <div class="detail-label">Total Distance</div>
      <div class="detail-value">${itinerary.total_distance_km}</div>
    </div>` : ""}
  </div>

  <!-- Itinerary -->
  <div class="section-title">Day-by-Day Itinerary</div>

  <div class="days-container">
    <div class="days-column">${leftColumnHTML}</div>
    <div class="days-column">${rightColumnHTML}</div>
  </div>

  <!-- Accommodation -->
  <div class="accommodation-section">
    <div class="section-title">Accommodation Plan</div>
    <table class="accom">
      <thead>
        <tr>
          <th>Location</th>
          <th>Hotel / Property</th>
          <th class="center">Duration</th>
          <th class="center">Room Type</th>
          <th class="center">Basis</th>
        </tr>
      </thead>
      <tbody>${accommodationRows}</tbody>
    </table>
  </div>

  ${includeRates && costingData ? (() => {
      const currency = costingData.currency || 'USD';
      const perPerson = costingData.per_person_usd?.toFixed(2) || '0.00';
      const noOfPax = costingData.no_of_pax || totalPax;

      // Determine room sharing description
      const getSharingDesc = (pax: number): string => {
        if (pax >= 4) return 'quad room';
        if (pax === 3) return 'triple room';
        if (pax === 2) return 'double room';
        return 'single room';
      };

      const accommodationSummary = (() => {
        if (accommodationMap.size === 0) {
          return `Accommodation in ${costingData.hotel_type || inquiry?.hotel_type || '4/5 star'} hotels`;
        }

        const hotelDetails = Array.from(accommodationMap.entries())
          .map(([location, data]) => `${location} – ${data.hotel} (${data.nights} Night${data.nights > 1 ? 's' : ''})`)
          .join(' / ');

        return `Accommodation in ${costingData.hotel_type || inquiry?.hotel_type || '4/5 star'} hotels – ${hotelDetails}`;
      })();

      // Build meal plan description from accommodation data
      const buildMealPlanDesc = (): string => {
        const accomData = costingData.accommodation_data || [];
        if (accomData.length === 0) return `${costingData.meal_plan || 'BB'} basis`;

        // Group by location and basis
        const locationBasis = new Map<string, string>();
        accomData.forEach((row: any) => {
          if (row.location && row.basis) {
            locationBasis.set(row.location, row.basis);
          }
        });

        if (locationBasis.size === 0) return `${costingData.meal_plan || 'BB'} basis`;

        // Check if all same basis
        const basisValues = [...new Set(locationBasis.values())];
        if (basisValues.length === 1) {
          return `${basisValues[0]} basis`;
        }

        // Different basis per location
        return Array.from(locationBasis.entries())
          .map(([loc, basis]) => `${loc} – ${basis} basis`)
          .join(' / ');
      };

      // Build includes list
      const includes: string[] = [];
      includes.push(accommodationSummary);
      includes.push(`Meal plan – ${buildMealPlanDesc()}`);

      includes.push(
        inquiry?.is_group
          ? 'Transport in a Coach with an English-speaking guide. (Group trip)'
          : 'Transport in a Car/Van with an English-speaking chauffeur guide. (FIT trip)'
      );

      // Standard excludes
      const excludes = [
        'Last-minute hotel or room or itinerary changes will incur an extra charge.',
        'Entrance tickets',
        'Tips',
        'Personal expenses',
      ];

      return `
    <div class="tc-section">
      <div class="section-title">Rates & Terms</div>

      <div class="tc-rate-box">
        <div class="tc-rate-label">Rate – ${currency} net per person</div>
        <div class="tc-rate-value">Base ${String(noOfPax).padStart(2, '0')} pax sharing ${getSharingDesc(noOfPax)} – ${currency} ${perPerson} net per person</div>
      </div>

      <div class="tc-columns">
        <div class="tc-col">
          <div class="tc-col-title">Price Includes</div>
          <ul class="tc-list">
            ${includes.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
        <div class="tc-col">
          <div class="tc-col-title">Price Does Not Include</div>
          <ul class="tc-list excludes">
            ${excludes.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
    `;
    })() : ''}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-line"></div>
    This itinerary is subject to availability at the time of booking.<br>
    Thank you for choosing <strong style="color:#2c2c2c;">TravX</strong>.
  </div>

</body>
</html>
  `;
}
