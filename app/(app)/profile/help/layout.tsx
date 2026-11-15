import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help",
  description: "Find support and guidance for using Taskflow.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
