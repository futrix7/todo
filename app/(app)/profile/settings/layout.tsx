import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Adjust your Taskflow preferences, visibility, and workspace settings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
