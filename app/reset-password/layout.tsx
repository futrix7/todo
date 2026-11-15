import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Choose new password",
  description: "Set a new password for your Taskflow account.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
