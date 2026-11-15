import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Streaks",
  description: "See your progress streaks and consistency over time.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StreakLayout({ children }: { children: React.ReactNode }) {
  return children;
}
