import type { Metadata, Viewport } from "next";
import { Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "../components/theme-provider";
import { AuthProvider } from "@/lib/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://taskflow.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Taskflow",
    template: "%s | Taskflow",
  },
  description:
    "Taskflow helps you plan tasks, build habits, and reflect on your progress in one calm workspace.",
  applicationName: "Taskflow",
  keywords: [
    "task manager",
    "habit tracker",
    "daily checklist",
    "self improvement planner",
    "productivity app",
  ],
  authors: [{ name: "Taskflow" }],
  creator: "Taskflow",
  publisher: "Taskflow",
  openGraph: {
    title: "Taskflow | Task and habit planner",
    description:
      "Plan your tasks, build habits, and track your progress with a simple daily workflow.",
    url: siteUrl,
    siteName: "Taskflow",
    type: "website",
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Taskflow" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Taskflow | Task and habit planner",
    description:
      "Plan your tasks, build habits, and track your progress with a simple daily workflow.",
    images: ["/twitter-image"],
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/taskito-logo.png", sizes: "any", type: "image/png" },
    ],
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#131313" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
    suppressHydrationWarning
      lang="en"
      className={cn("h-full", "antialiased", spaceGrotesk.variable, geistMono.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <TooltipProvider delay={200}>{children}</TooltipProvider>
          </AuthProvider>
          <Toaster position="bottom-right" closeButton toastOptions={{ duration: 4000 }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
