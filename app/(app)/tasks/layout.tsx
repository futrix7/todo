import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tasks",
  description: "Manage your daily priorities, to-dos, and progress in Taskflow.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
