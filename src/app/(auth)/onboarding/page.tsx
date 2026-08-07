import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser, getMembershipContext } from "@/lib/supabase/auth";
import { getSupabaseEnv } from "@/lib/supabase/server";
import { BootstrapForm } from "@/features/auth/bootstrap-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "הקמת משק בית | HomeFlow",
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (!getSupabaseEnv()) {
    redirect("/login");
  }

  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  const membership = await getMembershipContext();
  if (membership) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <div className="mb-8 space-y-2 text-center">
        <p className="text-sm font-medium text-primary">HomeFlow</p>
        <h1 className="text-2xl font-semibold tracking-tight">הקמת משק בית</h1>
        <p className="text-sm text-muted-foreground">
          צעד חד־פעמי למשתמש הראשון (Owner). לאחר מכן תוכלו להזמין שותף מההגדרות.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>פרטי משק הבית</CardTitle>
          <CardDescription>אם הוזמנתם — התחברו מחדש אחרי שההזמנה פעילה</CardDescription>
        </CardHeader>
        <CardContent>
          <BootstrapForm />
        </CardContent>
      </Card>
    </main>
  );
}
