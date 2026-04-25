import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Get version history for a document
export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const documentType = searchParams.get("document_type");
    const documentId = searchParams.get("document_id");

    if (!documentType || !documentId) {
        return NextResponse.json(
            { error: "document_type and document_id are required" },
            { status: 400 }
        );
    }

    const { data: versions, error } = await supabase
        .from("document_versions")
        .select("*")
        .eq("document_type", documentType)
        .eq("document_id", documentId)
        .order("version_number", { ascending: false });

    if (error) {
        console.error("Error fetching document versions:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ versions: versions || [] });
}

// POST - Save a document version snapshot before editing
export async function POST(request: Request) {
    const supabase = await createClient();

    try {
        const { document_type, document_id, content, edited_by, edit_reason } = await request.json();

        if (!document_type || !document_id || !content) {
            return NextResponse.json(
                { error: "document_type, document_id, and content are required" },
                { status: 400 }
            );
        }

        // Get the next version number
        const { data: existing } = await supabase
            .from("document_versions")
            .select("version_number")
            .eq("document_type", document_type)
            .eq("document_id", document_id)
            .order("version_number", { ascending: false })
            .limit(1);

        const nextVersion = (existing?.[0]?.version_number || 0) + 1;

        const { data: version, error } = await supabase
            .from("document_versions")
            .insert({
                document_type,
                document_id,
                version_number: nextVersion,
                content,
                edited_by: edited_by || "Admin",
                edit_reason: edit_reason || "Manual edit",
            })
            .select()
            .single();

        if (error) {
            console.error("Error saving document version:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, version }, { status: 201 });
    } catch (error) {
        console.error("Server error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
