import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const formData = await request.formData();
        const file = formData.get("file") as File;
        const tourId = formData.get("tourId") as string;
        const actualKm = formData.get("actualKm") as string;

        if (!file || !tourId) {
            return NextResponse.json(
                { error: "File and tourId are required" },
                { status: 400 }
            );
        }

        // Upload file to Supabase storage
        const fileExt = file.name.split(".").pop();
        const fileName = `log-sheets/${tourId}/${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("documents")
            .upload(fileName, file, {
                cacheControl: "3600",
                upsert: true,
            });

        if (uploadError) {
            console.error("Upload error:", uploadError);
            return NextResponse.json(
                { error: "Failed to upload file" },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from("documents")
            .getPublicUrl(fileName);

        // Update tour with log sheet info
        const updateData: Record<string, any> = {
            driver_log_sheet_url: urlData.publicUrl,
            log_sheet_uploaded_at: new Date().toISOString(),
        };

        // Only update actual_km if provided
        if (actualKm && !isNaN(parseFloat(actualKm))) {
            updateData.actual_km_logged = parseFloat(actualKm);
        }

        const { data: tour, error: updateError } = await supabase
            .from("tours")
            .update(updateData)
            .eq("id", tourId)
            .select()
            .single();

        if (updateError) {
            console.error("Tour update error:", updateError);
            return NextResponse.json(
                { error: "Failed to update tour" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            tour: {
                id: tour.id,
                driver_log_sheet_url: tour.driver_log_sheet_url,
                actual_km_logged: tour.actual_km_logged,
                log_sheet_uploaded_at: tour.log_sheet_uploaded_at,
            },
        });
    } catch (error) {
        console.error("Server error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
