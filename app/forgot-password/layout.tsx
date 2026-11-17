import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Recover access to your Taskito account with a secure password reset link.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
