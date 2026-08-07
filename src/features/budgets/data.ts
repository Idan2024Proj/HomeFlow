import { createClient } from "@/lib/supabase/server";
import { buildMonthSummary } from "@/lib/finance";
import { listTransactions } from "@/features/transactions/data";
import { endOfMonth, format, startOfMonth } from "date-fns";

export async function listBudgets(householdId: string, year: number, month: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("*, category:categories(id, name)")
    .eq("household_id", householdId)
    .eq("year", year)
    .eq("month", month)
    .order("amount", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => {
    const category = Array.isArray(row.category) ? row.category[0] : row.category;
    return {
      id: row.id as string,
      categoryId: row.category_id as string | null,
      categoryName: (category as { name?: string } | null)?.name ?? "תקציב כללי",
      amount: Number(row.amount),
      year: row.year as number,
      month: row.month as number,
    };
  });
}

export async function getBudgetProgress(householdId: string, year: number, month: number) {
  const start = format(startOfMonth(new Date(year, month - 1, 1)), "yyyy-MM-dd");
  const end = format(endOfMonth(new Date(year, month - 1, 1)), "yyyy-MM-dd");
  const [budgets, txs] = await Promise.all([
    listBudgets(householdId, year, month),
    listTransactions({ householdId, from: start, to: end, type: "expense", limit: 500 }),
  ]);
  const summary = buildMonthSummary(
    txs.map((t) => ({
      type: t.type,
      amount: t.amount,
      occurred_on: t.occurred_on,
      category_id: t.category_id,
      category_name: t.category?.name ?? null,
    })),
    start,
    end,
  );

  const totalBudget = budgets
    .filter((b) => !b.categoryId)
    .reduce((s, b) => s + b.amount, 0);
  const categoryBudgets = budgets.filter((b) => b.categoryId);

  return {
    summary,
    totalBudget: totalBudget || budgets.reduce((s, b) => s + b.amount, 0),
    items: categoryBudgets.map((b) => {
      const spent =
        summary.categoryBreakdown.find((c) => c.categoryId === b.categoryId)?.amount ?? 0;
      const percent = b.amount > 0 ? Math.round((spent / b.amount) * 1000) / 10 : 0;
      return {
        ...b,
        spent,
        remaining: Math.round((b.amount - spent) * 100) / 100,
        percent,
        status: (percent >= 100 ? "over" : percent >= 80 ? "warning" : "ok") as
          | "ok"
          | "warning"
          | "over",
      };
    }),
  };
}
