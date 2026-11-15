import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "View progress rankings and challenge performance with friends.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
