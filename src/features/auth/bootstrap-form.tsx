"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  bootstrapHouseholdAction,
  type ActionResult,
} from "@/features/auth/actions";

const initial: ActionResult = { ok: false };

export function BootstrapForm() {
  const [state, action, pending] = useActionState(bootstrapHouseholdAction, initial);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="householdName">שם משק הבית</Label>
        <Input
          id="householdName"
          name="householdName"
          required
          maxLength={80}
          placeholder="הבית שלנו"
          defaultValue="הבית שלנו"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="displayName">שם התצוגה שלך</Label>
        <Input id="displayName" name="displayName" required maxLength={80} />
      </div>
      {state.message && !state.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "יוצר…" : "יצירת משק בית"}
      </Button>
    </form>
  );
}
