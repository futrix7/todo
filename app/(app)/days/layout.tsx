import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily view",
  description: "Check your day at a glance and keep momentum on your daily goals.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DaysLayout({ children }: { children: React.ReactNode }) {
  return children;
}
