import { searchProductPrices } from "@/lib/supermarket/search";

/**
 * Suggest a unit estimated price from supermarket transparency data.
 * Returns the cheapest matching hit, or null if none.
 */
export async function suggestEstimatedPrice(productName: string): Promise<number | null> {
  const q = productName.trim();
  if (!q) return null;

  const { hits } = await searchProductPrices(q);
  const price = hits[0]?.price;
  if (price == null || !Number.isFinite(price) || price < 0) return null;
  return Math.round(price * 100) / 100;
}

export async function suggestEstimatedPrices(
  names: string[],
): Promise<Map<string, number | null>> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (name) => [name, await suggestEstimatedPrice(name)] as const),
  );
  return new Map(entries);
}
