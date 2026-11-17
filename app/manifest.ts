import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Taskito",
    short_name: "Taskito",
    description:
      "Taskito helps you plan tasks, build habits, and track progress in one calm workspace.",
    start_url: "/tasks",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#131313",
    icons: [
      {
        src: "/logo-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    scope: "/",
    id: "/tasks",
  };
}
