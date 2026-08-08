import { z } from "zod";

export const parsedShoppingItemSchema = z.object({
  rawText: z.string().min(1).max(500),
  name: z.string().trim().min(1).max(120),
  quantity: z.number().finite().positive().max(10_000),
  unit: z.string().trim().max(40).nullable(),
  notes: z.string().trim().max(200).nullable(),
});

export const shoppingTxtImportItemsSchema = z
  .array(parsedShoppingItemSchema)
  .min(1, "לא נמצאו מוצרים ברשימה.")
  .max(500);

export function getShoppingTxtMaxBytes() {
  const kb = Number(process.env.SHOPPING_TXT_MAX_KB ?? "100");
  const safeKb = Number.isFinite(kb) && kb > 0 ? kb : 100;
  return Math.round(safeKb * 1024);
}
