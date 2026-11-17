import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Review updates, reminders, and activity in your Taskito workspace.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
