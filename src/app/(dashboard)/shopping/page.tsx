import type { Metadata } from "next";
import { getMembershipContext } from "@/lib/supabase/auth";
import { getShoppingData } from "@/features/shopping/actions";
import { ShoppingClient } from "@/features/shopping/shopping-client";

export const metadata: Metadata = { title: "קניות | HomeFlow" };
export const dynamic = "force-dynamic";

export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ list?: string }>;
}) {
  const context = await getMembershipContext();
  if (!context) return null;
  const params = await searchParams;
  const data = await getShoppingData(context.household.id, params.list);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">קניות</h1>
        <p className="text-sm text-muted-foreground">רשימות משותפות עם סנכרון בזמן אמת</p>
      </div>
      <ShoppingClient
        householdId={context.household.id}
        lists={(data.lists as Array<{ id: string; name: string }>).map((l) => ({
          id: l.id,
          name: l.name,
        }))}
        activeListId={data.activeListId}
        initialItems={(data.items as Array<Record<string, unknown>>).map((i) => ({
          id: i.id as string,
          name: i.name as string,
          quantity: Number(i.quantity),
          estimated_price: i.estimated_price == null ? null : Number(i.estimated_price),
          is_checked: Boolean(i.is_checked),
          category: (i.category as string | null) ?? null,
        }))}
      />
    </div>
  );
}
