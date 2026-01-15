import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Get rooming list for a group inquiry
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const groupInquiryId = searchParams.get("group_inquiry_id");

  if (!groupInquiryId) {
    return NextResponse.json(
      { error: "group_inquiry_id is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Fetch group members with their room assignments
  const { data: members, error } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_inquiry_id", groupInquiryId)
    .order("room_number", { ascending: true, nullsFirst: false })
    .order("member_type", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching rooming list:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch interconnections from group_inquiries
  const { data: inquiry } = await supabase
    .from("group_inquiries")
    .select("room_interconnections")
    .eq("id", groupInquiryId)
    .single();

  return NextResponse.json({ 
    members,
    interconnections: inquiry?.room_interconnections || [],
  });
}

// PUT - Update room assignments for group members
export async function PUT(request: Request) {
  const supabase = await createClient();
  
  try {
    const { assignments, interconnections, group_inquiry_id } = await request.json();

    if (!Array.isArray(assignments)) {
      return NextResponse.json(
        { error: "assignments must be an array" },
        { status: 400 }
      );
    }

    // Update each member's room assignment
    const updates = assignments.map(async (assignment: {
      member_id: string;
      room_number: number | null;
      room_category: string | null;
      age_label: string | null;
      remarks: string | null;
    }) => {
      const { error } = await supabase
        .from("group_members")
        .update({
          room_number: assignment.room_number,
          room_category: assignment.room_category,
          age_label: assignment.age_label,
          remarks: assignment.remarks,
        })
        .eq("id", assignment.member_id);

      if (error) throw error;
    });

    await Promise.all(updates);

    // Save interconnections to group_inquiries table
    if (group_inquiry_id && interconnections !== undefined) {
      const { error: interconnectError } = await supabase
        .from("group_inquiries")
        .update({
          room_interconnections: interconnections,
          updated_at: new Date().toISOString(),
        })
        .eq("id", group_inquiry_id);

      if (interconnectError) {
        console.error("Error saving interconnections:", interconnectError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating room assignments:", err);
    return NextResponse.json(
      { error: "Failed to update room assignments" },
      { status: 500 }
    );
  }
}
