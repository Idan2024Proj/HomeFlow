"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getMembershipContext, getAuthUser } from "@/lib/supabase/auth";
import { transactionFormSchema } from "@/lib/validation/transactions";
import {
  createTransaction,
  softDeleteTransaction,
  updateTransaction,
} from "@/features/transactions/data";

export type TransactionActionResult = {
  ok: boolean;
  message?: string;
};

function formToObject(formData: FormData) {
  return {
    type: formData.get("type"),
    amount: formData.get("amount"),
    merchantName: formData.get("merchantName"),
    categoryId: formData.get("categoryId"),
    occurredOn: formData.get("occurredOn"),
    paidBy: formData.get("paidBy"),
    isShared: formData.get("isShared") === "on" || formData.get("isShared") === "true",
    splitMode: formData.get("splitMode") || "personal",
    paymentMethodId: formData.get("paymentMethodId") || "",
    note: formData.get("note") || "",
    percentA: formData.get("percentA") || undefined,
    percentB: formData.get("percentB") || undefined,
    customAmountA: formData.get("customAmountA") || undefined,
    customAmountB: formData.get("customAmountB") || undefined,
    participantA: formData.get("participantA") || undefined,
    participantB: formData.get("participantB") || undefined,
  };
}

export async function createTransactionAction(
  _prev: TransactionActionResult,
  formData: FormData,
): Promise<TransactionActionResult> {
  const user = await getAuthUser();
  const context = await getMembershipContext();
  if (!user || !context) {
    return { ok: false, message: "יש להתחבר" };
  }

  const parsed = transactionFormSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "שגיאה בטופס",
    };
  }

  try {
    const id = await createTransaction({
      householdId: context.household.id,
      userId: user.id,
      input: parsed.data,
    });
    revalidatePath("/transactions");
    revalidatePath("/");
    redirect(`/transactions/${id}`);
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "digest" in error &&
      typeof (error as { digest?: string }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "שמירת התנועה נכשלה";
    if (/fetch failed/i.test(message)) {
      return {
        ok: false,
        message: "אין חיבור ל־Supabase. הריצו npm run dev מחדש.",
      };
    }
    return { ok: false, message };
  }
}

export async function updateTransactionAction(
  transactionId: string,
  _prev: TransactionActionResult,
  formData: FormData,
): Promise<TransactionActionResult> {
  const user = await getAuthUser();
  const context = await getMembershipContext();
  if (!user || !context) {
    return { ok: false, message: "יש להתחבר" };
  }

  const parsed = transactionFormSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "שגיאה בטופס",
    };
  }

  try {
    await updateTransaction({
      householdId: context.household.id,
      userId: user.id,
      transactionId,
      input: parsed.data,
    });
    revalidatePath("/transactions");
    revalidatePath(`/transactions/${transactionId}`);
    revalidatePath("/");
    redirect(`/transactions/${transactionId}`);
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "digest" in error &&
      typeof (error as { digest?: string }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "עדכון התנועה נכשל";
    return { ok: false, message };
  }
}

export async function deleteTransactionAction(transactionId: string) {
  const user = await getAuthUser();
  const context = await getMembershipContext();
  if (!user || !context) {
    redirect("/login");
  }

  await softDeleteTransaction({
    householdId: context.household.id,
    userId: user.id,
    transactionId,
  });
  revalidatePath("/transactions");
  revalidatePath("/");
  redirect("/transactions");
}
