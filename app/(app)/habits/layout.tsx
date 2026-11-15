import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Habits",
  description: "Track your habits, streaks, and routine progress in Taskflow.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HabitsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
