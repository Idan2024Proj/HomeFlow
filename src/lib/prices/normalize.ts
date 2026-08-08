export function normalizeProductName(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function parseMaybeNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseMaybeDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isReasonablePrice(price: number): boolean {
  return Number.isFinite(price) && price > 0 && price <= 50_000;
}

/** Reject suspicious tiny PriceFull files that would wipe good data. */
export function isSuspiciousPriceCount(count: number, previousCount: number | null) {
  if (count < 50) return true;
  if (previousCount != null && previousCount >= 500 && count < previousCount * 0.1) {
    return true;
  }
  return false;
}
