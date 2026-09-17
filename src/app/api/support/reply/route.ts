import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { isOwnerEmail } from "@/app/lib/auth-admin";
import { replyToSupportTicket } from "@/app/lib/support-tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let userEmail: string | null = null;

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

    if (!isOwnerEmail(userEmail)) {
      return NextResponse.json(
        { error: "Unauthorized. Developer access required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { ticketId, replyMessage, status = "answered" } = body;

    if (!ticketId || !replyMessage) {
      return NextResponse.json(
        { error: "ticketId and replyMessage are required" },
        { status: 400 }
      );
    }

    const updated = await replyToSupportTicket(
      ticketId,
      replyMessage.trim(),
      userEmail || "deniedae@gmail.com",
      status
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Ticket not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket: updated,
      message: "Developer reply recorded successfully.",
    });
  } catch (err: any) {
    console.error("[SupportReply API] Error submitting reply:", err);
    return NextResponse.json(
      { error: err.message || "Failed to record developer reply" },
      { status: 500 }
    );
  }
}
