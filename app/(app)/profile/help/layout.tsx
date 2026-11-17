import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help",
  description: "Find support and guidance for using Taskito.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
