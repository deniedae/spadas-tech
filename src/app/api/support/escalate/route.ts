import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userEmail,
      userName,
      userPhone,
      issueDescription,
      messages = [],
      metadata = {},
    } = body;

    const ticketId = `SPADAS-DEV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const timestamp = new Date().toISOString();

    const ticketPayload = {
      ticketId,
      status: "awaiting_human",
      timestamp,
      user: {
        email: userEmail || "Anonymous Reseller",
        name: userName || "Spadas User",
        phone: userPhone || null,
      },
      issueDescription: issueDescription || "Requested Developer Assistance via Dashboard Support Desk",
      recentChatSnippet: messages.slice(-5).map((m: any) => `[${m.role.toUpperCase()}]: ${m.content}`).join("\n"),
      metadata,
    };

    console.log("[Support Escalation] New Developer Support Ticket Created:", JSON.stringify(ticketPayload, null, 2));

    // Optional webhook dispatch (Discord, Slack, or Telegram webhook)
    const webhookUrl = process.env.ADMIN_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl && webhookUrl.startsWith("http")) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `🚨 **New Developer Support Ticket**: \`${ticketId}\`\n**User**: ${ticketPayload.user.name} (${ticketPayload.user.email})\n**Description**: ${ticketPayload.issueDescription}\n**Time**: ${timestamp}\n\`\`\`\n${ticketPayload.recentChatSnippet.slice(0, 1000)}\n\`\`\``,
          }),
        }).catch((err) => console.warn("[Support Escalation] Webhook dispatch warning:", err));
      } catch (e) {
        console.warn("[Support Escalation] Webhook error:", e);
      }
    }

    return NextResponse.json({
      success: true,
      ticketId,
      status: "awaiting_human",
      message: "Developer notified. You will receive an in-app reply or notification shortly.",
    });
  } catch (err: any) {
    console.error("[Support Escalation] Error creating ticket:", err);
    return NextResponse.json(
      { error: err.message || "Failed to escalate ticket to developer" },
      { status: 500 }
    );
  }
}
