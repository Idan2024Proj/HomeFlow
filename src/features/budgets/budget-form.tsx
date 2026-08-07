"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { upsertBudgetAction, type ActionResult } from "@/features/budgets/actions";
import type { Category } from "@/types/transactions";

const initial: ActionResult = { ok: false };

export function BudgetForm({
  categories,
  year,
  month,
}: {
  categories: Category[];
  year: number;
  month: number;
}) {
  const [state, action, pending] = useActionState(upsertBudgetAction, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />
      <div className="space-y-2">
        <Label htmlFor="categoryId">קטגוריה</Label>
        <select
          id="categoryId"
          name="categoryId"
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="">תקציב כללי</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">סכום תקציב</Label>
        <Input id="amount" name="amount" type="number" min="1" step="0.01" required dir="ltr" className="text-left" />
      </div>
      {state.message ? (
        <Alert variant={state.ok ? "success" : "destructive"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "שומר…" : "שמירה"}
      </Button>
    </form>
  );
}
