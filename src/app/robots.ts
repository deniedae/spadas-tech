import type { MetadataRoute } from "next";
import { SITE_URL, IS_PREVIEW_DEPLOYMENT } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  if (IS_PREVIEW_DEPLOYMENT) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}


