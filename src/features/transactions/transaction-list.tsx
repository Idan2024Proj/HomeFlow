import Link from "next/link";
import { formatMoney } from "@/lib/utils/money";
import { cn } from "@/lib/utils";
import type { TransactionRow } from "@/types/transactions";

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function TransactionCard({ transaction }: { transaction: TransactionRow }) {
  const isExpense = transaction.type === "expense";

  return (
    <Link
      href={`/transactions/${transaction.id}`}
      className="block rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:bg-secondary/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{transaction.merchant_name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {transaction.category?.name ?? "ללא קטגוריה"} · {formatDate(transaction.occurred_on)}
            {transaction.is_shared ? " · משותף" : " · אישי"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {transaction.payer?.full_name ?? "—"}
          </p>
        </div>
        <p
          className={cn(
            "shrink-0 text-sm font-semibold tabular-nums",
            isExpense ? "text-foreground" : "text-success",
          )}
        >
          {isExpense ? "−" : "+"}
          {formatMoney(transaction.amount)}
        </p>
      </div>
    </Link>
  );
}

export function TransactionsTable({ transactions }: { transactions: TransactionRow[] }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border md:block">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-muted-foreground">
          <tr className="text-right">
            <th className="px-4 py-3 font-medium">בית עסק</th>
            <th className="px-4 py-3 font-medium">קטגוריה</th>
            <th className="px-4 py-3 font-medium">תאריך</th>
            <th className="px-4 py-3 font-medium">מי שילם</th>
            <th className="px-4 py-3 font-medium">סוג</th>
            <th className="px-4 py-3 font-medium">סכום</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-t border-border hover:bg-secondary/40">
              <td className="px-4 py-3">
                <Link href={`/transactions/${tx.id}`} className="font-medium hover:underline">
                  {tx.merchant_name}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{tx.category?.name ?? "—"}</td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground" dir="ltr">
                {formatDate(tx.occurred_on)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{tx.payer?.full_name ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {tx.is_shared ? "משותף" : "אישי"}
              </td>
              <td
                className={cn(
                  "px-4 py-3 text-left font-semibold tabular-nums",
                  tx.type === "income" && "text-success",
                )}
                dir="ltr"
              >
                {tx.type === "expense" ? "−" : "+"}
                {formatMoney(tx.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
