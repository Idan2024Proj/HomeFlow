import { formatMoney } from "@/lib/utils/money";

type Item = {
  name: string;
  amount: number;
  percent: number;
};

export function CategoryBreakdown({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">אין הוצאות לקטגוריות החודש.</p>
    );
  }

  const top = items.slice(0, 6);

  return (
    <ul className="space-y-3">
      {top.map((item) => (
        <li key={item.name} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-foreground">{item.name}</span>
            <span className="tabular-nums text-muted-foreground">
              {formatMoney(item.amount)} · {item.percent}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary/80 transition-all duration-200"
              style={{ width: `${Math.min(100, item.percent)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
