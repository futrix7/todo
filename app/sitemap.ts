import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://taskflow.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-11-15T00:00:00.000Z");

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
