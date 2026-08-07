"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  sendMagicLinkAction,
  signInWithPasswordAction,
  signUpInvitedAction,
  type ActionResult,
} from "@/features/auth/actions";

const initial: ActionResult = { ok: false };

export function LoginForm() {
  const [passwordState, passwordAction, passwordPending] = useActionState(
    signInWithPasswordAction,
    initial,
  );
  const [magicState, magicAction, magicPending] = useActionState(
    sendMagicLinkAction,
    initial,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpInvitedAction,
    initial,
  );

  return (
    <div className="space-y-6">
      <form action={passwordAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">דוא״ל</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            dir="ltr"
            className="text-left"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">סיסמה</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            dir="ltr"
            className="text-left"
            minLength={8}
          />
        </div>
        {passwordState.message && !passwordState.ok ? (
          <Alert variant="destructive">
            <AlertDescription>{passwordState.message}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit" className="w-full" disabled={passwordPending}>
          {passwordPending ? "מתחבר…" : "התחברות"}
        </Button>
      </form>

      <Separator />

      <form action={magicAction} className="space-y-3">
        <p className="text-sm text-muted-foreground">או שליחת קישור במייל</p>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          dir="ltr"
          className="text-left"
          placeholder="you@example.com"
          aria-label="דוא״ל לקישור התחברות"
        />
        {magicState.message ? (
          <Alert variant={magicState.ok ? "success" : "destructive"}>
            <AlertDescription>{magicState.message}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          type="submit"
          variant="outline"
          className="w-full"
          disabled={magicPending}
        >
          {magicPending ? "שולח…" : "שליחת קישור במייל"}
        </Button>
      </form>

      <Separator />

      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          הרשמה עם הזמנה
        </summary>
        <form action={signUpAction} className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="fullName">שם מלא</Label>
            <Input id="fullName" name="fullName" required maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">דוא״ל מוזמן</Label>
            <Input
              id="signup-email"
              name="email"
              type="email"
              required
              dir="ltr"
              className="text-left"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">סיסמה</Label>
            <Input
              id="signup-password"
              name="password"
              type="password"
              required
              minLength={8}
              dir="ltr"
              className="text-left"
            />
          </div>
          {signUpState.message ? (
            <Alert variant={signUpState.ok ? "success" : "destructive"}>
              <AlertDescription>{signUpState.message}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" variant="secondary" className="w-full" disabled={signUpPending}>
            {signUpPending ? "יוצר חשבון…" : "יצירת חשבון"}
          </Button>
        </form>
      </details>
    </div>
  );
}
