import type { MetadataRoute } from "next";
import { PUBLIC_APP_URL } from "@/constants/appInfo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/privacy-policy", "/terms", "/contact", "/ads.txt"],
        disallow: ["/api/"],
      },
      {
        userAgent: "Mediapartners-Google",
        allow: ["/", "/about", "/privacy-policy", "/terms", "/contact", "/ads.txt"],
        disallow: ["/api/"],
      },
    ],
    sitemap: `${PUBLIC_APP_URL}/sitemap.xml`,
  };
}
