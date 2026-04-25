import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { inquiry_id, group_inquiry_id, title } = body;

    if (!inquiry_id && !group_inquiry_id) {
      return NextResponse.json({ error: "Missing inquiry reference" }, { status: 400 });
    }

    const { data: proposal, error } = await supabase
      .from("proposals")
      .insert({
        inquiry_id: inquiry_id || null,
        group_inquiry_id: group_inquiry_id || null,
        title: title || "New Proposal",
        status: "draft"
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating proposal:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, proposal });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inquiry_id = searchParams.get("inquiry_id");
    const group_inquiry_id = searchParams.get("group_inquiry_id");
    const supabase = await createClient();

    let query = supabase.from("proposals").select("*, itinerary_versions(*)");

    if (inquiry_id) {
      query = query.eq("inquiry_id", inquiry_id);
    } else if (group_inquiry_id) {
        query = query.eq("group_inquiry_id", group_inquiry_id);
    }

    const { data: proposals, error } = await query.order('created_at', { ascending: false });

    if (error) {
       return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, proposals });

  } catch (err) {
      console.error("Server error:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
