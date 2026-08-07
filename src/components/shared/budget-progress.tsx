import { formatMoney } from "@/lib/utils/money";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  spent: number;
  budget: number;
  percent: number;
  status: "ok" | "warning" | "over";
};

export function BudgetProgress({ name, spent, budget, percent, status }: Props) {
  const width = Math.min(100, Math.max(0, percent));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{name}</span>
        <span className="tabular-nums text-muted-foreground">
          {formatMoney(spent)} / {formatMoney(budget)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-200",
            status === "ok" && "bg-primary",
            status === "warning" && "bg-warning",
            status === "over" && "bg-destructive",
          )}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {status === "over"
          ? `חריגה של ${formatMoney(Math.abs(budget - spent))}`
          : `נותר ${formatMoney(Math.max(0, budget - spent))} · ${percent}%`}
      </p>
    </div>
  );
}
