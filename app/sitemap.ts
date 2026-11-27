import type { MetadataRoute } from "next";
import { PUBLIC_APP_URL, PUBLIC_LEGAL_UPDATED_ISO } from "@/constants/appInfo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: PUBLIC_APP_URL,
      lastModified: PUBLIC_LEGAL_UPDATED_ISO,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${PUBLIC_APP_URL}/about`,
      lastModified: PUBLIC_LEGAL_UPDATED_ISO,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${PUBLIC_APP_URL}/privacy-policy`,
      lastModified: PUBLIC_LEGAL_UPDATED_ISO,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${PUBLIC_APP_URL}/terms`,
      lastModified: PUBLIC_LEGAL_UPDATED_ISO,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${PUBLIC_APP_URL}/contact`,
      lastModified: PUBLIC_LEGAL_UPDATED_ISO,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
