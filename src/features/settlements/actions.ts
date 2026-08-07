"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthUser, getMembershipContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { computeSettlement } from "@/lib/finance";
import { listActiveMembers, listTransactions } from "@/features/transactions/data";

export type ActionResult = { ok: boolean; message?: string };

export async function getSettlementSummary(householdId: string) {
  const [members, transactions, settlementsRes] = await Promise.all([
    listActiveMembers(householdId),
    listTransactions({ householdId, type: "expense", limit: 500 }),
    (async () => {
      const supabase = await createClient();
      return supabase
        .from("settlements")
        .select("*")
        .eq("household_id", householdId)
        .order("settled_on", { ascending: false });
    })(),
  ]);

  if (settlementsRes.error) throw settlementsRes.error;

  const active = members.filter((m) => m.user_id);
  const shared = transactions
    .filter((t) => t.is_shared)
    .map((t) => ({
      paidBy: t.paid_by,
      splits: (t.splits ?? []).map((s) => ({
        userId: s.user_id,
        shareAmount: Number(s.share_amount),
      })),
    }));

  const summary = computeSettlement({
    members: active.map((m) => ({
      userId: m.user_id!,
      displayName: m.display_name || m.invite_email || "משתמש",
    })),
    sharedExpenses: shared,
    settlements: (settlementsRes.data ?? []).map((s) => ({
      fromUserId: s.from_user_id as string,
      toUserId: s.to_user_id as string,
      amount: Number(s.amount),
    })),
  });

  return {
    summary,
    history: settlementsRes.data ?? [],
    members: active,
  };
}

const settleSchema = z.object({
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  note: z.string().trim().max(200).optional(),
});

export async function createSettlementAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getAuthUser();
  const context = await getMembershipContext();
  if (!user || !context) return { ok: false, message: "יש להתחבר" };

  const parsed = settleSchema.safeParse({
    fromUserId: formData.get("fromUserId"),
    toUserId: formData.get("toUserId"),
    amount: formData.get("amount"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "שגיאה" };
  }

  if (parsed.data.fromUserId === parsed.data.toUserId) {
    return { ok: false, message: "לא ניתן לסגור חוב מול עצמך" };
  }

  // Both sides must be active members of this household
  const members = await listActiveMembers(context.household.id);
  const memberIds = new Set(members.map((m) => m.user_id).filter(Boolean));
  if (!memberIds.has(parsed.data.fromUserId) || !memberIds.has(parsed.data.toUserId)) {
    return { ok: false, message: "המשתמשים חייבים להיות חברי משק הבית" };
  }

  const supabase = await createClient();
  const now = new Date();
  const { error } = await supabase.from("settlements").insert({
    household_id: context.household.id,
    from_user_id: parsed.data.fromUserId,
    to_user_id: parsed.data.toUserId,
    amount: parsed.data.amount,
    note: parsed.data.note ?? null,
    period_year: now.getFullYear(),
    period_month: now.getMonth() + 1,
    created_by: user.id,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/settlements");
  return { ok: true, message: "החוב נסגר" };
}
