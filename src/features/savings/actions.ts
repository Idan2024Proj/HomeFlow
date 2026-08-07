"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthUser, getMembershipContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: boolean; message?: string };

export async function listSavingsGoals(householdId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createGoalAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getAuthUser();
  const context = await getMembershipContext();
  if (!user || !context) return { ok: false, message: "יש להתחבר" };

  const parsed = z
    .object({
      name: z.string().trim().min(1).max(80),
      targetAmount: z.coerce.number().positive(),
      targetDate: z.string().optional(),
    })
    .safeParse({
      name: formData.get("name"),
      targetAmount: formData.get("targetAmount"),
      targetDate: formData.get("targetDate") || undefined,
    });
  if (!parsed.success) return { ok: false, message: "בדקו את הטופס" };

  const supabase = await createClient();
  const { error } = await supabase.from("savings_goals").insert({
    household_id: context.household.id,
    name: parsed.data.name,
    target_amount: parsed.data.targetAmount,
    target_date: parsed.data.targetDate || null,
    created_by: user.id,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/savings");
  return { ok: true, message: "היעד נוצר" };
}

export async function contributeAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getAuthUser();
  const context = await getMembershipContext();
  if (!user || !context) return { ok: false, message: "יש להתחבר" };

  const parsed = z
    .object({
      goalId: z.string().uuid(),
      amount: z.coerce.number().positive(),
    })
    .safeParse({
      goalId: formData.get("goalId"),
      amount: formData.get("amount"),
    });
  if (!parsed.success) return { ok: false, message: "בדקו את הטופס" };

  const supabase = await createClient();
  const { data: goal } = await supabase
    .from("savings_goals")
    .select("id, current_amount")
    .eq("id", parsed.data.goalId)
    .eq("household_id", context.household.id)
    .maybeSingle();
  if (!goal) return { ok: false, message: "יעד לא נמצא" };

  const { error } = await supabase.from("savings_contributions").insert({
    household_id: context.household.id,
    goal_id: parsed.data.goalId,
    amount: parsed.data.amount,
    contributed_by: user.id,
  });
  if (error) return { ok: false, message: error.message };

  await supabase
    .from("savings_goals")
    .update({
      current_amount: Number(goal.current_amount) + parsed.data.amount,
    })
    .eq("id", parsed.data.goalId);

  revalidatePath("/savings");
  return { ok: true, message: "ההפקדה נשמרה" };
}
