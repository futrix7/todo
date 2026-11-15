import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Review your habit, productivity, and consistency analytics.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
