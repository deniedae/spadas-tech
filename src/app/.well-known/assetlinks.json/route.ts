import { NextResponse } from "next/server";

export async function GET() {
  const assetLinks = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.spadas.ai",
        sha256_cert_fingerprints: [
          "62:F6:E5:C9:2C:4A:F3:C0:E0:00:06:D0:4D:F7:72:65:57:88:47:12:36:4F:56:E4:32:8C:30:C9:3D:33:09:D6"
        ]
      }
    }
  ];

  return NextResponse.json(assetLinks, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
