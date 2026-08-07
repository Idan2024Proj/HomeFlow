"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ActionResult } from "@/features/savings/actions";

const initial: ActionResult = { ok: false };

export function SavingsClient({
  goals,
  createAction,
  contributeAction,
}: {
  goals: Array<{ id: string; name: string }>;
  createAction: (p: ActionResult, f: FormData) => Promise<ActionResult>;
  contributeAction: (p: ActionResult, f: FormData) => Promise<ActionResult>;
}) {
  const [createState, createForm, createPending] = useActionState(createAction, initial);
  const [contribState, contribForm, contribPending] = useActionState(
    contributeAction,
    initial,
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>יעד חדש</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createForm} className="space-y-3">
            <div className="space-y-1">
              <Label>שם</Label>
              <Input name="name" required maxLength={80} />
            </div>
            <div className="space-y-1">
              <Label>יעד ₪</Label>
              <Input name="targetAmount" type="number" min="1" step="0.01" required dir="ltr" className="text-left" />
            </div>
            <div className="space-y-1">
              <Label>תאריך יעד</Label>
              <Input name="targetDate" type="date" dir="ltr" className="text-left" />
            </div>
            {createState.message ? (
              <Alert variant={createState.ok ? "success" : "destructive"}>
                <AlertDescription>{createState.message}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={createPending}>
              יצירה
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>הפקדה</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={contribForm} className="space-y-3">
            <div className="space-y-1">
              <Label>יעד</Label>
              <select
                name="goalId"
                required
                className="h-8 w-full rounded-lg border border-input px-2.5 text-sm"
              >
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>סכום</Label>
              <Input name="amount" type="number" min="0.01" step="0.01" required dir="ltr" className="text-left" />
            </div>
            {contribState.message ? (
              <Alert variant={contribState.ok ? "success" : "destructive"}>
                <AlertDescription>{contribState.message}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={contribPending || goals.length === 0}>
              הפקדה
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
