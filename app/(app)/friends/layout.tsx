import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Friends",
  description: "Stay connected with friends, challenges, and accountability in Taskflow.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FriendsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
