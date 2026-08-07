import type { Metadata } from "next";
import { getMembershipContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { ImportWizard } from "@/features/imports/import-wizard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "ייבוא | HomeFlow" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const context = await getMembershipContext();
  if (!context) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("external_fingerprint")
    .eq("household_id", context.household.id)
    .not("external_fingerprint", "is", null)
    .limit(2000);

  const fingerprints = (data ?? [])
    .map((r) => r.external_fingerprint as string)
    .filter(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ייבוא דוח</h1>
        <p className="text-sm text-muted-foreground">
          עיבוד בדפדפן · הקובץ לא נשמר כברירת מחדל
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>אשף ייבוא</CardTitle>
          <CardDescription>Excel / CSV עם תצוגה מקדימה לפני שמירה</CardDescription>
        </CardHeader>
        <CardContent>
          <ImportWizard existingFingerprints={fingerprints} />
        </CardContent>
      </Card>
    </div>
  );
}
