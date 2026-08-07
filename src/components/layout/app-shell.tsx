import Link from "next/link";
import {
  Home,
  Plus,
  Receipt,
  Settings,
  Wallet,
  ShoppingCart,
  Scale,
  PiggyBank,
  FileBarChart,
  Upload,
} from "lucide-react";
import { APP_NAME, NAV_DESKTOP } from "@/constants/app";
import { signOutAction } from "@/features/auth/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";
import type { MembershipContext } from "@/types/database";

const ENABLED_HREFS = new Set([
  "/",
  "/transactions",
  "/budgets",
  "/shopping",
  "/settlements",
  "/savings",
  "/reports",
  "/import",
  "/settings",
]);

const ICONS: Record<string, typeof Home> = {
  "/": Home,
  "/transactions": Receipt,
  "/budgets": Wallet,
  "/shopping": ShoppingCart,
  "/settlements": Scale,
  "/savings": PiggyBank,
  "/reports": FileBarChart,
  "/import": Upload,
  "/settings": Settings,
};

type AppShellProps = {
  context: MembershipContext;
  children: React.ReactNode;
};

export function AppShell({ context, children }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-1 bg-background">
      <aside className="hidden w-56 shrink-0 border-e border-border bg-surface md:flex md:flex-col">
        <div className="border-b border-border px-4 py-4">
          <p className="text-sm font-semibold text-primary">{APP_NAME}</p>
          <p className="truncate text-xs text-muted-foreground">{context.household.name}</p>
        </div>
        <div className="p-3">
          <Link href="/transactions/new" className={cn(buttonVariants(), "w-full")}>
            <Plus className="size-4" aria-hidden />
            הוספת תנועה
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3" aria-label="ניווט ראשי">
          {NAV_DESKTOP.map((item) => {
            const enabled = ENABLED_HREFS.has(item.href);
            const Icon = ICONS[item.href] ?? Home;
            if (!enabled) {
              return (
                <span
                  key={item.href}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground/50"
                >
                  {item.label}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary"
              >
                <Icon className="size-4 opacity-70" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <p className="mb-2 truncate px-2 text-xs text-muted-foreground">
            {context.membership.display_name || context.profile.full_name}
          </p>
          <div className="mb-2 px-1">
            <ThemeToggle />
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" className="w-full justify-start">
              התנתקות
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
          <div>
            <p className="text-sm font-semibold text-primary">{APP_NAME}</p>
            <p className="text-xs text-muted-foreground">{context.household.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle variant="compact" />
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                יציאה
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
        <nav
          className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface md:hidden"
          aria-label="ניווט תחתון"
        >
          <Link href="/" className="flex flex-1 flex-col items-center gap-1 py-3 text-xs">
            <Home className="size-5" aria-hidden />
            בית
          </Link>
          <Link
            href="/transactions"
            className="flex flex-1 flex-col items-center gap-1 py-3 text-xs"
          >
            <Receipt className="size-5" aria-hidden />
            תנועות
          </Link>
          <Link
            href="/transactions/new"
            className="-mt-4 flex flex-1 flex-col items-center gap-1 text-xs"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <Plus className="size-6" aria-hidden />
            </span>
            הוספה
          </Link>
          <Link
            href="/shopping"
            className="flex flex-1 flex-col items-center gap-1 py-3 text-xs"
          >
            <ShoppingCart className="size-5" aria-hidden />
            קניות
          </Link>
          <Link href="/more" className="flex flex-1 flex-col items-center gap-1 py-3 text-xs">
            <Settings className="size-5" aria-hidden />
            עוד
          </Link>
        </nav>
      </div>
    </div>
  );
}
