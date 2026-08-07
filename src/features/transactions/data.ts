import { createClient } from "@/lib/supabase/server";
import { computeSplits, normalizeMerchantName } from "@/lib/finance";
import type { TransactionFormInput } from "@/lib/validation/transactions";
import type { Category, PaymentMethod, TransactionRow } from "@/types/transactions";
import type { HouseholdMember } from "@/types/database";

export async function listCategories(householdId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("household_id", householdId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function listPaymentMethods(householdId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("household_id", householdId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PaymentMethod[];
}

export async function listActiveMembers(householdId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("household_members")
    .select("*")
    .eq("household_id", householdId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as HouseholdMember[];
}

export type ListTransactionsParams = {
  householdId: string;
  q?: string;
  type?: "all" | "expense" | "income";
  categoryId?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export async function listTransactions(params: ListTransactionsParams) {
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select(
      `
      *,
      category:categories(id, name, icon),
      payer:profiles!transactions_paid_by_fkey(id, full_name),
      splits:transaction_splits(*)
    `,
    )
    .eq("household_id", params.householdId)
    .is("deleted_at", null)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 100);

  if (params.type && params.type !== "all") {
    query = query.eq("type", params.type);
  }
  if (params.categoryId) {
    query = query.eq("category_id", params.categoryId);
  }
  if (params.from) {
    query = query.gte("occurred_on", params.from);
  }
  if (params.to) {
    query = query.lte("occurred_on", params.to);
  }
  if (params.q) {
    query = query.ilike("merchant_name", `%${params.q}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
  })) as TransactionRow[];
}

export async function getTransaction(householdId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      *,
      category:categories(id, name, icon),
      payer:profiles!transactions_paid_by_fkey(id, full_name),
      splits:transaction_splits(*)
    `,
    )
    .eq("household_id", householdId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { ...data, amount: Number(data.amount) } as TransactionRow;
}

async function ensureMerchant(
  householdId: string,
  merchantName: string,
  categoryId?: string,
) {
  const supabase = await createClient();
  const normalized = normalizeMerchantName(merchantName);

  const { data: existing } = await supabase
    .from("merchants")
    .select("id")
    .eq("household_id", householdId)
    .eq("normalized_name", normalized)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data, error } = await supabase
    .from("merchants")
    .insert({
      household_id: householdId,
      name: merchantName.trim(),
      normalized_name: normalized,
      default_category_id: categoryId ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

function buildSplitRows(
  input: TransactionFormInput,
  householdId: string,
  transactionId: string,
) {
  const mode =
    !input.isShared || input.type === "income" ? "personal" : input.splitMode;

  const participantIds = [...new Set(
    [input.participantA, input.participantB].filter(Boolean) as string[],
  )];

  if (mode !== "personal" && participantIds.length < 2) {
    // Fallback: treat as personal on paid_by when only one active member
    return [
      {
        household_id: householdId,
        transaction_id: transactionId,
        user_id: input.paidBy,
        share_amount: input.amount,
        share_percent: 100,
      },
    ];
  }

  const computed = computeSplits({
    amount: input.amount,
    mode,
    paidBy: input.paidBy,
    participantIds: mode === "equal" ? participantIds : [input.paidBy],
    percentParts:
      mode === "percent" && participantIds.length >= 2
        ? [
            { userId: participantIds[0], percent: input.percentA ?? 50 },
            { userId: participantIds[1], percent: input.percentB ?? 50 },
          ]
        : undefined,
    customParts:
      mode === "custom" && participantIds.length >= 2
        ? [
            { userId: participantIds[0], shareAmount: input.customAmountA ?? 0 },
            { userId: participantIds[1], shareAmount: input.customAmountB ?? 0 },
          ]
        : undefined,
  });

  return computed.map((split) => ({
    household_id: householdId,
    transaction_id: transactionId,
    user_id: split.userId,
    share_amount: split.shareAmount,
    share_percent: split.sharePercent,
  }));
}

export async function createTransaction(params: {
  householdId: string;
  userId: string;
  input: TransactionFormInput;
}) {
  const supabase = await createClient();
  const { householdId, userId, input } = params;
  const merchantId = await ensureMerchant(
    householdId,
    input.merchantName,
    input.categoryId,
  );

  const isShared = input.type === "expense" && input.isShared;
  const splitMode = isShared ? input.splitMode : "personal";

  const { data: tx, error } = await supabase
    .from("transactions")
    .insert({
      household_id: householdId,
      type: input.type,
      amount: input.amount,
      occurred_on: input.occurredOn,
      merchant_id: merchantId,
      merchant_name: input.merchantName.trim(),
      category_id: input.categoryId,
      payment_method_id: input.paymentMethodId ?? null,
      paid_by: input.paidBy,
      split_mode: splitMode,
      is_shared: isShared,
      note: input.note ?? null,
      status: "confirmed",
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) throw error;

  const splits = buildSplitRows(input, householdId, tx.id);
  const { error: splitError } = await supabase.from("transaction_splits").insert(splits);
  if (splitError) throw splitError;

  await supabase.from("activity_logs").insert({
    household_id: householdId,
    actor_id: userId,
    action: "transaction.created",
    entity_type: "transaction",
    entity_id: tx.id,
    metadata: { amount: input.amount, type: input.type },
  });

  return tx.id as string;
}

export async function updateTransaction(params: {
  householdId: string;
  userId: string;
  transactionId: string;
  input: TransactionFormInput;
}) {
  const supabase = await createClient();
  const { householdId, userId, transactionId, input } = params;
  const merchantId = await ensureMerchant(
    householdId,
    input.merchantName,
    input.categoryId,
  );

  const isShared = input.type === "expense" && input.isShared;
  const splitMode = isShared ? input.splitMode : "personal";

  const { error } = await supabase
    .from("transactions")
    .update({
      type: input.type,
      amount: input.amount,
      occurred_on: input.occurredOn,
      merchant_id: merchantId,
      merchant_name: input.merchantName.trim(),
      category_id: input.categoryId,
      payment_method_id: input.paymentMethodId ?? null,
      paid_by: input.paidBy,
      split_mode: splitMode,
      is_shared: isShared,
      note: input.note ?? null,
    })
    .eq("id", transactionId)
    .eq("household_id", householdId)
    .is("deleted_at", null);

  if (error) throw error;

  await supabase.from("transaction_splits").delete().eq("transaction_id", transactionId);

  const splits = buildSplitRows(input, householdId, transactionId);
  const { error: splitError } = await supabase.from("transaction_splits").insert(splits);
  if (splitError) throw splitError;

  await supabase.from("activity_logs").insert({
    household_id: householdId,
    actor_id: userId,
    action: "transaction.updated",
    entity_type: "transaction",
    entity_id: transactionId,
    metadata: { amount: input.amount, type: input.type },
  });
}

export async function softDeleteTransaction(params: {
  householdId: string;
  userId: string;
  transactionId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.transactionId)
    .eq("household_id", params.householdId)
    .is("deleted_at", null);

  if (error) throw error;

  await supabase.from("activity_logs").insert({
    household_id: params.householdId,
    actor_id: params.userId,
    action: "transaction.deleted",
    entity_type: "transaction",
    entity_id: params.transactionId,
    metadata: {},
  });
}
