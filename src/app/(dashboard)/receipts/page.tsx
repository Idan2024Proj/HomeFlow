import type { Metadata } from "next";
import { getMembershipContext } from "@/lib/supabase/auth";
import { listActiveMembers, listCategories } from "@/features/transactions/data";
import { ReceiptScanner } from "@/features/receipts";

export const metadata: Metadata = {
  title: "סריקת קבלה (Beta) | HomeFlow",
};

export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  const context = await getMembershipContext();
  if (!context) return null;

  const [members, categories] = await Promise.all([
    listActiveMembers(context.household.id),
    listCategories(context.household.id),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">סריקת קבלה</h1>
        <p className="text-sm text-muted-foreground">
          Beta · צילום או העלאה · עריכה לפני יצירת הוצאה
        </p>
      </div>
      <ReceiptScanner
        members={members}
        categories={categories}
        currentUserId={context.profile.id}
        geminiConfigured={Boolean(process.env.GEMINI_API_KEY?.trim())}
      />
    </div>
  );
}
