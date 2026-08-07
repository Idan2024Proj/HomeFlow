import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/server";
import type {
  Household,
  HouseholdMember,
  MembershipContext,
  Profile,
} from "@/types/database";

export async function getAuthUser() {
  if (!getSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function acceptPendingInvites() {
  if (!getSupabaseEnv()) {
    return;
  }
  const supabase = await createClient();
  await supabase.rpc("accept_my_invites");
}

export async function getMembershipContext(): Promise<MembershipContext | null> {
  if (!getSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    return null;
  }

  await acceptPendingInvites();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("household_members")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    return null;
  }

  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("*")
    .eq("id", membership.household_id)
    .maybeSingle();

  if (householdError || !household) {
    return null;
  }

  return {
    profile: profile as Profile,
    household: household as Household,
    membership: membership as HouseholdMember,
  };
}

export async function listHouseholdMembers(householdId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("household_members")
    .select("*")
    .eq("household_id", householdId)
    .neq("status", "removed")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as HouseholdMember[];
}
