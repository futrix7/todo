import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your profile, preferences, and account details in Taskflow.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
