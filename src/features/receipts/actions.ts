"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthUser, getMembershipContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { createTransaction } from "@/features/transactions/data";
import { parsedReceiptSchema, receiptItemSchema } from "@/lib/receipts/schema";

export type ActionResult = {
  ok: boolean;
  message?: string;
  transactionId?: string;
};

const saveSchema = z.object({
  merchant: z.string().trim().min(1, "נא להזין בית עסק").max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין"),
  total: z.coerce.number().positive("סכום חייב להיות גדול מאפס"),
  currency: z.enum(["ILS", "USD", "EUR"]).default("ILS"),
  categoryId: z.string().uuid("נא לבחור קטגוריה"),
  paidBy: z.string().uuid(),
  isShared: z.boolean().default(false),
  splitMode: z.enum(["personal", "equal", "percent", "custom"]).default("personal"),
  participantA: z.string().uuid().optional(),
  participantB: z.string().uuid().optional(),
  items: z.array(receiptItemSchema).max(200),
});

export async function createExpenseFromReceiptAction(
  input: z.infer<typeof saveSchema>,
): Promise<ActionResult> {
  const user = await getAuthUser();
  const context = await getMembershipContext();
  if (!user || !context) {
    return { ok: false, message: "יש להתחבר" };
  }

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "שגיאה בטופס" };
  }

  // Soft-check Gemini-shaped payload still valid for items
  const itemsCheck = parsedReceiptSchema.shape.items.safeParse(parsed.data.items);
  if (!itemsCheck.success) {
    return { ok: false, message: "רשימת המוצרים אינה תקינה" };
  }

  try {
    const transactionId = await createTransaction({
      householdId: context.household.id,
      userId: user.id,
      input: {
        type: "expense",
        amount: parsed.data.total,
        merchantName: parsed.data.merchant,
        categoryId: parsed.data.categoryId,
        occurredOn: parsed.data.date,
        paidBy: parsed.data.paidBy,
        isShared: parsed.data.isShared,
        splitMode: parsed.data.isShared ? parsed.data.splitMode : "personal",
        paymentMethodId: undefined,
        participantA: parsed.data.participantA,
        participantB: parsed.data.participantB,
        note: "נוצר מסריקת קבלה (Beta)",
      },
    });

    if (parsed.data.items.length > 0) {
      const supabase = await createClient();
      const { error } = await supabase.from("receipt_items").insert(
        parsed.data.items.map((item) => ({
          transaction_id: transactionId,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          raw_text: item.name,
        })),
      );

      if (error) {
        // Transaction already created — surface soft failure for line items
        if (error.code === "PGRST205" || /receipt_items/i.test(error.message)) {
          revalidatePath("/transactions");
          revalidatePath("/");
          revalidatePath("/receipts");
          return {
            ok: true,
            transactionId,
            message:
              "ההוצאה נוצרה, אך טבלת פריטי הקבלה עדיין לא הוגדרה ב־Supabase. הריצו את המיגרציה 20260307000400_receipt_items.sql",
          };
        }
        return {
          ok: true,
          transactionId,
          message: `ההוצאה נוצרה, אך שמירת פריטי הקבלה נכשלה: ${error.message}`,
        };
      }
    }

    revalidatePath("/transactions");
    revalidatePath(`/transactions/${transactionId}`);
    revalidatePath("/");
    revalidatePath("/receipts");

    return {
      ok: true,
      transactionId,
      message: "הקבלה נוספה בהצלחה",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "שמירת הקבלה נכשלה";
    return { ok: false, message };
  }
}
