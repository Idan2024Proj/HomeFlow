"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  updateDisplayNameAction,
  type ActionResult,
} from "@/features/settings/actions";

const initial: ActionResult = { ok: false };

type DisplayNameFormProps = {
  currentName: string;
};

export function DisplayNameForm({ currentName }: DisplayNameFormProps) {
  const [state, action, pending] = useActionState(
    updateDisplayNameAction,
    initial,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName">שם תצוגה</Label>
        <Input
          id="displayName"
          name="displayName"
          required
          maxLength={80}
          defaultValue={currentName}
          placeholder="איך יופיע שמך באפליקציה"
        />
      </div>
      {state.message ? (
        <Alert variant={state.ok ? "success" : "destructive"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "שומר…" : "שמירת שם"}
      </Button>
    </form>
  );
}
