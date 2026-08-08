/**
 * Import one Shufersal store PriceFull into Supabase.
 * Requires migration 20260307000500_supermarket_prices.sql and service role key.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/import-shufersal-prices.ts
 */
import {
  fetchShufersalPriceFull,
  fetchShufersalStores,
} from "../src/lib/supermarket/providers/shufersal";
import {
  importPricesForStore,
  upsertChain,
  upsertStores,
} from "../src/lib/supermarket/import";

async function main() {
  console.log("Fetching Shufersal stores…");
  const storesFeed = await fetchShufersalStores();
  const chainId = await upsertChain({
    externalId: storesFeed.chainExternalId || "7290027600007",
    name: storesFeed.chainName || "שופרסל",
    provider: "shufersal",
  });
  const storeMap = await upsertStores(chainId, storesFeed.stores);
  console.log("stores upserted", storeMap.size);

  console.log("Fetching PriceFull…");
  const prices = await fetchShufersalPriceFull();
  const storeId = storeMap.get(prices.storeExternalId);
  if (!storeId) {
    // Create placeholder store if listing/price store ids diverge
    const fallback = await upsertStores(chainId, [
      {
        chainExternalId: prices.chainExternalId,
        storeExternalId: prices.storeExternalId,
        name: `סניף ${prices.storeExternalId}`,
        address: null,
        city: null,
      },
    ]);
    const id = fallback.get(prices.storeExternalId);
    if (!id) throw new Error("Could not resolve store id");
    const result = await importPricesForStore({
      chainId,
      storeId: id,
      items: prices.items,
      sourceFile: prices.sourceFile,
    });
    console.log("imported", result.imported, "from", prices.sourceFile);
    return;
  }

  const result = await importPricesForStore({
    chainId,
    storeId,
    items: prices.items,
    sourceFile: prices.sourceFile,
  });
  console.log("imported", result.imported, "from", prices.sourceFile);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
