import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { isOwnerEmail } from "@/app/lib/auth-admin";
import { getAllSupportTickets } from "@/app/lib/support-tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    let userEmail: string | null = null;

    // Check authorization header
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (token) {
      const { data } = await supabase.auth.getUser(token);
      userEmail = data.user?.email || null;
    }

    if (!userEmail) {
      const { data } = await supabase.auth.getUser();
      userEmail = data.user?.email || null;
    }

    // Strictly enforce developer/owner access
    if (!isOwnerEmail(userEmail)) {
      return NextResponse.json(
        { error: "Unauthorized. Developer access required." },
        { status: 403 }
      );
    }

    const tickets = await getAllSupportTickets(100);
    return NextResponse.json({
      success: true,
      tickets,
      count: tickets.length,
    });
  } catch (err: any) {
    console.error("[SupportTickets API] Error fetching tickets:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load support tickets" },
      { status: 500 }
    );
  }
}
