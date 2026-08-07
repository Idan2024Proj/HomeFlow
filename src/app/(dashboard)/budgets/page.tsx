import type { Metadata } from "next";
import { getMembershipContext } from "@/lib/supabase/auth";
import { getBudgetProgress } from "@/features/budgets/data";
import { listCategories } from "@/features/transactions/data";
import { BudgetForm } from "@/features/budgets/budget-form";
import { BudgetProgress } from "@/components/shared/budget-progress";
import { formatMoney } from "@/lib/utils/money";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deleteBudgetAction } from "@/features/budgets/actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "תקציב | HomeFlow" };
export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const context = await getMembershipContext();
  if (!context) return null;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const [progress, categories] = await Promise.all([
    getBudgetProgress(context.household.id, year, month),
    listCategories(context.household.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">תקציב</h1>
        <p className="text-sm text-muted-foreground">
          {month}/{year} · הוצאות {formatMoney(progress.summary.expense)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>סיכום</CardTitle>
          <CardDescription>
            נוצל {formatMoney(progress.summary.expense)}
            {progress.totalBudget > 0
              ? ` מתוך תקציב ${formatMoney(progress.totalBudget)}`
              : ""}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>קטגוריות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {progress.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">עדיין אין תקציבים לחודש זה.</p>
          ) : (
            progress.items.map((item) => (
              <div key={item.id} className="space-y-2">
                <BudgetProgress
                  name={item.categoryName}
                  spent={item.spent}
                  budget={item.amount}
                  percent={item.percent}
                  status={item.status}
                />
                <form action={deleteBudgetAction.bind(null, item.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    מחק
                  </Button>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>הוספת / עדכון תקציב</CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetForm
            categories={categories.filter((c) => c.kind !== "income")}
            year={year}
            month={month}
          />
        </CardContent>
      </Card>
    </div>
  );
}
