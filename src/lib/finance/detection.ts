export type DetectedDuplicate = {
  aId: string;
  bId: string;
  score: number;
  reason: string;
};

export type DetectedAnomaly = {
  transactionId: string;
  type: "unusual_amount" | "duplicate" | "budget_over" | "other";
  severity: "info" | "warning" | "critical";
  message: string;
};

export type DetectedRecurring = {
  merchantName: string;
  normalizedName: string;
  averageAmount: number;
  frequency: "monthly";
  occurrences: number;
};

function normalize(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function daysBetween(a: string, b: string) {
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.abs(da - db) / (24 * 60 * 60 * 1000);
}

export function detectDuplicates(
  transactions: Array<{
    id: string;
    merchant_name: string;
    amount: number;
    occurred_on: string;
    payment_method_id?: string | null;
  }>,
): DetectedDuplicate[] {
  const results: DetectedDuplicate[] = [];
  for (let i = 0; i < transactions.length; i += 1) {
    for (let j = i + 1; j < transactions.length; j += 1) {
      const a = transactions[i];
      const b = transactions[j];
      if (normalize(a.merchant_name) !== normalize(b.merchant_name)) continue;
      if (Math.abs(a.amount - b.amount) > 0.05) continue;
      if (daysBetween(a.occurred_on, b.occurred_on) > 2) continue;
      if (
        a.payment_method_id &&
        b.payment_method_id &&
        a.payment_method_id !== b.payment_method_id
      ) {
        continue;
      }
      results.push({
        aId: a.id,
        bId: b.id,
        score: 0.9,
        reason: "אותו בית עסק, סכום ותאריך קרובים",
      });
    }
  }
  return results;
}

export function detectUnusualAmounts(
  transactions: Array<{
    id: string;
    merchant_name: string;
    amount: number;
    category_id?: string | null;
    type: "expense" | "income";
  }>,
): DetectedAnomaly[] {
  const byCategory = new Map<string, number[]>();
  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    const key = tx.category_id ?? "none";
    const list = byCategory.get(key) ?? [];
    list.push(tx.amount);
    byCategory.set(key, list);
  }

  const averages = new Map<string, number>();
  for (const [key, amounts] of byCategory) {
    if (amounts.length < 3) continue;
    averages.set(key, amounts.reduce((s, n) => s + n, 0) / amounts.length);
  }

  const anomalies: DetectedAnomaly[] = [];
  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    const key = tx.category_id ?? "none";
    const avg = averages.get(key);
    if (!avg) continue;
    if (tx.amount >= avg * 2.5 && tx.amount - avg > 50) {
      anomalies.push({
        transactionId: tx.id,
        type: "unusual_amount",
        severity: tx.amount >= avg * 4 ? "critical" : "warning",
        message: `הוצאה חריגה אצל "${tx.merchant_name}" (${tx.amount.toFixed(0)} ₪ מול ממוצע ${avg.toFixed(0)} ₪)`,
      });
    }
  }
  return anomalies;
}

export function detectRecurringPayments(
  transactions: Array<{
    merchant_name: string;
    amount: number;
    occurred_on: string;
    type: "expense" | "income";
  }>,
): DetectedRecurring[] {
  const groups = new Map<
    string,
    Array<{ amount: number; occurred_on: string; merchant_name: string }>
  >();

  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    const key = normalize(tx.merchant_name);
    const list = groups.get(key) ?? [];
    list.push({
      amount: tx.amount,
      occurred_on: tx.occurred_on,
      merchant_name: tx.merchant_name,
    });
    groups.set(key, list);
  }

  const recurring: DetectedRecurring[] = [];
  for (const [key, list] of groups) {
    if (list.length < 3) continue;
    const sorted = [...list].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i += 1) {
      gaps.push(daysBetween(sorted[i - 1].occurred_on, sorted[i].occurred_on));
    }
    const avgGap = gaps.reduce((s, n) => s + n, 0) / gaps.length;
    if (avgGap < 25 || avgGap > 40) continue;
    const amounts = sorted.map((x) => x.amount);
    const avgAmount = amounts.reduce((s, n) => s + n, 0) / amounts.length;
    const varianceOk = amounts.every((a) => Math.abs(a - avgAmount) / avgAmount <= 0.15);
    if (!varianceOk) continue;
    recurring.push({
      merchantName: sorted[sorted.length - 1].merchant_name,
      normalizedName: key,
      averageAmount: Math.round(avgAmount * 100) / 100,
      frequency: "monthly",
      occurrences: sorted.length,
    });
  }
  return recurring;
}

export function fingerprintImportRow(input: {
  occurredOn: string;
  amount: number;
  merchantName: string;
  lastFour?: string;
}): string {
  return [
    input.occurredOn,
    input.amount.toFixed(2),
    normalize(input.merchantName),
    input.lastFour ?? "",
  ].join("|");
}
