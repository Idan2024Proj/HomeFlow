import type { Metadata } from "next";
import { getMembershipContext } from "@/lib/supabase/auth";
import {
  contributeAction,
  createGoalAction,
  listSavingsGoals,
} from "@/features/savings/actions";
import { SavingsClient } from "@/features/savings/savings-client";
import { formatMoney } from "@/lib/utils/money";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "יעדי חיסכון | HomeFlow" };
export const dynamic = "force-dynamic";

export default async function SavingsPage() {
  const context = await getMembershipContext();
  if (!context) return null;
  const goals = await listSavingsGoals(context.household.id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">יעדי חיסכון</h1>
        <p className="text-sm text-muted-foreground">עקבו אחרי יעדים משותפים</p>
      </div>

      <div className="space-y-3">
        {goals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              עדיין אין יעדים.
            </CardContent>
          </Card>
        ) : (
          goals.map((g) => {
            const current = Number(g.current_amount);
            const target = Number(g.target_amount);
            const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
            return (
              <Card key={g.id as string}>
                <CardHeader>
                  <CardTitle>{g.name as string}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(current)} / {formatMoney(target)} · {percent}%
                  </p>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <SavingsClient
        goals={goals.map((g) => ({ id: g.id as string, name: g.name as string }))}
        createAction={createGoalAction}
        contributeAction={contributeAction}
      />
    </div>
  );
}
