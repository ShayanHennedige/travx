import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import puppeteer from "puppeteer";
import { format } from "date-fns";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface GroupMember {
  id: string;
  full_name: string;
  member_type: "adult" | "child";
  room_number: number | null;
  room_category: string | null;
  age_label: string | null;
  remarks: string | null;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id: groupInquiryId } = await params;
  const supabase = await createClient();

  // Fetch group inquiry
  const { data: inquiry, error: inquiryError } = await supabase
    .from("group_inquiries")
    .select("*")
    .eq("id", groupInquiryId)
    .single();

  if (inquiryError || !inquiry) {
    console.error("Error fetching group inquiry:", inquiryError);
    return NextResponse.json({ error: "Group inquiry not found" }, { status: 404 });
  }

  // Fetch group members with room assignments
  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_inquiry_id", groupInquiryId)
    .order("room_number", { ascending: true, nullsFirst: false })
    .order("member_type", { ascending: true })
    .order("created_at", { ascending: true });

  if (membersError) {
    console.error("Error fetching members:", membersError);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }

  // Get interconnections from inquiry
  const interconnections: number[][] = inquiry.room_interconnections || [];

  const htmlContent = generateRoomingListHTML(inquiry, members as GroupMember[], interconnections);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
    });

    const filename = `RoomingList-${inquiry.inquiry_number}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("Error generating rooming list PDF:", e);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function generateRoomingListHTML(
  inquiry: any, 
  members: GroupMember[], 
  interconnections: number[][]
): string {
  // Helper to check if a room is interconnected
  const getInterconnectedRoom = (roomId: number): number | null => {
    for (const pair of interconnections) {
      if (pair[0] === roomId) return pair[1];
      if (pair[1] === roomId) return pair[0];
    }
    return null;
  };

  // Group members by room number
  const roomGroups: { [key: number]: GroupMember[] } = {};

  members.forEach((member) => {
    if (member.room_number) {
      if (!roomGroups[member.room_number]) {
        roomGroups[member.room_number] = [];
      }
      roomGroups[member.room_number].push(member);
    }
  });

  // Sort room numbers
  const sortedRoomNumbers = Object.keys(roomGroups)
    .map(Number)
    .sort((a, b) => a - b);

  // Track which interconnected pairs we've already processed
  const processedInterconnections = new Set<string>();

  // Generate table rows
  let rowNumber = 1;
  let tableRows = "";
  let isFirstRoom = true;

  sortedRoomNumbers.forEach((roomNum) => {
    const roomMembers = roomGroups[roomNum];
    const interconnectedRoom = getInterconnectedRoom(roomNum);
    
    // Check if this is part of an interconnection we haven't processed yet
    let showInterconnectedTogether = false;
    let interconnectedMembers: GroupMember[] = [];
    
    if (interconnectedRoom !== null) {
      const pairKey = [Math.min(roomNum, interconnectedRoom), Math.max(roomNum, interconnectedRoom)].join("-");
      if (!processedInterconnections.has(pairKey)) {
        processedInterconnections.add(pairKey);
        showInterconnectedTogether = true;
        interconnectedMembers = roomGroups[interconnectedRoom] || [];
      } else {
        // Already processed this interconnection, skip this room
        return;
      }
    }

    // Add grey separator row before each room group (except the first)
    if (!isFirstRoom) {
      tableRows += `
        <tr class="separator-row">
          <td colspan="5"></td>
        </tr>
      `;
    }
    isFirstRoom = false;

    // Get base room category
    const baseRoomCategory = roomMembers[0]?.room_category || "Double Room";

    // Add members from this room
    roomMembers.forEach((member, index) => {
      const isFirstInRoom = index === 0;
      const ageLabel = member.age_label || (member.member_type === "adult" ? "Adult" : "Child");
      
      // Determine room category display for this row
      let roomCategoryDisplay = "";
      if (isFirstInRoom) {
        roomCategoryDisplay = baseRoomCategory === "Interconnected" ? "Double Room" : baseRoomCategory;
      }
      
      tableRows += `
        <tr>
          <td class="num-cell">${rowNumber}</td>
          <td class="name-cell">${member.full_name}</td>
          <td class="age-cell">${ageLabel}</td>
          <td class="room-cell">${roomCategoryDisplay}</td>
          <td class="remarks-cell">${member.remarks || ''}</td>
        </tr>
      `;
      rowNumber++;
    });

    // If interconnected, add members from the other room
    if (showInterconnectedTogether && interconnectedMembers.length > 0) {
      interconnectedMembers.forEach((member, index) => {
        const ageLabel = member.age_label || (member.member_type === "adult" ? "Adult" : "Child");
        const isFirstInConnectedRoom = index === 0;
        
        tableRows += `
          <tr>
            <td class="num-cell">${rowNumber}</td>
            <td class="name-cell">${member.full_name}</td>
            <td class="age-cell">${ageLabel}</td>
            <td class="room-cell">${isFirstInConnectedRoom ? 'Interconnected' : ''}</td>
            <td class="remarks-cell">${member.remarks || ''}</td>
          </tr>
        `;
        rowNumber++;
      });
    }
  });

  // Add guide row if applicable
  const hasGuide = (inquiry.rooms_sgl || 0) > 0;
  if (hasGuide) {
    tableRows += `
      <tr class="separator-row">
        <td colspan="5"></td>
      </tr>
      <tr>
        <td class="num-cell">01</td>
        <td class="name-cell">National Guide</td>
        <td class="age-cell"></td>
        <td class="room-cell">Single Room</td>
        <td class="remarks-cell">FOC</td>
      </tr>
    `;
  }

  const travelDates = inquiry.arriving_date && inquiry.departure_date
    ? `${format(new Date(inquiry.arriving_date), "dd MMM yyyy")} - ${format(new Date(inquiry.departure_date), "dd MMM yyyy")}`
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Rooming List - ${inquiry.inquiry_number}</title>
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 11px;
          line-height: 1.4;
          color: #000;
          padding: 15px 20px;
        }
        
        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 12px;
          border-bottom: 2px solid #1d4ed8;
          margin-bottom: 15px;
        }
        
        .logo-section {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .logo {
          width: 45px;
          height: 45px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          font-weight: bold;
        }
        
        .company-info h1 {
          font-size: 20px;
          font-weight: bold;
          color: #1d4ed8;
          margin-bottom: 1px;
        }
        
        .company-info .tagline {
          font-size: 9px;
          color: #64748b;
          font-style: italic;
        }
        
        .contact-info {
          text-align: right;
          font-size: 9px;
          color: #475569;
          line-height: 1.4;
        }
        
        /* Title */
        .title {
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          margin: 15px 0;
          text-decoration: underline;
        }
        
        /* Info Row */
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          padding: 8px 12px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 10px;
        }
        
        .info-item {
          display: flex;
          gap: 5px;
        }
        
        .info-label {
          font-weight: bold;
          color: #475569;
        }
        
        .info-value {
          color: #1e293b;
        }
        
        /* Table */
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }
        
        th {
          background-color: #d1d5db;
          border: 1px solid #000;
          padding: 8px 10px;
          text-align: left;
          font-weight: bold;
          font-style: italic;
        }
        
        td {
          border: 1px solid #000;
          padding: 6px 10px;
          vertical-align: middle;
        }
        
        .num-cell {
          width: 35px;
          text-align: center;
        }
        
        .name-cell {
          width: 180px;
        }
        
        .age-cell {
          width: 80px;
          text-align: center;
        }
        
        .room-cell {
          width: 120px;
          text-align: center;
        }
        
        .remarks-cell {
          width: 100px;
          text-align: center;
        }
        
        /* Grey separator row between room groups */
        .separator-row td {
          background-color: #9ca3af;
          padding: 3px;
          border-left: 1px solid #000;
          border-right: 1px solid #000;
          border-top: none;
          border-bottom: none;
        }
        
        /* Footer */
        .footer {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          font-size: 9px;
          color: #64748b;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <!-- Header with TravX Branding -->
      <div class="header">
        <div class="logo-section">
          <div class="logo">TX</div>
          <div class="company-info">
            <h1>TravX</h1>
            <p class="tagline">Sri Lanka Travel Specialists</p>
          </div>
        </div>
        <div class="contact-info">
          <strong>TravX Holidays (Pvt) Ltd</strong><br>
          63A, Old Road, Pannipitiya, Sri Lanka<br>
          Tel: +94 11 2817781 | Mob: +94 77 3469998<br>
          Email: info@travx.com
        </div>
      </div>
      
      <!-- Title -->
      <div class="title">Rooming List</div>
      
      <!-- Info Row -->
      <div class="info-row">
        <div class="info-item">
          <span class="info-label">Ref:</span>
          <span class="info-value">${inquiry.inquiry_number || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Group:</span>
          <span class="info-value">${inquiry.head_first_name} ${inquiry.head_last_name}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Pax:</span>
          <span class="info-value">${(inquiry.no_of_adults || 0) + (inquiry.no_of_children || 0)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Dates:</span>
          <span class="info-value">${travelDates}</span>
        </div>
      </div>
      
      <!-- Table -->
      <table>
        <thead>
          <tr>
            <th class="num-cell">No</th>
            <th class="name-cell">Name</th>
            <th class="age-cell">Age</th>
            <th class="room-cell">Room Category</th>
            <th class="remarks-cell">Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <!-- Footer -->
      <div class="footer">
        Generated by TravX Inquiry Management System | ${format(new Date(), "dd MMM yyyy, HH:mm")}
      </div>
    </body>
    </html>
  `;
}
