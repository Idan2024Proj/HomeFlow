"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "בהיר", icon: Sun },
  { value: "dark", label: "חשוך", icon: Moon },
  { value: "system", label: "מערכת", icon: Monitor },
] as const;

type ThemeToggleProps = {
  variant?: "full" | "compact";
  className?: string;
};

function subscribe() {
  return () => undefined;
}

export function ThemeToggle({ variant = "full", className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <div
        className={cn(
          variant === "full"
            ? "h-10 w-full rounded-xl bg-secondary/60"
            : "size-8 rounded-lg bg-secondary/60",
          className,
        )}
        aria-hidden
      />
    );
  }

  if (variant === "compact") {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    const CurrentIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-foreground hover:bg-secondary",
          className,
        )}
        aria-label={`מצב תצוגה נוכחי: ${theme}. לחצו להחלפה`}
        title="החלפת מצב תצוגה"
      >
        <CurrentIcon className="size-4" aria-hidden />
      </button>
    );
  }

  return (
    <div role="radiogroup" aria-label="מצב תצוגה" className={cn("grid grid-cols-3 gap-2", className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
