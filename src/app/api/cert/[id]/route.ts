import { NextResponse } from "next/server";
import { getCertificate } from "@/lib/forensic-certificates";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Certificate ID required" }, { status: 400 });
    }

    const cert = await getCertificate(id);
    if (!cert) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    return NextResponse.json(cert);
  } catch (err: any) {
    console.error("[Cert API] Error fetching certificate:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
