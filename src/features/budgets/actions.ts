"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthUser, getMembershipContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: boolean; message?: string };

const budgetSchema = z.object({
  categoryId: z.string().uuid().optional().or(z.literal("")),
  amount: z.coerce.number().positive(),
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
});

export async function upsertBudgetAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getAuthUser();
  const context = await getMembershipContext();
  if (!user || !context) return { ok: false, message: "יש להתחבר" };

  const parsed = budgetSchema.safeParse({
    categoryId: formData.get("categoryId") || "",
    amount: formData.get("amount"),
    year: formData.get("year"),
    month: formData.get("month"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "שגיאה" };
  }

  const categoryId = parsed.data.categoryId || null;

  const supabase = await createClient();

  if (categoryId) {
    // The category must belong to this household
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .eq("household_id", context.household.id)
      .maybeSingle();
    if (!category) return { ok: false, message: "קטגוריה לא נמצאה" };
  }

  let query = supabase
    .from("budgets")
    .select("id")
    .eq("household_id", context.household.id)
    .eq("year", parsed.data.year)
    .eq("month", parsed.data.month);

  query = categoryId ? query.eq("category_id", categoryId) : query.is("category_id", null);
  const { data: existing } = await query.maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("budgets")
      .update({ amount: parsed.data.amount })
      .eq("id", existing.id);
    if (error) {
      if (error.code === "PGRST205" || /budgets/i.test(error.message)) {
        return {
          ok: false,
          message:
            "טבלת תקציבים עדיין לא הוגדרה. הריצו את supabase/migrations/20260307000200_phase4_budgets.sql ב־Supabase.",
        };
      }
      return { ok: false, message: error.message };
    }
  } else {
    const { error } = await supabase.from("budgets").insert({
      household_id: context.household.id,
      category_id: categoryId,
      amount: parsed.data.amount,
      year: parsed.data.year,
      month: parsed.data.month,
      created_by: user.id,
    });
    if (error) {
      if (error.code === "PGRST205" || /budgets/i.test(error.message)) {
        return {
          ok: false,
          message:
            "טבלת תקציבים עדיין לא הוגדרה. הריצו את supabase/migrations/20260307000200_phase4_budgets.sql ב־Supabase.",
        };
      }
      return { ok: false, message: error.message };
    }
  }

  revalidatePath("/budgets");
  revalidatePath("/");
  return { ok: true, message: "התקציב נשמר" };
}

export async function deleteBudgetAction(budgetId: string) {
  const context = await getMembershipContext();
  if (!context) return;
  const supabase = await createClient();
  await supabase
    .from("budgets")
    .delete()
    .eq("id", budgetId)
    .eq("household_id", context.household.id);
  revalidatePath("/budgets");
  revalidatePath("/");
}
