export type SettlementBalance = {
  userId: string;
  displayName: string;
  paid: number;
  owed: number;
  net: number;
};

export type SettlementSummary = {
  balances: SettlementBalance[];
  transfers: Array<{ fromUserId: string; toUserId: string; amount: number }>;
  headline: string;
  isBalanced: boolean;
};

function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeSettlement(input: {
  members: Array<{ userId: string; displayName: string }>;
  sharedExpenses: Array<{
    paidBy: string;
    splits: Array<{ userId: string; shareAmount: number }>;
  }>;
  settlements?: Array<{ fromUserId: string; toUserId: string; amount: number }>;
}): SettlementSummary {
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();

  for (const m of input.members) {
    paid.set(m.userId, 0);
    owed.set(m.userId, 0);
  }

  for (const expense of input.sharedExpenses) {
    const total = roundMoney(expense.splits.reduce((s, x) => s + x.shareAmount, 0));
    paid.set(expense.paidBy, roundMoney((paid.get(expense.paidBy) ?? 0) + total));
    for (const split of expense.splits) {
      owed.set(split.userId, roundMoney((owed.get(split.userId) ?? 0) + split.shareAmount));
    }
  }

  for (const s of input.settlements ?? []) {
    paid.set(s.fromUserId, roundMoney((paid.get(s.fromUserId) ?? 0) + s.amount));
    owed.set(s.toUserId, roundMoney((owed.get(s.toUserId) ?? 0) + s.amount));
  }

  const balances: SettlementBalance[] = input.members.map((m) => {
    const p = paid.get(m.userId) ?? 0;
    const o = owed.get(m.userId) ?? 0;
    return {
      userId: m.userId,
      displayName: m.displayName,
      paid: p,
      owed: o,
      net: roundMoney(p - o),
    };
  });

  const creditors = balances
    .filter((b) => b.net > 0.01)
    .map((b) => ({ userId: b.userId, amount: b.net }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = balances
    .filter((b) => b.net < -0.01)
    .map((b) => ({ userId: b.userId, amount: Math.abs(b.net) }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: SettlementSummary["transfers"] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = roundMoney(Math.min(debtors[i].amount, creditors[j].amount));
    if (amount > 0) {
      transfers.push({
        fromUserId: debtors[i].userId,
        toUserId: creditors[j].userId,
        amount,
      });
    }
    debtors[i].amount = roundMoney(debtors[i].amount - amount);
    creditors[j].amount = roundMoney(creditors[j].amount - amount);
    if (debtors[i].amount <= 0.01) i += 1;
    if (creditors[j].amount <= 0.01) j += 1;
  }

  const top = [...balances].sort((a, b) => b.net - a.net)[0];
  const isBalanced = balances.every((b) => Math.abs(b.net) <= 0.01);
  const headline = isBalanced
    ? "החשבון מאוזן"
    : top && top.net > 0.01
      ? `${top.displayName} צריך לקבל ${top.net.toLocaleString("he-IL")} ₪`
      : "יש יתרות לסגירה";

  return { balances, transfers, headline, isBalanced };
}
