export type SplitParticipant = {
  userId: string;
  /** Optional display hint for tests/UI */
  label?: string;
};

export type ComputedSplit = {
  userId: string;
  shareAmount: number;
  sharePercent: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertPositiveAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("סכום חייב להיות גדול מאפס");
  }
}

/** Personal expense — entire amount belongs to one user. */
export function splitPersonal(amount: number, userId: string): ComputedSplit[] {
  assertPositiveAmount(amount);
  return [{ userId, shareAmount: roundMoney(amount), sharePercent: 100 }];
}

/** Equal split across N participants (supports 2+). Remainder cents go to first. */
export function splitEqual(amount: number, participants: SplitParticipant[]): ComputedSplit[] {
  assertPositiveAmount(amount);
  if (participants.length === 0) {
    throw new Error("נדרש לפחות משתתף אחד");
  }

  const n = participants.length;
  const base = Math.floor((amount * 100) / n) / 100;
  let allocated = 0;
  const splits = participants.map((p, index) => {
    const shareAmount =
      index === n - 1 ? roundMoney(amount - allocated) : roundMoney(base);
    allocated = roundMoney(allocated + shareAmount);
    return {
      userId: p.userId,
      shareAmount,
      sharePercent: roundMoney((shareAmount / amount) * 100),
    };
  });

  return splits;
}

/** Percent split — percents must sum to 100 (±0.01). */
export function splitByPercent(
  amount: number,
  parts: Array<{ userId: string; percent: number }>,
): ComputedSplit[] {
  assertPositiveAmount(amount);
  if (parts.length === 0) {
    throw new Error("נדרש לפחות משתתף אחד");
  }

  const totalPercent = parts.reduce((sum, p) => sum + p.percent, 0);
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error("סכום האחוזים חייב להיות 100");
  }

  let allocated = 0;
  return parts.map((p, index) => {
    const shareAmount =
      index === parts.length - 1
        ? roundMoney(amount - allocated)
        : roundMoney((amount * p.percent) / 100);
    allocated = roundMoney(allocated + shareAmount);
    return {
      userId: p.userId,
      shareAmount,
      sharePercent: roundMoney(p.percent),
    };
  });
}

/** Custom absolute amounts — must sum to total (±0.01). */
export function splitCustom(
  amount: number,
  parts: Array<{ userId: string; shareAmount: number }>,
): ComputedSplit[] {
  assertPositiveAmount(amount);
  if (parts.length === 0) {
    throw new Error("נדרש לפחות משתתף אחד");
  }

  const total = roundMoney(parts.reduce((sum, p) => sum + p.shareAmount, 0));
  if (Math.abs(total - amount) > 0.01) {
    throw new Error("סכומי החלוקה חייבים להסתכם לסכום העסקה");
  }

  return parts.map((p) => ({
    userId: p.userId,
    shareAmount: roundMoney(p.shareAmount),
    sharePercent: roundMoney((p.shareAmount / amount) * 100),
  }));
}

export type SplitMode = "personal" | "equal" | "percent" | "custom";

export function computeSplits(input: {
  amount: number;
  mode: SplitMode;
  paidBy: string;
  participantIds: string[];
  percentParts?: Array<{ userId: string; percent: number }>;
  customParts?: Array<{ userId: string; shareAmount: number }>;
}): ComputedSplit[] {
  switch (input.mode) {
    case "personal":
      return splitPersonal(input.amount, input.paidBy);
    case "equal":
      return splitEqual(
        input.amount,
        input.participantIds.map((userId) => ({ userId })),
      );
    case "percent":
      return splitByPercent(input.amount, input.percentParts ?? []);
    case "custom":
      return splitCustom(input.amount, input.customParts ?? []);
    default:
      throw new Error("מצב חלוקה לא נתמך");
  }
}

export function normalizeMerchantName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
