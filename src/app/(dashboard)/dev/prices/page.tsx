import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMembershipContext } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/money";

export const metadata: Metadata = { title: "Price Debug | HomeFlow" };
export const dynamic = "force-dynamic";

function debugAllowed() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_PRICE_DEBUG === "true"
  );
}

export default async function PriceDebugPage() {
  if (!debugAllowed()) notFound();

  const context = await getMembershipContext();
  if (!context) notFound();

  const admin = createAdminClient();
  if (!admin) {
    return (
      <p className="text-sm text-destructive">
        חסר SUPABASE_SERVICE_ROLE_KEY לתצוגת דיבאג.
      </p>
    );
  }

  const { data: chain } = await admin
    .from("supermarket_chains")
    .select("id, name, provider, external_id")
    .eq("provider", "shufersal")
    .maybeSingle();

  const { count: storeCount } = await admin
    .from("supermarket_stores")
    .select("*", { count: "exact", head: true })
    .eq("chain_id", chain?.id ?? "00000000-0000-0000-0000-000000000000");

  const { data: statusRows } = await admin
    .from("store_import_status")
    .select("*, store:supermarket_stores(name, city, external_id)")
    .eq("last_status", "success")
    .order("last_success_at", { ascending: false })
    .limit(5);

  const firstStoreId = statusRows?.[0]?.store_id as string | undefined;
  let sample: Array<{ name: string; price: number }> = [];
  let productCount = 0;
  if (firstStoreId) {
    const { count } = await admin
      .from("latest_store_prices")
      .select("*", { count: "exact", head: true })
      .eq("store_id", firstStoreId);
    productCount = count ?? 0;

    const { data: prices } = await admin
      .from("latest_store_prices")
      .select("price, product:supermarket_products(name)")
      .eq("store_id", firstStoreId)
      .order("price", { ascending: true })
      .limit(8);

    sample =
      prices?.map((row) => {
        const product = Array.isArray(row.product) ? row.product[0] : row.product;
        return {
          name: (product as { name?: string } | null)?.name ?? "—",
          price: Number(row.price),
        };
      }) ?? [];
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Price Debug</h1>
        <p className="text-sm text-muted-foreground">
          פיתוח בלבד · לא לחשיפה בפרודקשן
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider</CardTitle>
          <CardDescription>שופרסל · prices.shufersal.co.il</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Chain: {chain?.name ?? "—"} ({chain?.external_id ?? "not imported"})</p>
          <p>Stores imported: {storeCount ?? 0}</p>
        </CardContent>
      </Card>

      {statusRows?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Last successful imports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {statusRows.map((row) => {
              const store = Array.isArray(row.store) ? row.store[0] : row.store;
              const s = store as {
                name?: string;
                city?: string;
                external_id?: string;
              } | null;
              return (
                <div key={row.store_id as string} className="rounded-xl border border-border p-3">
                  <p className="font-medium">
                    {s?.name ?? s?.external_id} · {s?.city ?? ""}
                  </p>
                  <p className="text-muted-foreground">
                    {row.last_item_count} products · {row.last_source_file}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.last_success_at
                      ? new Date(row.last_success_at as string).toLocaleString("he-IL")
                      : ""}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            עדיין אין ייבוא מחירים. הריצו את המיגרציה ואז:
            <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs" dir="ltr">
              {`npx tsx --env-file=.env.local scripts/import-shufersal.ts --stores
npx tsx --env-file=.env.local scripts/import-shufersal.ts --prices --store=357`}
            </pre>
          </CardContent>
        </Card>
      )}

      {sample.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Example rows</CardTitle>
            <CardDescription>{productCount.toLocaleString("he-IL")} products in latest store</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {sample.map((row) => (
              <p key={row.name + row.price}>
                {row.name} — {formatMoney(row.price)}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
