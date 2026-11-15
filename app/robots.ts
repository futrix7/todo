import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://taskflow.app";

export default function robots(): MetadataRoute.Robots {
  const publicRoutes = ["/", "/login", "/register"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: publicRoutes,
        disallow: [
          "/api",
          "/dashboard",
          "/admin",
          "/auth",
          "/forgot-password",
          "/reset-password",
          "/tasks",
          "/calendar",
          "/days",
          "/habits",
          "/friends",
          "/notifications",
          "/profile",
          "/streak",
        ],
      },
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-SearchBot",
          "Claude-User",
          "PerplexityBot",
          "Perplexity-User",
          "Google-Extended",
          "Applebot-Extended",
          "Bingbot",
          "Googlebot",
        ],
        allow: publicRoutes,
        disallow: [
          "/api",
          "/dashboard",
          "/admin",
          "/auth",
          "/forgot-password",
          "/reset-password",
          "/tasks",
          "/calendar",
          "/days",
          "/habits",
          "/friends",
          "/notifications",
          "/profile",
          "/streak",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
