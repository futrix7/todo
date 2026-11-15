import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Challenges",
  description: "Join and manage accountability challenges with your friends.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ChallengesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
