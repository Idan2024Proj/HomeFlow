import type { Metadata } from "next";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { he } from "date-fns/locale";
import { getMembershipContext } from "@/lib/supabase/auth";
import { listTransactions } from "@/features/transactions/data";
import {
  buildMonthSummary,
  detectRecurringPayments,
  detectUnusualAmounts,
  detectDuplicates,
} from "@/lib/finance";
import { ReportsClient } from "@/features/reports/reports-client";

export const metadata: Metadata = { title: "דוחות | HomeFlow" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const context = await getMembershipContext();
  if (!context) return null;

  const now = new Date();
  const from = format(startOfMonth(now), "yyyy-MM-dd");
  const to = format(endOfMonth(now), "yyyy-MM-dd");
  const periodLabel = format(now, "MMMM yyyy", { locale: he });

  const txs = await listTransactions({
    householdId: context.household.id,
    from,
    to,
    limit: 500,
  });

  const summary = buildMonthSummary(
    txs.map((t) => ({
      type: t.type,
      amount: t.amount,
      occurred_on: t.occurred_on,
      category_id: t.category_id,
      category_name: t.category?.name ?? null,
    })),
    from,
    to,
  );

  const anomalies = detectUnusualAmounts(txs);
  const duplicates = detectDuplicates(txs);
  const recurring = detectRecurringPayments(txs);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">דוחות</h1>
        <p className="text-sm text-muted-foreground">{periodLabel}</p>
      </div>
      <ReportsClient
        periodLabel={periodLabel}
        income={summary.income}
        expense={summary.expense}
        balance={summary.balance}
        transactions={txs.map((t) => ({
          occurred_on: t.occurred_on,
          merchant_name: t.merchant_name,
          type: t.type,
          amount: t.amount,
          category: t.category?.name,
        }))}
        categories={summary.categoryBreakdown.map((c) => ({
          name: c.name,
          amount: c.amount,
        }))}
        anomalies={[
          ...anomalies.map((a) => ({ message: a.message, severity: a.severity })),
          ...duplicates.slice(0, 3).map((d) => ({
            message: `חשד לכפילות: ${d.reason}`,
            severity: "warning",
          })),
        ]}
        recurring={recurring}
      />
    </div>
  );
}
