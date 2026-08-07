"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  bootstrapHouseholdSchema,
  inviteMemberSchema,
  loginWithPasswordSchema,
  magicLinkSchema,
  signUpInvitedSchema,
} from "@/lib/validation/auth";

export type ActionResult = {
  ok: boolean;
  message?: string;
};

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function isZeroCount(value: unknown) {
  return Number(value) === 0;
}

function allowBootstrapSignup(householdCount: unknown) {
  return process.env.ALLOW_BOOTSTRAP_SIGNUP === "true" || isZeroCount(householdCount);
}

function toUserMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/fetch failed|Failed to fetch|NetworkError|ENOTFOUND|ECONNREFUSED|certificate/i.test(message)) {
    return "אין חיבור ל־Supabase. בדקו את NEXT_PUBLIC_SUPABASE_URL ב־.env.local והפעילו מחדש את npm run dev.";
  }
  return fallback;
}

export async function signInWithPasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginWithPasswordSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "שגיאה בטופס" };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      return {
        ok: false,
        message: toUserMessage(error, "דוא״ל או סיסמה שגויים"),
      };
    }

    await supabase.rpc("accept_my_invites");
  } catch (error) {
    return { ok: false, message: toUserMessage(error, "ההתחברות נכשלה") };
  }

  redirect("/");
}

export async function sendMagicLinkAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = magicLinkSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "שגיאה בטופס" };
  }

  const email = parsed.data.email;

  try {
    const supabase = await createClient();

    const { data: inviteAllowed } = await supabase.rpc("has_pending_invite", {
      check_email: email,
    });

    const { data: householdCount } = await supabase.rpc("household_count");
    const allowBootstrap = allowBootstrapSignup(householdCount);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${appUrl()}/auth/callback`,
        shouldCreateUser: Boolean(inviteAllowed) || allowBootstrap,
      },
    });

    if (error) {
      return {
        ok: false,
        message: toUserMessage(
          error,
          "לא ניתן לשלוח קישור. ודא שהוזמנת למערכת או שכבר יש לך חשבון.",
        ),
      };
    }

    return { ok: true, message: "שלחנו קישור התחברות לדוא״ל שלך" };
  } catch (error) {
    return { ok: false, message: toUserMessage(error, "שליחת הקישור נכשלה") };
  }
}

export async function signUpInvitedAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signUpInvitedSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "שגיאה בטופס" };
  }

  try {
    const supabase = await createClient();
    const { data: inviteAllowed } = await supabase.rpc("has_pending_invite", {
      check_email: parsed.data.email,
    });

    const { data: householdCount } = await supabase.rpc("household_count");
    const allowBootstrap = allowBootstrapSignup(householdCount);

    if (!inviteAllowed && !allowBootstrap) {
      return {
        ok: false,
        message: "אין הרשמה ציבורית. ניתן להירשם רק עם הזמנה פעילה.",
      };
    }

    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName },
        emailRedirectTo: `${appUrl()}/auth/callback`,
      },
    });

    if (error) {
      return { ok: false, message: toUserMessage(error, error.message) };
    }

    await supabase.rpc("accept_my_invites");
    return {
      ok: true,
      message: "החשבון נוצר. אם נדרש אימות מייל — בדקו את תיבת הדוא״ל.",
    };
  } catch (error) {
    return { ok: false, message: toUserMessage(error, "יצירת החשבון נכשלה") };
  }
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function bootstrapHouseholdAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = bootstrapHouseholdSchema.safeParse({
    householdName: formData.get("householdName"),
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

  const { data: existing } = await supabase
    .from("household_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    redirect("/");
  }

  const { data: householdCount } = await supabase.rpc("household_count");
  const allowBootstrap = allowBootstrapSignup(householdCount);

  // Invited users are activated via accept_my_invites — bootstrap is for first owner only.
  if (!allowBootstrap) {
    return {
      ok: false,
      message: "לא ניתן ליצור משק בית חדש. אם הוזמנת — בקשו מהמזמין לבדוק את כתובת המייל.",
    };
  }

  const { error } = await supabase.rpc("create_household_as_owner", {
    p_name: parsed.data.householdName,
    p_display_name: parsed.data.displayName,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  redirect("/");
}

export async function inviteMemberAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    displayName: formData.get("displayName") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "שגיאה בטופס" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "יש להתחבר" };
  }

  const { data: membership } = await supabase
    .from("household_members")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .eq("role", "owner")
    .maybeSingle();

  if (!membership) {
    return { ok: false, message: "רק בעל משק הבית יכול להזמין משתמשים" };
  }

  const displayName =
    parsed.data.displayName?.trim() || parsed.data.email.split("@")[0] || "שותף";

  const { data: invite, error: inviteError } = await supabase
    .from("household_members")
    .insert({
      household_id: membership.household_id,
      role: "member",
      display_name: displayName,
      invite_email: parsed.data.email,
      status: "invited",
      invited_by: user.id,
    })
    .select("*")
    .single();

  if (inviteError) {
    if (inviteError.code === "23505") {
      return { ok: false, message: "כבר קיימת הזמנה או חברות לכתובת זו" };
    }
    return { ok: false, message: inviteError.message };
  }

  await supabase.from("activity_logs").insert({
    household_id: membership.household_id,
    actor_id: user.id,
    action: "member.invited",
    entity_type: "household_member",
    entity_id: invite.id,
    metadata: { email: parsed.data.email },
  });

  const admin = createAdminClient();
  if (admin) {
    const { error: adminError } = await admin.auth.admin.inviteUserByEmail(
      parsed.data.email,
      {
        redirectTo: `${appUrl()}/auth/callback`,
        data: { full_name: displayName },
      },
    );

    if (adminError) {
      return {
        ok: true,
        message:
          "ההזמנה נשמרה, אך שליחת מייל אוטומטית נכשלה. השותף יכול להירשם עם אותה כתובת דוא״ל ממסך ההתחברות.",
      };
    }
  }

  return {
    ok: true,
    message: admin
      ? "ההזמנה נשלחה בהצלחה"
      : "ההזמנה נשמרה. הגדירו SUPABASE_SERVICE_ROLE_KEY לשליחת מייל אוטומטית, או בקשו מהשותף להירשם עם אותה כתובת.",
  };
}
