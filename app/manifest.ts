import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://taskflow.app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Taskflow",
    short_name: "Taskflow",
    description:
      "Taskflow helps you plan tasks, build habits, and track progress in one calm workspace.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111827",
    icons: [
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/logo.svg",
        sizes: "256x256",
        type: "image/svg+xml",
      },
    ],
    scope: siteUrl,
    id: "/",
  };
}
