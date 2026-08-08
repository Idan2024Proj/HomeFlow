import { z } from "zod";

export const receiptItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  quantity: z.number().finite().min(0).nullable(),
  unitPrice: z.number().finite().min(0).nullable(),
  totalPrice: z.number().finite().min(0).nullable(),
});

export const parsedReceiptSchema = z.object({
  merchant: z.string().trim().min(1).max(200).nullable(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  total: z.number().finite().min(0).nullable(),
  currency: z.enum(["ILS", "USD", "EUR"]).nullable(),
  items: z.array(receiptItemSchema).max(200),
});

export type ParsedReceipt = z.infer<typeof parsedReceiptSchema>;
export type ParsedReceiptItem = z.infer<typeof receiptItemSchema>;

/** Soft validation for UI — never blocks save. */
export function buildReceiptWarnings(receipt: ParsedReceipt): string[] {
  const warnings: string[] = [];

  if (!receipt.merchant) warnings.push("שם בית העסק לא זוהה — כדאי לבדוק");
  if (!receipt.date) warnings.push("התאריך לא זוהה — כדאי לבדוק");
  if (receipt.total == null) warnings.push("הסכום הכולל לא זוהה — כדאי לבדוק");

  const itemSum = receipt.items.reduce((sum, item) => {
    const line =
      item.totalPrice ??
      (item.quantity != null && item.unitPrice != null
        ? item.quantity * item.unitPrice
        : null);
    return sum + (line ?? 0);
  }, 0);

  if (
    receipt.total != null &&
    receipt.items.length > 0 &&
    itemSum > 0 &&
    Math.abs(itemSum - receipt.total) > Math.max(1, receipt.total * 0.08)
  ) {
    warnings.push(
      `סכום הפריטים (₪${itemSum.toFixed(2)}) שונה מהסכום הכולל — כדאי לבדוק`,
    );
  }

  return warnings;
}

export function uncertainFields(receipt: ParsedReceipt): Set<string> {
  const fields = new Set<string>();
  if (!receipt.merchant) fields.add("merchant");
  if (!receipt.date) fields.add("date");
  if (receipt.total == null) fields.add("total");
  return fields;
}
