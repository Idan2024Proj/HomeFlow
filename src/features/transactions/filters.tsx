import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/transactions";

type Props = {
  categories: Category[];
  values: {
    q?: string;
    type?: string;
    categoryId?: string;
    from?: string;
    to?: string;
  };
};

export function TransactionFilters({ categories, values }: Props) {
  return (
    <form className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 md:flex-row md:flex-wrap md:items-end">
      <div className="min-w-[160px] flex-1 space-y-1">
        <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
          חיפוש
        </label>
        <Input
          id="q"
          name="q"
          defaultValue={values.q ?? ""}
          placeholder="בית עסק"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="type" className="text-xs font-medium text-muted-foreground">
          סוג
        </label>
        <select
          id="type"
          name="type"
          defaultValue={values.type ?? "all"}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm md:w-36"
        >
          <option value="all">הכל</option>
          <option value="expense">הוצאות</option>
          <option value="income">הכנסות</option>
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="categoryId" className="text-xs font-medium text-muted-foreground">
          קטגוריה
        </label>
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={values.categoryId ?? ""}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm md:w-40"
        >
          <option value="">הכל</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="from" className="text-xs font-medium text-muted-foreground">
          מתאריך
        </label>
        <Input
          id="from"
          name="from"
          type="date"
          defaultValue={values.from ?? ""}
          dir="ltr"
          className="text-left md:w-40"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="to" className="text-xs font-medium text-muted-foreground">
          עד תאריך
        </label>
        <Input
          id="to"
          name="to"
          type="date"
          defaultValue={values.to ?? ""}
          dir="ltr"
          className="text-left md:w-40"
        />
      </div>
      <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
        סינון
      </button>
      <Link href="/transactions" className={cn(buttonVariants({ variant: "ghost" }))}>
        נקה
      </Link>
    </form>
  );
}
