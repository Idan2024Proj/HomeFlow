import type { Metadata } from "next";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LoginForm } from "@/features/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "התחברות | HomeFlow",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="relative mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <div className="absolute end-6 top-6">
        <ThemeToggle variant="compact" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-16 mx-auto h-40 w-40 rounded-full bg-primary/5 blur-3xl"
      />
      <div className="mb-8 space-y-2 text-center">
        <p className="text-sm font-medium text-primary">HomeFlow</p>
        <h1 className="text-2xl font-semibold tracking-tight">התחברות</h1>
        <p className="text-sm text-muted-foreground">ניהול משק בית משותף</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ברוכים הבאים</CardTitle>
          <CardDescription>התחברות בדוא״ל וסיסמה או בקישור מייל</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error ? (
            <Alert variant="destructive">
              <AlertDescription>ההתחברות נכשלה. נסו שוב.</AlertDescription>
            </Alert>
          ) : null}
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
