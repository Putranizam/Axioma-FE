import type { MetadataRoute } from "next";
import { PUBLIC_APP_URL } from "@/constants/appInfo";

const ALLOWED_PUBLIC_PATHS = [
  "/",
  "/about",
  "/privacy-policy",
  "/terms",
  "/contact",
  "/ads.txt",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ALLOWED_PUBLIC_PATHS,
        disallow: ["/api/"],
      },
      {
        userAgent: "Googlebot",
        allow: ALLOWED_PUBLIC_PATHS,
        disallow: ["/api/"],
      },
      {
        userAgent: "Mediapartners-Google",
        allow: ALLOWED_PUBLIC_PATHS,
        disallow: ["/api/"],
      },
    ],
    sitemap: `${PUBLIC_APP_URL}/sitemap.xml`,
  };
}
