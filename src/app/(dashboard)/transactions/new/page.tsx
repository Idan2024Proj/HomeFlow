import type { Metadata } from "next";
import Link from "next/link";
import { getAuthUser, getMembershipContext } from "@/lib/supabase/auth";
import {
  listActiveMembers,
  listCategories,
  listPaymentMethods,
} from "@/features/transactions/data";
import { TransactionForm } from "@/features/transactions/transaction-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "תנועה חדשה | HomeFlow",
};

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const user = await getAuthUser();
  const context = await getMembershipContext();
  if (!user || !context) return null;

  const [members, categories, paymentMethods] = await Promise.all([
    listActiveMembers(context.household.id),
    listCategories(context.household.id),
    listPaymentMethods(context.household.id),
  ]);

  // Ensure defaults exist for households created before Phase 3 migration
  if (categories.length === 0) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    await supabase.rpc("seed_default_categories", {
      p_household_id: context.household.id,
    });
  }

  const [members2, categories2, methods2] = categories.length
    ? [members, categories, paymentMethods]
    : await Promise.all([
        listActiveMembers(context.household.id),
        listCategories(context.household.id),
        listPaymentMethods(context.household.id),
      ]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">תנועה חדשה</h1>
        <Link href="/transactions" className={cn(buttonVariants({ variant: "ghost" }))}>
          חזרה
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>פרטי התנועה</CardTitle>
          <CardDescription>סכום, בית עסק וחלוקה — במהירות</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionForm
            members={members2}
            categories={categories2}
            paymentMethods={methods2}
            currentUserId={user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
