import {
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";
import { he } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import {
  buildDashboardAlerts,
  buildMonthSummary,
  forecastMonthEnd,
  type DashboardAlert,
  type MonthForecast,
  type MonthSummary,
} from "@/lib/finance";
import { listTransactions } from "@/features/transactions/data";
import type { TransactionRow } from "@/types/transactions";

export type BudgetProgress = {
  id: string;
  categoryId: string | null;
  categoryName: string;
  budgetAmount: number;
  spent: number;
  remaining: number;
  percent: number;
  status: "ok" | "warning" | "over";
};

export type DashboardData = {
  monthLabel: string;
  monthStart: string;
  monthEnd: string;
  summary: MonthSummary;
  previousSummary: MonthSummary;
  forecast: MonthForecast;
  budgets: BudgetProgress[];
  alerts: DashboardAlert[];
  recent: TransactionRow[];
  schemaReady: boolean;
};

function monthBounds(date: Date) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
    label: format(start, "MMMM yyyy", { locale: he }),
  };
}

function toMonthInputs(rows: TransactionRow[]) {
  return rows.map((tx) => ({
    type: tx.type,
    amount: tx.amount,
    occurred_on: tx.occurred_on,
    category_id: tx.category_id,
    category_name: tx.category?.name ?? null,
  }));
}

async function listBudgetsForMonth(
  householdId: string,
  year: number,
  month: number,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("id, category_id, amount, category:categories(id, name)")
    .eq("household_id", householdId)
    .eq("year", year)
    .eq("month", month)
    .order("amount", { ascending: false })
    .limit(3);

  if (error) {
    // Table may not exist yet before Phase 4 migration
    if (error.code === "PGRST205" || /budgets/i.test(error.message)) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((row) => {
    const category = Array.isArray(row.category) ? row.category[0] : row.category;
    return {
      id: row.id as string,
      categoryId: (row.category_id as string | null) ?? null,
      categoryName: (category as { name?: string } | null)?.name ?? "תקציב כללי",
      amount: Number(row.amount),
    };
  });
}

export async function getDashboardData(householdId: string): Promise<DashboardData> {
  const now = new Date();
  const current = monthBounds(now);
  const previous = monthBounds(subMonths(now, 1));
  const today = format(now, "yyyy-MM-dd");

  let schemaReady = true;
  let currentRows: TransactionRow[] = [];
  let previousRows: TransactionRow[] = [];
  let recent: TransactionRow[] = [];

  try {
    [currentRows, previousRows, recent] = await Promise.all([
      listTransactions({
        householdId,
        from: current.start,
        to: current.end,
        limit: 500,
      }),
      listTransactions({
        householdId,
        from: previous.start,
        to: previous.end,
        limit: 500,
      }),
      listTransactions({
        householdId,
        limit: 5,
      }),
    ]);
  } catch (error) {
    schemaReady = false;
    console.error("Dashboard transactions failed:", error);
  }

  const summary = buildMonthSummary(
    toMonthInputs(currentRows),
    current.start,
    current.end,
  );
  const previousSummary = buildMonthSummary(
    toMonthInputs(previousRows),
    previous.start,
    previous.end,
  );

  const forecast = forecastMonthEnd({
    today: today > current.end ? current.end : today < current.start ? current.start : today,
    monthStart: current.start,
    monthEnd: current.end,
    incomeSoFar: summary.income,
    expenseSoFar: summary.expense,
  });

  let budgets: BudgetProgress[] = [];
  try {
    const rawBudgets = await listBudgetsForMonth(
      householdId,
      now.getFullYear(),
      now.getMonth() + 1,
    );
    budgets = rawBudgets.map((b) => {
      const actualSpent = b.categoryId
        ? summary.categoryBreakdown.find((c) => c.categoryId === b.categoryId)?.amount ?? 0
        : summary.expense;
      const percent =
        b.amount > 0 ? Math.round((actualSpent / b.amount) * 1000) / 10 : 0;
      const remaining = Math.round((b.amount - actualSpent) * 100) / 100;
      return {
        id: b.id,
        categoryId: b.categoryId,
        categoryName: b.categoryName,
        budgetAmount: b.amount,
        spent: actualSpent,
        remaining,
        percent,
        status: (percent >= 100 ? "over" : percent >= 80 ? "warning" : "ok") as
          | "ok"
          | "warning"
          | "over",
      };
    });
  } catch (error) {
    console.error("Dashboard budgets failed:", error);
  }

  const alerts = buildDashboardAlerts({
    income: summary.income,
    expense: summary.expense,
    forecastBalance: forecast.primaryExpectedBalance,
    topCategoryName: summary.categoryBreakdown[0]?.name,
    topCategoryPercent: summary.categoryBreakdown[0]?.percent,
    hasTransactions: currentRows.length > 0,
  });

  return {
    monthLabel: current.label,
    monthStart: current.start,
    monthEnd: current.end,
    summary,
    previousSummary,
    forecast,
    budgets,
    alerts,
    recent,
    schemaReady,
  };
}
