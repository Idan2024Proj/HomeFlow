import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getMembershipContext } from "@/lib/supabase/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  listCategories,
  listTransactions,
} from "@/features/transactions/data";
import { TransactionFilters } from "@/features/transactions/filters";
import {
  TransactionCard,
  TransactionsTable,
} from "@/features/transactions/transaction-list";

export const metadata: Metadata = {
  title: "תנועות | HomeFlow",
};

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getMembershipContext();
  if (!context) return null;

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const type =
    params.type === "expense" || params.type === "income" || params.type === "all"
      ? params.type
      : "all";
  const categoryId = typeof params.categoryId === "string" ? params.categoryId : undefined;
  const from = typeof params.from === "string" ? params.from : undefined;
  const to = typeof params.to === "string" ? params.to : undefined;

  const [categories, transactions] = await Promise.all([
    listCategories(context.household.id),
    listTransactions({
      householdId: context.household.id,
      q,
      type,
      categoryId: categoryId || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">תנועות</h1>
          <p className="text-sm text-muted-foreground">הכנסות והוצאות של משק הבית</p>
        </div>
        <Link href="/transactions/new" className={cn(buttonVariants())}>
          <Plus className="size-4" aria-hidden />
          תנועה חדשה
        </Link>
      </div>

      <TransactionFilters
        categories={categories}
        values={{ q, type, categoryId, from, to }}
      />

      {transactions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-base font-medium text-foreground">עדיין אין תנועות</p>
          <p className="mt-1 text-sm text-muted-foreground">
            הוסיפו הוצאה ראשונה או ייבאו דוח אשראי בשלב מאוחר יותר.
          </p>
          <Link
            href="/transactions/new"
            className={cn(buttonVariants({ className: "mt-4" }))}
          >
            הוספת הוצאה
          </Link>
        </div>
      ) : (
        <>
          <TransactionsTable transactions={transactions} />
          <div className="flex flex-col gap-2 md:hidden">
            {transactions.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
