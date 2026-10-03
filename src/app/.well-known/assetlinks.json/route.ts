import { NextResponse } from "next/server";

export async function GET() {
  const assetLinks = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.spadas.ai",
        sha256_cert_fingerprints: [
          "2F:E0:3D:1B:32:7E:76:64:4E:22:1D:E9:C4:C3:65:9C:DB:00:90:F2:8C:48:33:C0:57:F4:89:8D:5A:8E:B6:BA",
          "13:79:69:F6:DD:C8:71:72:DD:7D:8F:BD:93:EF:28:50:D6:F0:53:73:DB:7E:EF:27:12:AB:5D:34:89:DF:B4:9A",
          "62:F6:E5:C9:2C:4A:F3:C0:E0:00:06:D0:4D:F7:72:65:57:88:47:12:36:4F:56:E4:32:8C:30:C9:3D:33:09:D6"
        ]
      }
    }
  ];

  return NextResponse.json(assetLinks, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
