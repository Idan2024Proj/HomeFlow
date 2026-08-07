export type Category = {
  id: string;
  household_id: string;
  name: string;
  kind: "expense" | "income" | "both";
  icon: string | null;
  color: string | null;
  is_system: boolean;
  sort_order: number;
};

export type PaymentMethod = {
  id: string;
  household_id: string;
  name: string;
  type: "cash" | "credit" | "debit" | "transfer" | "other";
  last_four: string | null;
  owner_user_id: string | null;
  is_active: boolean;
};

export type TransactionRow = {
  id: string;
  household_id: string;
  type: "expense" | "income";
  amount: number;
  currency: string;
  occurred_on: string;
  merchant_name: string;
  category_id: string | null;
  payment_method_id: string | null;
  paid_by: string;
  split_mode: "personal" | "equal" | "percent" | "custom";
  is_shared: boolean;
  note: string | null;
  status: string;
  created_by: string;
  deleted_at: string | null;
  category?: Pick<Category, "id" | "name" | "icon"> | null;
  payer?: { id: string; full_name: string } | null;
  splits?: TransactionSplit[];
};

export type TransactionSplit = {
  id: string;
  household_id: string;
  transaction_id: string;
  user_id: string;
  share_amount: number;
  share_percent: number | null;
};
