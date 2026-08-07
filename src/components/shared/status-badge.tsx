import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  active: "פעיל",
  invited: "ממתין",
  removed: "הוסר",
};

export function StatusBadge({
  status,
  className,
}: {
  status: "active" | "invited" | "removed" | string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium",
        status === "active" && "border-success/30 bg-success/10 text-success",
        status === "invited" && "border-warning/30 bg-warning/10 text-warning",
        status === "removed" && "border-border bg-secondary text-muted-foreground",
        className,
      )}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
