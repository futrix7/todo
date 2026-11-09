import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { SupabaseDataProvider } from "@/components/supabase-data-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SupabaseDataProvider>
        <AppShell>{children}</AppShell>
      </SupabaseDataProvider>
    </AuthGuard>
  );
}
