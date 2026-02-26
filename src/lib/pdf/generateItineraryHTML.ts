import { format } from "date-fns";

interface ItineraryDay {
  day: number;
  date: string;
  title: string;
  overnight_location: string;
  hotel_suggestion: string;
  day_total_km?: string;
  activities: {
    time: string;
    activity: string;
    location: string;
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
  hotel_type: string;
  room_category?: string;
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

function generateDayHTML(day: ItineraryDay, isLastDay: boolean = false): string {
  const dayDate = day.date ? new Date(day.date) : null;
  const dateFormatted = dayDate ? formatDateWithSuffix(day.date) : "";
  const dayOfWeek = dayDate ? format(dayDate, "EEEE") : "";

  // Extract travel times and distances from activities
  const travelActivities = day.activities.filter(a => a.driving_time || a.driving_distance_km);
  
  const activitiesList = day.activities
    .map(a => `<li>${a.activity}</li>`)
    .join("");

  const travelTimesList = travelActivities.length > 0 
    ? `
      <p class="label">Travel Time & Distance:</p>
      <ul>
        ${travelActivities.map(a => {
          const timePart = a.driving_time ? `approx. <strong>${a.driving_time}</strong>` : "";
          const distancePart = a.driving_distance_km ? `<strong>${a.driving_distance_km}</strong>` : "";
          const parts = [timePart, distancePart].filter(Boolean);
          return `<li>${a.location}: ${parts.join(" • ")}</li>`;
        }).join("")}
      </ul>
    ` 
    : "";

  // Don't show overnight/hotel info for departure day (last day)
  const overnightSection = isLastDay 
    ? "" 
    : `
      <p><strong>Overnight:</strong> ${day.overnight_location}</p>
      <p><strong>Hotel:</strong> ${day.hotel_suggestion}</p>
      <p><strong>Meals:</strong> Bed & Breakfast</p>
    `;

  return `
    <div class="day-card">
      <p class="day-header">Day ${String(day.day).padStart(2, "0")} / ${dateFormatted} – ${dayOfWeek} | ${day.title}</p>
      
      <ul>
        ${activitiesList}
      </ul>

      ${travelTimesList}

      ${day.day_total_km ? `<p class="label">Total Distance for Day: <strong>${day.day_total_km}</strong></p>` : ""}

      ${overnightSection}
    </div>
  `;
}

export function generateItineraryHTML(
  itinerary: ItineraryContent,
  inquiry: InquiryData | null
): string {
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

  // Build accommodation summary
  // Exclude last day (departure day) as there's no overnight stay
  const accommodationMap = new Map<string, { hotel: string; nights: number }>();
  const daysWithOvernight = itinerary.days.slice(0, -1); // Exclude departure day
  
  daysWithOvernight.forEach((day) => {
    if (day.overnight_location && day.hotel_suggestion) {
      const key = day.overnight_location;
      if (accommodationMap.has(key)) {
        const existing = accommodationMap.get(key)!;
        existing.nights += 1;
      } else {
        accommodationMap.set(key, { hotel: day.hotel_suggestion, nights: 1 });
      }
    }
  });

  const accommodationRows = Array.from(accommodationMap.entries())
    .map(([location, data]) => `
      <tr>
        <td>${location}</td>
        <td>${data.hotel}</td>
        <td>${inquiry?.room_category || "Deluxe"}</td>
        <td class="basis-cell">BB</td>
      </tr>
    `)
    .join("");

  // Split days into odd (left column) and even (right column)
  const totalDays = itinerary.days.length;
  const oddDays = itinerary.days.filter((_, i) => i % 2 === 0);
  const evenDays = itinerary.days.filter((_, i) => i % 2 === 1);

  const leftColumnHTML = oddDays.map(day => generateDayHTML(day, day.day === totalDays)).join("");
  const rightColumnHTML = evenDays.map(day => generateDayHTML(day, day.day === totalDays)).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sri Lanka Itinerary - ${inquiry?.inquiry_number || "Travel Plan"}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 10mm 20mm 10mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 12px;
      line-height: 1.5;
      color: #000;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 15px;
      border-bottom: 2px solid #000;
      margin-bottom: 20px;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
      font-weight: bold;
    }

    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #1d4ed8;
    }

    .company-tagline {
      font-size: 10px;
      color: #666;
    }

    .company-details {
      text-align: right;
      font-size: 10px;
      color: #333;
      line-height: 1.6;
    }

    /* Trip Info Section */
    .trip-info {
      margin-bottom: 20px;
    }

    .ref-line {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .pax-line {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 3px;
    }

    .client-line {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 15px;
    }

    .trip-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .trip-details p {
      font-size: 12px;
      margin-bottom: 2px;
    }

    /* Two Column Layout for Days */
    .days-container {
      display: flex;
      gap: 20px;
      margin-bottom: 30px;
    }

    .days-column {
      flex: 1;
    }

    .day-card {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #ddd;
    }

    .day-card:last-child {
      border-bottom: none;
    }

    .day-header {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .day-card ul {
      margin-left: 20px;
      margin-bottom: 10px;
    }

    .day-card li {
      font-size: 12px;
      margin-bottom: 5px;
    }

    .day-card .label {
      font-size: 12px;
      font-weight: bold;
      margin-top: 10px;
      margin-bottom: 5px;
    }

    .day-card p {
      font-size: 12px;
      margin-bottom: 3px;
    }

    /* Accommodation Section */
    .accommodation-section {
      margin-top: 20px;
      page-break-inside: avoid;
    }

    .accommodation-title {
      font-size: 14px;
      font-weight: bold;
      font-style: italic;
      text-decoration: underline;
      margin-bottom: 15px;
    }

    table.accommodation {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    table.accommodation th {
      background-color: #f5f5f5;
      border: 1px solid #000;
      padding: 8px 10px;
      text-align: left;
      font-style: italic;
      font-weight: bold;
      color: #4a5a2a;
    }

    table.accommodation td {
      border: 1px solid #000;
      padding: 8px 10px;
      vertical-align: top;
    }

    table.accommodation .basis-cell {
      color: #b91c1c;
      font-weight: bold;
    }

    @media print {
      .day-card {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <!-- Header with TravX Details -->
  <div class="header">
    <div class="logo-section">
      <div class="logo">TX</div>
      <div>
        <div class="company-name">TravX</div>
        <div class="company-tagline">Sri Lanka Travel Specialists</div>
      </div>
    </div>
    <div class="company-details">
      <strong>TravX Holidays (Pvt) Ltd</strong><br>
      63A, Old Road, Pannipitiya<br>
      Colombo, Sri Lanka<br>
      Tel: +94 11 2817781 | Mob: +94 77 3469998<br>
      Email: info@travx.com | www.travx.com
    </div>
  </div>

  <!-- Trip Reference Info -->
  <div class="trip-info">
    <p class="ref-line">SRI LANKA. <span style="font-weight: normal;">Dossier Ref. ${inquiry?.inquiry_number || "TRV/2026/001"}</span></p>
    <p class="pax-line">Tailor Made Tour – ${String(totalPax).padStart(2, "0")} pax</p>
    <p class="client-line">${clientName}</p>

    <hr style="border: none; border-top: 1px solid #000; margin: 15px 0;">

    <p class="trip-title">Luxury Sri Lanka Itinerary – ${String(nights).padStart(2, "0")} Nights / ${String(nights + 1).padStart(2, "0")} Days</p>
    <div class="trip-details">
      <p><strong>Basis:</strong> ${inquiry?.hotel_type || "Bed & Breakfast"} | <strong>Guests:</strong> ${String(totalPax).padStart(2, "0")} Pax</p>
      <p><strong>Arrival:</strong> ${format(arrivalDate, "EEEE, dd MMMM")}</p>
      <p><strong>Departure:</strong> ${format(departureDate, "EEEE, dd MMMM")}</p>
      ${itinerary.total_distance_km ? `<p><strong>Total Distance:</strong> ${itinerary.total_distance_km}</p>` : ""}
    </div>
  </div>

  <hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">

  <!-- Two Column Day Layout (Odd / Even) -->
  <div class="days-container">
    <div class="days-column">
      ${leftColumnHTML}
    </div>
    <div class="days-column">
      ${rightColumnHTML}
    </div>
  </div>

  <!-- Accommodation Summary -->
  <div class="accommodation-section">
    <p class="accommodation-title">Accommodation</p>
    <table class="accommodation">
      <thead>
        <tr>
          <th style="width: 25%;">Location</th>
          <th style="width: 40%;">${inquiry?.hotel_type || "5*"} Hotels</th>
          <th style="width: 20%;">Room</th>
          <th style="width: 15%;">Basis</th>
        </tr>
      </thead>
      <tbody>
        ${accommodationRows}
      </tbody>
    </table>
  </div>

</body>
</html>
  `;
}
