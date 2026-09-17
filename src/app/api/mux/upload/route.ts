import { NextResponse } from "next/server";
import { createDirectUpload, getUploadStatus, isMuxConfigured } from "@/lib/mux";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    if (!isMuxConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Mux is not configured. Please add MUX_TOKEN_ID and MUX_TOKEN_SECRET to your .env.local file.",
        },
        { status: 400 }
      );
    }

    const { uploadUrl, uploadId } = await createDirectUpload();

    return NextResponse.json({
      success: true,
      uploadUrl,
      uploadId,
    });
  } catch (error: any) {
    console.error("[MUX_UPLOAD_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create Mux direct upload",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    if (!isMuxConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Mux is not configured.",
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get("uploadId");

    if (!uploadId) {
      return NextResponse.json(
        { success: false, error: "Missing uploadId parameter" },
        { status: 400 }
      );
    }

    const status = await getUploadStatus(uploadId);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    console.error("[MUX_STATUS_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to retrieve Mux status",
      },
      { status: 500 }
    );
  }
}
