import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    .trim()
    .replace(/\/+$/, "");

  // Demo mode / staging protection: if NEXT_PUBLIC_ALLOW_INDEXING is not explicitly "true",
  // disallow all search engines and web crawlers from indexing this site.
  if (!allowIndexing) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privasi", "/ketentuan"],
        disallow: ["/c/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
