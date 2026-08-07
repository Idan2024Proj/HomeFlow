"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionResult } from "@/features/settlements/actions";

const initial: ActionResult = { ok: false };

export function SettlementClient({
  members,
  suggested,
  action,
}: {
  members: Array<{ id: string; name: string }>;
  suggested?: { fromUserId: string; toUserId: string; amount: number };
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>ממי</Label>
          <select
            name="fromUserId"
            defaultValue={suggested?.fromUserId ?? members[0]?.id}
            className="h-8 w-full rounded-lg border border-input px-2.5 text-sm"
            required
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>למי</Label>
          <select
            name="toUserId"
            defaultValue={suggested?.toUserId ?? members[1]?.id ?? members[0]?.id}
            className="h-8 w-full rounded-lg border border-input px-2.5 text-sm"
            required
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>סכום</Label>
        <Input
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          defaultValue={suggested?.amount ?? ""}
          dir="ltr"
          className="text-left"
        />
      </div>
      <div className="space-y-1">
        <Label>הערה</Label>
        <Input name="note" maxLength={200} />
      </div>
      {state.message ? (
        <Alert variant={state.ok ? "success" : "destructive"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "שומר…" : "סגירת חוב"}
      </Button>
    </form>
  );
}
