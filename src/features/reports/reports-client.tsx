"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { buildExcelReport, buildPdfReport } from "@/lib/export";
import { formatMoney } from "@/lib/utils/money";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Tx = {
  occurred_on: string;
  merchant_name: string;
  type: string;
  amount: number;
  category?: string;
};

export function ReportsClient({
  periodLabel,
  income,
  expense,
  balance,
  transactions,
  categories,
  anomalies,
  recurring,
}: {
  periodLabel: string;
  income: number;
  expense: number;
  balance: number;
  transactions: Tx[];
  categories: Array<{ name: string; amount: number }>;
  anomalies: Array<{ message: string; severity: string }>;
  recurring: Array<{ merchantName: string; averageAmount: number; occurrences: number }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const payload = useMemo(
    () => ({
      title: "HomeFlow",
      periodLabel,
      income,
      expense,
      balance,
      transactions,
      categories,
    }),
    [periodLabel, income, expense, balance, transactions, categories],
  );

  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>הכנסות</CardDescription>
            <CardTitle className="text-success">{formatMoney(income)}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>הוצאות</CardDescription>
            <CardTitle>{formatMoney(expense)}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>יתרה</CardDescription>
            <CardTitle>{formatMoney(balance)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                setError(null);
                const blob = await buildExcelReport(payload);
                download(blob, `homeflow-${periodLabel}.xlsx`);
              } catch {
                setError("ייצוא Excel נכשל");
              }
            })
          }
        >
          ייצוא Excel
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              try {
                setError(null);
                const blob = buildPdfReport(payload);
                download(blob, `homeflow-${periodLabel}.pdf`);
              } catch {
                setError("ייצוא PDF נכשל");
              }
            })
          }
        >
          ייצוא PDF
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>קטגוריות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {categories.length === 0 ? (
            <p className="text-muted-foreground">אין נתונים</p>
          ) : (
            categories.map((c) => (
              <div key={c.name} className="flex justify-between">
                <span>{c.name}</span>
                <span className="tabular-nums">{formatMoney(c.amount)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>תשלומים חוזרים שזוהו</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recurring.length === 0 ? (
            <p className="text-muted-foreground">לא זוהו מנויים עדיין</p>
          ) : (
            recurring.map((r) => (
              <div key={r.merchantName} className="flex justify-between">
                <span>
                  {r.merchantName} · {r.occurrences} פעמים
                </span>
                <span className="tabular-nums">{formatMoney(r.averageAmount)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>חריגות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {anomalies.length === 0 ? (
            <p className="text-muted-foreground">אין חריגות</p>
          ) : (
            anomalies.map((a, idx) => (
              <p key={idx} className={a.severity === "critical" ? "text-destructive" : ""}>
                {a.message}
              </p>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
