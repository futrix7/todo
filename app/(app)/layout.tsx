import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { SupabaseDataProvider } from "@/components/supabase-data-provider";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SupabaseDataProvider>
        <AppShell>{children}</AppShell>
      </SupabaseDataProvider>
    </AuthGuard>
  );
}
