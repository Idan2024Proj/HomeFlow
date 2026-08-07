"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthUser, getMembershipContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: boolean; message?: string; listId?: string };

export async function getShoppingData(householdId: string, listId?: string) {
  const supabase = await createClient();
  const { data: lists, error: listsError } = await supabase
    .from("shopping_lists")
    .select("*")
    .eq("household_id", householdId)
    .eq("is_archived", false)
    .order("created_at", { ascending: true });
  if (listsError) throw listsError;

  const activeListId = listId ?? (lists?.[0]?.id as string | undefined);
  if (!activeListId) {
    return { lists: lists ?? [], items: [], activeListId: null as string | null };
  }

  const { data: items, error: itemsError } = await supabase
    .from("shopping_items")
    .select("*")
    .eq("household_id", householdId)
    .eq("list_id", activeListId)
    .order("is_checked", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (itemsError) throw itemsError;

  return {
    lists: lists ?? [],
    items: items ?? [],
    activeListId,
  };
}

export async function createListAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getAuthUser();
  const context = await getMembershipContext();
  if (!user || !context) return { ok: false, message: "יש להתחבר" };
  const name = String(formData.get("name") || "").trim() || "רשימת קניות";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopping_lists")
    .insert({
      household_id: context.household.id,
      name,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  revalidatePath("/shopping");
  return { ok: true, listId: data.id };
}

export async function addItemAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getAuthUser();
  const context = await getMembershipContext();
  if (!user || !context) return { ok: false, message: "יש להתחבר" };

  const parsed = z
    .object({
      listId: z.string().uuid(),
      name: z.string().trim().min(1).max(120),
      quantity: z.coerce.number().positive().default(1),
      estimatedPrice: z.coerce.number().min(0).optional(),
    })
    .safeParse({
      listId: formData.get("listId"),
      name: formData.get("name"),
      quantity: formData.get("quantity") || 1,
      estimatedPrice: formData.get("estimatedPrice") || undefined,
    });
  if (!parsed.success) return { ok: false, message: "בדקו את הפריט" };

  const supabase = await createClient();
  const { error } = await supabase.from("shopping_items").insert({
    household_id: context.household.id,
    list_id: parsed.data.listId,
    name: parsed.data.name,
    quantity: parsed.data.quantity,
    estimated_price: parsed.data.estimatedPrice ?? null,
    added_by: user.id,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/shopping");
  return { ok: true };
}

export async function toggleItemAction(itemId: string, checked: boolean) {
  const user = await getAuthUser();
  const context = await getMembershipContext();
  if (!user || !context) return;
  const supabase = await createClient();
  await supabase
    .from("shopping_items")
    .update({
      is_checked: checked,
      checked_by: checked ? user.id : null,
    })
    .eq("id", itemId)
    .eq("household_id", context.household.id);
  revalidatePath("/shopping");
}

export async function deleteItemAction(itemId: string) {
  const context = await getMembershipContext();
  if (!context) return;
  const supabase = await createClient();
  await supabase
    .from("shopping_items")
    .delete()
    .eq("id", itemId)
    .eq("household_id", context.household.id);
  revalidatePath("/shopping");
}
