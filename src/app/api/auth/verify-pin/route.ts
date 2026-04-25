import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";

// POST - Verify admin PIN for editing past documents
export async function POST(request: Request) {
    try {
        const { pin } = await request.json();

        if (!pin) {
            return NextResponse.json(
                { error: "PIN is required" },
                { status: 400 }
            );
        }

        // Compare against centralized passcode
        const adminPin = APP_CONFIG.ADMIN_PASSCODE;

        if (pin === adminPin) {
            return NextResponse.json({ authorized: true });
        }

        return NextResponse.json(
            { authorized: false, error: "Invalid PIN" },
            { status: 401 }
        );
    } catch (error) {
        console.error("PIN verification error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
