import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visibility",
  description: "Control how your activity and profile appear to others in Taskflow.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function VisibilityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
