import { cn } from "@/lib/utils";
import type { DashboardAlert } from "@/lib/finance";

export function AlertCard({ alert }: { alert: DashboardAlert }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        alert.severity === "info" && "border-border bg-secondary/50 text-foreground",
        alert.severity === "warning" && "border-warning/30 bg-warning/10 text-warning",
        alert.severity === "critical" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
      )}
      role="status"
    >
      {alert.message}
    </div>
  );
}
