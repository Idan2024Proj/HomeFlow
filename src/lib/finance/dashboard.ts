export type MonthTxInput = {
  type: "expense" | "income";
  amount: number;
  occurred_on: string; // YYYY-MM-DD
  category_id?: string | null;
  category_name?: string | null;
};

export type MonthSummary = {
  income: number;
  expense: number;
  balance: number;
  expenseByDay: Array<{ date: string; expense: number; income: number; balance: number }>;
  categoryBreakdown: Array<{
    categoryId: string | null;
    name: string;
    amount: number;
    percent: number;
  }>;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function buildMonthSummary(
  transactions: MonthTxInput[],
  monthStart: string,
  monthEnd: string,
): MonthSummary {
  let income = 0;
  let expense = 0;
  const byDay = new Map<string, { expense: number; income: number }>();
  const byCategory = new Map<string, { name: string; amount: number }>();

  for (const tx of transactions) {
    if (tx.occurred_on < monthStart || tx.occurred_on > monthEnd) continue;

    const day = byDay.get(tx.occurred_on) ?? { expense: 0, income: 0 };
    if (tx.type === "income") {
      income += tx.amount;
      day.income += tx.amount;
    } else {
      expense += tx.amount;
      day.expense += tx.amount;
      const key = tx.category_id ?? "none";
      const current = byCategory.get(key) ?? {
        name: tx.category_name ?? "ללא קטגוריה",
        amount: 0,
      };
      current.amount += tx.amount;
      byCategory.set(key, current);
    }
    byDay.set(tx.occurred_on, day);
  }

  income = roundMoney(income);
  expense = roundMoney(expense);

  const days: string[] = [];
  const cursor = new Date(`${monthStart}T00:00:00`);
  const end = new Date(`${monthEnd}T00:00:00`);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  let running = 0;
  const expenseByDay = days.map((date) => {
    const day = byDay.get(date) ?? { expense: 0, income: 0 };
    running = roundMoney(running + day.income - day.expense);
    return {
      date,
      expense: roundMoney(day.expense),
      income: roundMoney(day.income),
      balance: running,
    };
  });

  const categoryBreakdown = [...byCategory.entries()]
    .map(([categoryId, value]) => ({
      categoryId: categoryId === "none" ? null : categoryId,
      name: value.name,
      amount: roundMoney(value.amount),
      percent: expense > 0 ? roundMoney((value.amount / expense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    income,
    expense,
    balance: roundMoney(income - expense),
    expenseByDay,
    categoryBreakdown,
  };
}

export type ForecastScenario = {
  key: "frugal" | "normal" | "high";
  label: string;
  expectedVariableExpense: number;
  expectedTotalExpense: number;
  expectedBalance: number;
};

export type MonthForecast = {
  daysElapsed: number;
  daysRemaining: number;
  dailyAverageExpense: number;
  spentSoFar: number;
  incomeSoFar: number;
  scenarios: ForecastScenario[];
  primaryExpectedBalance: number;
};

/**
 * Forecast based on variable daily spend average.
 * remainingFixedPayments reserved for Phase 5/8 recurring payments.
 */
export function forecastMonthEnd(input: {
  today: string; // YYYY-MM-DD within month
  monthStart: string;
  monthEnd: string;
  incomeSoFar: number;
  expectedRemainingIncome?: number;
  expenseSoFar: number;
  remainingFixedPayments?: number;
}): MonthForecast {
  const start = new Date(`${input.monthStart}T00:00:00`);
  const end = new Date(`${input.monthEnd}T00:00:00`);
  const today = new Date(`${input.today}T00:00:00`);

  const totalDays =
    Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const daysElapsed = Math.min(
    totalDays,
    Math.max(1, Math.floor((today.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1),
  );
  const daysRemaining = Math.max(0, totalDays - daysElapsed);

  const dailyAverageExpense = roundMoney(input.expenseSoFar / daysElapsed);
  const fixed = input.remainingFixedPayments ?? 0;
  const remainingIncome = input.expectedRemainingIncome ?? 0;

  const build = (
    key: ForecastScenario["key"],
    label: string,
    multiplier: number,
  ): ForecastScenario => {
    const expectedVariableExpense = roundMoney(
      dailyAverageExpense * daysRemaining * multiplier,
    );
    const expectedTotalExpense = roundMoney(
      input.expenseSoFar + expectedVariableExpense + fixed,
    );
    const expectedBalance = roundMoney(
      input.incomeSoFar + remainingIncome - expectedTotalExpense,
    );
    return {
      key,
      label,
      expectedVariableExpense,
      expectedTotalExpense,
      expectedBalance,
    };
  };

  const scenarios = [
    build("frugal", "חסכוני", 0.85),
    build("normal", "רגיל", 1),
    build("high", "גבוה", 1.2),
  ];

  return {
    daysElapsed,
    daysRemaining,
    dailyAverageExpense,
    spentSoFar: roundMoney(input.expenseSoFar),
    incomeSoFar: roundMoney(input.incomeSoFar),
    scenarios,
    primaryExpectedBalance: scenarios[1].expectedBalance,
  };
}

export type DashboardAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  message: string;
};

/** Lightweight rule-based alerts for Phase 4 (full anomaly engine in Phase 8). */
export function buildDashboardAlerts(input: {
  income: number;
  expense: number;
  forecastBalance: number;
  topCategoryName?: string;
  topCategoryPercent?: number;
  hasTransactions: boolean;
}): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  if (!input.hasTransactions) {
    alerts.push({
      id: "empty",
      severity: "info",
      message: "עדיין אין תנועות החודש — הוסיפו הוצאה או ייבאו דוח.",
    });
    return alerts;
  }

  if (input.income === 0 && input.expense > 0) {
    alerts.push({
      id: "no-income",
      severity: "warning",
      message: "נרשמו הוצאות ללא הכנסות החודש.",
    });
  }

  if (input.forecastBalance < 0) {
    alerts.push({
      id: "forecast-negative",
      severity: "critical",
      message: "התחזית לסוף החודש שלילית — כדאי לבדוק הוצאות.",
    });
  }

  if ((input.topCategoryPercent ?? 0) >= 50 && input.topCategoryName) {
    alerts.push({
      id: "category-heavy",
      severity: "warning",
      message: `יותר מ־50% מההוצאות בקטגוריה "${input.topCategoryName}".`,
    });
  }

  return alerts.slice(0, 3);
}
