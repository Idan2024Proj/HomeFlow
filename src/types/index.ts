export type HouseholdRole = "owner" | "member";

export type MemberStatus = "active" | "invited" | "removed";

export type TransactionType = "expense" | "income";

export type SplitMode = "personal" | "equal" | "percent" | "custom";

export type {
  Profile,
  Household,
  HouseholdMember,
  MembershipContext,
} from "./database";

export type {
  Category,
  PaymentMethod,
  TransactionRow,
  TransactionSplit,
} from "./transactions";
