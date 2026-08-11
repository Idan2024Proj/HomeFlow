import { createClient } from "@/lib/supabase/server";
import type { PriceSearchHit } from "./types";
import milkFixture from "./fixtures/shufersal-milk.json";

function isMilkishQuery(q: string) {
  return q.includes("חלב");
}

export async function searchProductPrices(query: string): Promise<{
  hits: PriceSearchHit[];
  source: "database" | "fixture";
}> {
  const q = query.trim();
  if (!q) return { hits: [], source: "fixture" };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("latest_store_prices")
      .select(
        `
        price,
        source_updated_at,
        product:supermarket_products!inner(product_code, name),
        store:supermarket_stores(name, city, chain:supermarket_chains(name))
      `,
      )
      .ilike("supermarket_products.name", `%${q}%`)
      .order("price", { ascending: true })
      .limit(30);

    if (!error && data && data.length > 0) {
      const hits: PriceSearchHit[] = data.map((row) => {
        const product = (Array.isArray(row.product) ? row.product[0] : row.product) as {
          product_code: string;
          name: string;
        } | null;
        const storeRaw = Array.isArray(row.store) ? row.store[0] : row.store;
        const store = storeRaw as {
          name?: string;
          city?: string;
          chain?: { name: string } | Array<{ name: string }> | null;
        } | null;
        const chainRaw = store?.chain;
        const chain = Array.isArray(chainRaw) ? chainRaw[0] : chainRaw;
        return {
          productCode: product?.product_code ?? "",
          name: product?.name ?? "",
          price: Number(row.price),
          storeName: store?.name ?? null,
          storeCity: store?.city ?? null,
          chainName: chain?.name ?? "רשת",
          sourceUpdatedAt: row.source_updated_at as string | null,
        };
      });
      return { hits, source: "database" };
    }
  } catch {
    // fall through to fixture
  }

  // Real prices extracted from a live Shufersal PriceFull feed (not invented).
  const hits = milkFixture.items
    .filter((item) => item.name.includes(q) || (isMilkishQuery(q) && item.name.startsWith("חלב")))
    .map((item) => ({
      productCode: item.productCode,
      name: item.name,
      price: item.price,
      storeName: milkFixture.storeName,
      storeCity: null,
      chainName: milkFixture.chainName,
      sourceUpdatedAt: item.sourceUpdatedAt,
    }))
    .sort((a, b) => a.price - b.price);

  return { hits, source: "fixture" };
}
