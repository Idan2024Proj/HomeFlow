import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthUser, getMembershipContext } from "@/lib/supabase/auth";
import { getSupabaseEnv } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!getSupabaseEnv()) {
    redirect("/login");
  }

  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  const context = await getMembershipContext();
  if (!context) {
    redirect("/onboarding");
  }

  return <AppShell context={context}>{children}</AppShell>;
}
