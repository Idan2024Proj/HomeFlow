export type Profile = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  preferred_locale: string;
  created_at: string;
  updated_at: string;
};

export type Household = {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type HouseholdMember = {
  id: string;
  household_id: string;
  user_id: string | null;
  role: "owner" | "member";
  display_name: string;
  invite_email: string | null;
  status: "active" | "invited" | "removed";
  invited_by: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MembershipContext = {
  profile: Profile;
  household: Household;
  membership: HouseholdMember;
};
