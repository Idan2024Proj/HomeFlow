"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/utils/money";
import { cn } from "@/lib/utils";

type DayPoint = {
  date: string;
  expense: number;
  income: number;
  balance: number;
};

type Props = {
  current: DayPoint[];
  previous: DayPoint[];
};

type Mode = "expense" | "income" | "balance" | "compare";

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "expense", label: "הוצאות" },
  { id: "income", label: "הכנסות" },
  { id: "balance", label: "יתרה" },
  { id: "compare", label: "השוואה" },
];

function dayLabel(iso: string) {
  return iso.slice(8, 10);
}

export function DashboardChart({ current, previous }: Props) {
  const [mode, setMode] = useState<Mode>("expense");

  const data = useMemo(() => {
    return current.map((point, index) => {
      const prev = previous[index];
      return {
        label: dayLabel(point.date),
        expense: point.expense,
        income: point.income,
        balance: point.balance,
        previousExpense: prev?.expense ?? 0,
      };
    });
  }, [current, previous]);

  const hasData = data.some(
    (d) => d.expense > 0 || d.income > 0 || d.previousExpense > 0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="סוג גרף">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={mode === item.id}
            onClick={() => setMode(item.id)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              mode === item.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:bg-secondary",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="h-56 w-full" aria-label="גרף חודשי">
        {!hasData ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            אין מספיק נתונים לגרף החודש
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${Math.round(Number(v))}`}
              />
              <Tooltip
                formatter={(value) => formatMoney(Number(value ?? 0))}
                labelFormatter={(label) => `יום ${label}`}
                contentStyle={{
                  borderRadius: 12,
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                }}
              />
              {mode === "expense" || mode === "compare" ? (
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="הוצאות"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ) : null}
              {mode === "income" ? (
                <Area
                  type="monotone"
                  dataKey="income"
                  name="הכנסות"
                  stroke="var(--success)"
                  fill="var(--success)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ) : null}
              {mode === "balance" ? (
                <Area
                  type="monotone"
                  dataKey="balance"
                  name="יתרה מצטברת"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
              ) : null}
              {mode === "compare" ? (
                <Area
                  type="monotone"
                  dataKey="previousExpense"
                  name="חודש קודם"
                  stroke="var(--muted-foreground)"
                  fill="transparent"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                />
              ) : null}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="sr-only">
        גרף המציג מגמת {MODES.find((m) => m.id === mode)?.label} לאורך ימי החודש.
      </p>
    </div>
  );
}
