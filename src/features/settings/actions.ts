"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateDisplayNameSchema } from "@/lib/validation/auth";

export type ActionResult = {
  ok: boolean;
  message?: string;
};

export async function updateDisplayNameAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateDisplayNameSchema.safeParse({
    displayName: formData.get("displayName"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "שגיאה בטופס" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "יש להתחבר קודם" };
  }

  const displayName = parsed.data.displayName;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: displayName })
    .eq("id", user.id);

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  const { error: membershipError } = await supabase
    .from("household_members")
    .update({ display_name: displayName })
    .eq("user_id", user.id)
    .eq("status", "active");

  if (membershipError) {
    return { ok: false, message: membershipError.message };
  }

  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/settlements");

  return { ok: true, message: "שם התצוגה עודכן" };
}
