"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { inviteMemberAction, type ActionResult } from "@/features/auth/actions";

const initial: ActionResult = { ok: false };

export function InviteMemberForm() {
  const [state, action, pending] = useActionState(inviteMemberAction, initial);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invite-email">דוא״ל להזמנה</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          required
          dir="ltr"
          className="text-left"
          placeholder="partner@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-name">שם תצוגה (אופציונלי)</Label>
        <Input id="invite-name" name="displayName" maxLength={80} />
      </div>
      {state.message ? (
        <Alert variant={state.ok ? "success" : "destructive"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "שולח…" : "שליחת הזמנה"}
      </Button>
    </form>
  );
}
