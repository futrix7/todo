import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create your Taskflow account to track tasks, habits, and daily progress.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
