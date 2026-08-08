import type { Metadata } from "next";
import { PriceSearch } from "@/features/prices/price-search";

export const metadata: Metadata = { title: "חיפוש מחירים | HomeFlow" };
export const dynamic = "force-dynamic";

export default function PricesPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">חיפוש מחירים</h1>
        <p className="text-sm text-muted-foreground">
          נתונים מהזנות שקיפות המחירים הרשמיות (שופרסל)
        </p>
      </div>
      <PriceSearch initialQuery="חלב" />
    </div>
  );
}
