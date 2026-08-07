import type { Metadata } from "next";
import Link from "next/link";
import { getMembershipContext } from "@/lib/supabase/auth";
import { getDashboardData } from "@/features/dashboard/data";
import { CategoryBreakdown } from "@/features/dashboard/category-breakdown";
import { TransactionCard } from "@/features/transactions/transaction-list";
import { DashboardChart } from "@/components/charts/dashboard-chart";
import { MetricCard } from "@/components/shared/metric-card";
import { BudgetProgress } from "@/components/shared/budget-progress";
import { AlertCard } from "@/components/shared/alert-card";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/utils/money";

export const metadata: Metadata = {
  title: "בית | HomeFlow",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const context = await getMembershipContext();
  if (!context) return null;

  const greetingName =
    context.membership.display_name || context.profile.full_name || "שם";

  const data = await getDashboardData(context.household.id);
  const forecastTone =
    data.forecast.primaryExpectedBalance < 0
      ? "danger"
      : data.forecast.primaryExpectedBalance < data.summary.balance
        ? "warning"
        : "default";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">שלום, {greetingName}</h1>
          <p className="text-sm text-muted-foreground">{data.monthLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/transactions/new" className={cn(buttonVariants())}>
            הוספת תנועה
          </Link>
          <Link href="/import" className={cn(buttonVariants({ variant: "outline" }))}>
            ייבוא דוח
          </Link>
        </div>
      </div>

      {!data.schemaReady ? (
        <Alert variant="destructive">
          <AlertTitle>חסרה טבלת תנועות ב־Supabase</AlertTitle>
          <AlertDescription>
            הריצו את{" "}
            <code className="text-xs">
              supabase/migrations/20260307000100_phase3_transactions.sql
            </code>
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-label="סיכום חודשי" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="הכנסות" value={data.summary.income} tone="success" />
        <MetricCard label="הוצאות" value={data.summary.expense} />
        <MetricCard label="יתרה" value={data.summary.balance} />
        <MetricCard
          label="תחזית לסוף החודש"
          value={data.forecast.primaryExpectedBalance}
          tone={forecastTone}
          hint={`ממוצע יומי ${formatMoney(data.forecast.dailyAverageExpense)} · ${data.forecast.daysRemaining} ימים נותרו`}
        />
      </section>

      {data.alerts.length > 0 ? (
        <section aria-label="התראות" className="grid gap-2">
          {data.alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>מגמה חודשית</CardTitle>
            <CardDescription>הוצאות, הכנסות, יתרה והשוואה לחודש קודם</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardChart
              current={data.summary.expenseByDay}
              previous={data.previousSummary.expenseByDay}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>לפי קטגוריה</CardTitle>
            <CardDescription>הוצאות מרכזיות החודש</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBreakdown items={data.summary.categoryBreakdown} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>תקציבים</CardTitle>
            <CardDescription>שלוש הקטגוריות החשובות ביותר</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.budgets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
                <p className="text-sm font-medium text-foreground">עדיין אין תקציבים</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  הגדרת תקציבים מלאה תגיע ב־Phase 5. בינתיים אפשר להריץ את migration של budgets.
                </p>
              </div>
            ) : (
              data.budgets.map((budget) => (
                <BudgetProgress
                  key={budget.id}
                  name={budget.categoryName}
                  spent={budget.spent}
                  budget={budget.budgetAmount}
                  percent={budget.percent}
                  status={budget.status}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>תחזית — תרחישים</CardTitle>
            <CardDescription>על בסיס ממוצע הוצאה יומי עד היום</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.forecast.scenarios.map((scenario) => (
              <div
                key={scenario.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-sm"
              >
                <span className="font-medium">{scenario.label}</span>
                <span
                  className={cn(
                    "tabular-nums font-semibold",
                    scenario.expectedBalance < 0 && "text-destructive",
                  )}
                >
                  {formatMoney(scenario.expectedBalance)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>תנועות אחרונות</CardTitle>
            <CardDescription>עד 5 תנועות אחרונות</CardDescription>
          </div>
          <Link
            href="/transactions"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            הכל
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm font-medium">עדיין אין תנועות החודש</p>
              <p className="mt-1 text-sm text-muted-foreground">
                הוסיפו הוצאה ראשונה או ייבאו דוח אשראי.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Link href="/transactions/new" className={cn(buttonVariants())}>
                  הוסף הוצאה
                </Link>
              </div>
            </div>
          ) : (
            data.recent.map((tx) => <TransactionCard key={tx.id} transaction={tx} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
