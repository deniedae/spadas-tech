import { NextRequest, NextResponse } from "next/server";
import { getSupportTicketById } from "@/app/lib/support-tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId is required" },
        { status: 400 }
      );
    }

    const ticket = await getSupportTicketById(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        developerReply: ticket.developerReply || null,
        repliedAt: ticket.repliedAt || null,
        repliedBy: ticket.repliedBy || null,
        issueDescription: ticket.issueDescription,
        createdAt: ticket.createdAt,
      },
    });
  } catch (err: any) {
    console.error("[SupportStatus API] Error checking status:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve ticket status" },
      { status: 500 }
    );
  }
}
