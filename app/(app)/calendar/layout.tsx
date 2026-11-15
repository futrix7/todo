import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar",
  description: "View your tasks and routines in a clear monthly or daily calendar.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
