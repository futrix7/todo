import type { Metadata, Viewport } from "next";
import { Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "../components/theme-provider";
import { AuthProvider } from "@/lib/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { PwaInstallProvider } from "@/components/pwa-install-prompt";

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
    default: "Taskito",
    template: "%s | Taskito",
  },
  description:
    "Taskito helps you plan tasks, build habits, and reflect on your progress in one calm workspace.",
  applicationName: "Taskito",
  keywords: [
    "task manager",
    "habit tracker",
    "daily checklist",
    "self improvement planner",
    "productivity app",
  ],
  authors: [{ name: "Taskito" }],
  creator: "Taskito",
  publisher: "Taskito",
  openGraph: {
    title: "Taskito | Task and habit planner",
    description:
      "Plan your tasks, build habits, and track your progress with a simple daily workflow.",
    url: siteUrl,
    siteName: "Taskito",
    type: "website",
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Taskito" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Taskito | Task and habit planner",
    description:
      "Plan your tasks, build habits, and track your progress with a simple daily workflow.",
    images: ["/twitter-image"],
  },
  icons: {
    icon: [
      { url: "/logo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/logo-192.png",
    apple: "/logo-192.png",
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
          <PwaInstallProvider>
            <AuthProvider>
              <TooltipProvider delay={200}>{children}</TooltipProvider>
            </AuthProvider>
            <Toaster position="bottom-right" closeButton toastOptions={{ duration: 4000 }} />
          </PwaInstallProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
