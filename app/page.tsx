import LandingPage from "@/components/landing-page";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://taskflow.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Task and habit planner",
  description:
    "Taskflow helps you plan tasks, build habits, and reflect on your progress in one calm workspace.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Taskflow | Task and habit planner",
    description:
      "Plan your tasks, build habits, and track your progress with a simple daily workflow.",
    url: "/",
    siteName: "Taskflow",
    type: "website",
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Taskflow" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Taskflow | Task and habit planner",
    description:
      "Plan your tasks, build habits, and track your progress with a simple daily workflow.",
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Page() {
  return <LandingPage />;
}
