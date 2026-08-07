import { formatMoney } from "@/lib/utils/money";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
};

export function MetricCard({ label, value, hint, tone = "default" }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums tracking-tight",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-destructive",
        )}
      >
        {formatMoney(value)}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
