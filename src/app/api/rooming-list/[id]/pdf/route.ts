import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { launchBrowser } from "@/lib/pdf/browser";

export const maxDuration = 60;
import { format } from "date-fns";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface GroupMember {
  id: string;
  full_name: string;
  passport_no: string | null;
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
    browser = await launchBrowser();
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

    return new Response(pdfBuffer as any, {
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
  const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL || 'https://axcfwwdahunzxsdeohkv.supabase.co/storage/v1/object/public/logo/logo.png';
  // Helper to check if a room is interconnected
  const getInterconnectedRoom = (roomId: number): number | null => {
    for (const pair of interconnections) {
      if (pair[0] === roomId) return pair[1];
      if (pair[1] === roomId) return pair[0];
    }
    return null;
  };

  // Reconstruct physical room categories based on inventory counts
  const roomCategories: { [key: number]: string } = {};
  let currentRoomId = 1;

  for (let i = 0; i < (inquiry.rooms_dbl || 0); i++) roomCategories[currentRoomId++] = "Double Room";
  for (let i = 0; i < (inquiry.rooms_sgl || 0); i++) roomCategories[currentRoomId++] = "Single Room";
  for (let i = 0; i < (inquiry.rooms_tpl || 0); i++) roomCategories[currentRoomId++] = "Triple Room";
  for (let i = 0; i < (inquiry.rooms_qtpl || 0); i++) roomCategories[currentRoomId++] = "Quad Room";

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

    // Get physical room category for this room group
    const baseRoomCategory = roomCategories[roomNum] || "Double Room";

    // Add members from this room
    roomMembers.forEach((member, index) => {
      const isFirstInRoom = index === 0;
      const ageLabel = member.age_label || (member.member_type === "adult" ? "Adult" : "Child");

      // Determine room category display for this row
      let roomCategoryDisplay = "";
      if (isFirstInRoom) {
        roomCategoryDisplay = baseRoomCategory;
      }

      tableRows += `
        <tr class="${interconnectedRoom !== null ? 'interconnected-row' : ''}">
          <td class="num-cell">${rowNumber}</td>
          <td class="name-cell">${member.full_name}</td>
          <td class="passport-cell">${member.passport_no || '-'}</td>
          <td class="age-cell">${ageLabel}</td>
          <td class="room-cell">${roomCategoryDisplay}</td>
          <td class="remarks-cell ${interconnectedRoom !== null ? 'interconnected-remark' : ''}">${member.remarks || (interconnectedRoom !== null ? 'Interconnected' : '')}</td>
        </tr>
      `;
      rowNumber++;
    });

    // If interconnected, add members from the other room
    if (showInterconnectedTogether && interconnectedMembers.length > 0 && interconnectedRoom !== null) {
      // Get category for the interconnected room
      const connectedRoomCategory = roomCategories[interconnectedRoom] || "Double Room";

      interconnectedMembers.forEach((member, index) => {
        const ageLabel = member.age_label || (member.member_type === "adult" ? "Adult" : "Child");
        const isFirstInConnectedRoom = index === 0;

        tableRows += `
          <tr class="interconnected-row">
            <td class="num-cell">${rowNumber}</td>
            <td class="name-cell">${member.full_name}</td>
            <td class="passport-cell">${member.passport_no || '-'}</td>
            <td class="age-cell">${ageLabel}</td>
            <td class="room-cell">${isFirstInConnectedRoom ? connectedRoomCategory : ''}</td>
            <td class="remarks-cell interconnected-remark">${member.remarks || 'Interconnected'}</td>
          </tr>
        `;
        rowNumber++;
      });
    }
  });

  const travelDates = inquiry.arriving_date && inquiry.departure_date
    ? `${format(new Date(inquiry.arriving_date), "dd MMM yyyy")} - ${format(new Date(inquiry.departure_date), "dd MMM yyyy")}`
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Rooming List - ${inquiry.inquiry_number}</title>
      <style>
        @page { size: A4; margin: 14mm 16mm 16mm 16mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: "Times New Roman", Times, Georgia, serif;
          font-size: 10.5px;
          line-height: 1.55;
          color: #2c2c2c;
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 0 16px;
          border-bottom: 2px solid #2c2c2c;
          margin-bottom: 22px;
        }
        .logo { height: 110px; width: auto; }
        .company-info {
          text-align: right;
          font-size: 12px;
          color: #444;
          line-height: 1.65;
        }
        .company-name {
          font-size: 17px;
          font-weight: bold;
          color: #2c2c2c;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        /* Title */
        .title-section {
          text-align: center;
          margin-bottom: 14px;
        }
        .title-section h1 {
          font-size: 16px;
          font-weight: normal;
          font-style: italic;
          color: #2c2c2c;
        }
        .title-line {
          width: 50px;
          height: 1.5px;
          background: #c09853;
          margin: 6px auto;
        }

        /* Info Row */
        .info-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 0;
          border-top: 1px solid #e5e0d8;
          border-left: 1px solid #e5e0d8;
          margin-bottom: 14px;
        }
        .info-cell {
          padding: 6px 10px;
          border-bottom: 1px solid #e5e0d8;
          border-right: 1px solid #e5e0d8;
        }
        .info-label {
          font-size: 7px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #999;
        }
        .info-value {
          font-size: 10.5px;
          color: #2c2c2c;
          font-weight: bold;
          margin-top: 1px;
        }

        /* Table */
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }
        th {
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #888;
          font-weight: normal;
          padding: 6px 10px;
          text-align: left;
          border-bottom: 1.5px solid #2c2c2c;
        }
        td {
          padding: 6px 10px;
          border-bottom: 1px solid #eee;
          vertical-align: middle;
        }

        .num-cell { width: 35px; text-align: center; }
        .name-cell { width: 160px; }
        .passport-cell { width: 85px; text-align: center; }
        .age-cell { width: 55px; text-align: center; }
        .room-cell { width: 105px; text-align: center; }
        .remarks-cell { width: 90px; text-align: center; }

        /* Separator */
        .separator-row td {
          background-color: #f5f3ef;
          padding: 2px;
          border-left: none;
          border-right: none;
          border-top: 1px solid #e5e0d8;
          border-bottom: 1px solid #e5e0d8;
        }

        .interconnected-row { background-color: #fdf9f3 !important; }
        .interconnected-remark {
          color: #c09853;
          font-weight: bold;
          font-size: 8px;
        }

        /* Footer */
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 9px;
          color: #aaa;
          font-style: italic;
        }
        .footer-line {
          width: 40px;
          height: 1px;
          background: #c09853;
          margin: 6px auto;
        }

        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <img src="${logoUrl}" alt="TraveX" class="logo" />
        <div class="company-info">
          <div class="company-name">TraveX</div>
          63A, Old Road, Pannipitiya, Sri Lanka<br>
          +94 77 346 9998 &nbsp;·&nbsp; info@Travex.com
        </div>
      </div>

      <!-- Title -->
      <div class="title-section">
        <h1>Rooming List</h1>
        <div class="title-line"></div>
      </div>

      <!-- Info Row -->
      <div class="info-row">
        <div class="info-cell">
          <div class="info-label">Reference</div>
          <div class="info-value">${inquiry.inquiry_number || 'N/A'}</div>
        </div>
        <div class="info-cell">
          <div class="info-label">Group</div>
          <div class="info-value">${inquiry.agent_company || (inquiry.head_first_name ? `${inquiry.head_first_name} ${inquiry.head_last_name}` : 'N/A')}</div>
        </div>
        <div class="info-cell">
          <div class="info-label">Total Pax</div>
          <div class="info-value">${(inquiry.no_of_adults || 0) + (inquiry.no_of_children || 0)}</div>
        </div>
        <div class="info-cell">
          <div class="info-label">Travel Dates</div>
          <div class="info-value">${travelDates}</div>
        </div>
      </div>

      <!-- Table -->
      <table>
        <thead>
          <tr>
            <th class="num-cell">No</th>
            <th class="name-cell">Name</th>
            <th class="passport-cell">Passport No</th>
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
        <div class="footer-line"></div>
        TraveX (Pvt) Ltd. &nbsp;·&nbsp; ${format(new Date(), "dd MMM yyyy")}
      </div>
    </body>
    </html>
  `;
}
